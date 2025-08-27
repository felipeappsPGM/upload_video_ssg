import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from './entities/video.entity';
import { UserVideo, AccessType } from './entities/user-video.entity';
import { CreateVideoDto, UpdateVideoDto, AssignVideoDto, VideoSearchDto } from './dto/videos.dto';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(UserVideo)
    private readonly userVideoRepository: Repository<UserVideo>,
  ) {}

  // Criar novo vídeo (admin)
  async create(createVideoDto: CreateVideoDto): Promise<Video> {
    const video = this.videoRepository.create(createVideoDto);
    const savedVideo = await this.videoRepository.save(video);
    
    this.logger.log(`Vídeo criado: ${savedVideo.title} (ID: ${savedVideo.id})`);
    return savedVideo;
  }

  // Listar todos os vídeos (admin)
  async findAll(): Promise<Video[]> {
    return await this.videoRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // Obter vídeos exclusivos do usuário
  async findUserVideos(userId: string, search?: VideoSearchDto): Promise<{
    videos: any[];
    total: number;
  }> {
    let queryBuilder = this.userVideoRepository
      .createQueryBuilder('userVideo')
      .leftJoinAndSelect('userVideo.video', 'video')
      .where('userVideo.userId = :userId', { userId })
      .andWhere('userVideo.isActive = :isActive', { isActive: true })
      .andWhere('video.status = :status', { status: VideoStatus.PUBLISHED })
      .andWhere('video.isActive = :videoIsActive', { videoIsActive: true });

    // Filtrar por acessos não expirados
    queryBuilder = queryBuilder.andWhere(
      '(userVideo.expiresAt IS NULL OR userVideo.expiresAt > :now)',
      { now: new Date() }
    );

    // Aplicar filtros de busca
    if (search?.query) {
      queryBuilder = queryBuilder.andWhere(
        '(video.title LIKE :query OR video.description LIKE :query OR video.category LIKE :query OR video.tags LIKE :query)',
        { query: `%${search.query}%` }
      );
    }

    if (search?.category) {
      queryBuilder = queryBuilder.andWhere('video.category = :category', {
        category: search.category,
      });
    }

    // Ordenação
    const orderBy = search?.orderBy || 'createdAt';
    const orderDirection = search?.orderDirection || 'DESC';
    queryBuilder = queryBuilder.orderBy(`video.${orderBy}`, orderDirection);

    // Paginação
    if (search?.limit) {
      queryBuilder = queryBuilder.take(search.limit);
    }
    if (search?.offset) {
      queryBuilder = queryBuilder.skip(search.offset);
    }

    const [userVideos, total] = await queryBuilder.getManyAndCount();

    const videos = userVideos.map(uv => ({
      ...uv.video,
      userVideoInfo: {
        id: uv.id,
        accessType: uv.accessType,
        expiresAt: uv.expiresAt,
        isActive: uv.isActive,
        firstViewedAt: uv.firstViewedAt,
        lastViewedAt: uv.lastViewedAt,
        viewCount: uv.viewCount,
        watchPosition: uv.watchPosition,
        completionPercentage: uv.completionPercentage,
        isCompleted: uv.isCompleted,
        grantedBy: uv.grantedBy,
        notes: uv.notes,
        userId: uv.userId,
        videoId: uv.videoId,
        createdAt: uv.createdAt,
        updatedAt: uv.updatedAt,
      },
    }));

    return { videos, total };
  }

  // Obter vídeo específico do usuário
  async findUserVideo(userId: string, videoId: number): Promise<any> {
    const userVideo = await this.userVideoRepository.findOne({
      where: {
        userId,
        videoId,
        isActive: true,
      },
      relations: ['video'],
    });

    if (!userVideo) {
      throw new NotFoundException('Vídeo não encontrado ou sem acesso');
    }

    if (!userVideo.hasAccess()) {
      throw new ForbiddenException('Acesso ao vídeo expirado');
    }

    if (!userVideo.video || !userVideo.video.isPublished()) {
      throw new ForbiddenException('Vídeo não está disponível');
    }

    return {
      ...userVideo.video,
      userVideoInfo: {
        id: userVideo.id,
        accessType: userVideo.accessType,
        expiresAt: userVideo.expiresAt,
        isActive: userVideo.isActive,
        firstViewedAt: userVideo.firstViewedAt,
        lastViewedAt: userVideo.lastViewedAt,
        viewCount: userVideo.viewCount,
        watchPosition: userVideo.watchPosition,
        completionPercentage: userVideo.completionPercentage,
        isCompleted: userVideo.isCompleted,
        grantedBy: userVideo.grantedBy,
        notes: userVideo.notes,
        userId: userVideo.userId,
        videoId: userVideo.videoId,
        createdAt: userVideo.createdAt,
        updatedAt: userVideo.updatedAt,
      },
    };
  }

  // Marcar vídeo como visualizado
  async markAsWatched(userId: string, videoId: number, watchPosition?: number): Promise<void> {
    const userVideo = await this.userVideoRepository.findOne({
      where: { userId, videoId, isActive: true },
      relations: ['video'],
    });

    if (!userVideo) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    if (!userVideo.hasAccess()) {
      throw new ForbiddenException('Acesso ao vídeo expirado');
    }

    // Atualizar visualização
    userVideo.markAsViewed();

    // Atualizar progresso se fornecido
    if (watchPosition && userVideo.video && userVideo.video.durationSeconds) {
      userVideo.updateWatchProgress(watchPosition, userVideo.video.durationSeconds);
    }

    await this.userVideoRepository.save(userVideo);

    // Incrementar contador no vídeo
    await this.videoRepository.increment({ id: videoId }, 'viewCount', 1);

    this.logger.log(`Visualização registrada: usuário ${userId}, vídeo ${videoId}`);
  }

  // Atribuir vídeo a usuário (admin)
  async assignVideoToUser(assignVideoDto: AssignVideoDto): Promise<UserVideo> {
    const { userId, videoId, accessType, expiresAt, notes } = assignVideoDto;

    // Verificar se o vídeo existe
    const video = await this.videoRepository.findOne({ where: { id: videoId } });
    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Verificar se já existe uma atribuição
    let userVideo = await this.userVideoRepository.findOne({
      where: { userId, videoId },
    });

    if (userVideo) {
      // Atualizar existente
      userVideo.accessType = accessType || userVideo.accessType;
      userVideo.expiresAt = expiresAt || userVideo.expiresAt;
      userVideo.isActive = true;
      userVideo.notes = notes || userVideo.notes;
    } else {
      // Criar novo
      userVideo = this.userVideoRepository.create({
        userId,
        videoId,
        accessType: accessType || AccessType.ASSIGNED,
        expiresAt,
        notes,
      });
    }

    const savedUserVideo = await this.userVideoRepository.save(userVideo);
    
    this.logger.log(`Vídeo ${videoId} atribuído ao usuário ${userId}`);
    return savedUserVideo;
  }

  // Remover acesso do usuário (admin)
  async removeUserAccess(userId: string, videoId: number): Promise<void> {
    const result = await this.userVideoRepository.update(
      { userId, videoId },
      { isActive: false }
    );

    if (result.affected === 0) {
      throw new NotFoundException('Atribuição não encontrada');
    }

    this.logger.log(`Acesso removido: usuário ${userId}, vídeo ${videoId}`);
  }

  // Atualizar vídeo (admin)
  async update(id: number, updateVideoDto: UpdateVideoDto): Promise<Video> {
    const video = await this.videoRepository.findOne({ where: { id } });
    
    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    Object.assign(video, updateVideoDto);
    const updatedVideo = await this.videoRepository.save(video);
    
    this.logger.log(`Vídeo atualizado: ${updatedVideo.title} (ID: ${updatedVideo.id})`);
    return updatedVideo;
  }

  // Remover vídeo (admin)
  async remove(id: number): Promise<void> {
    const video = await this.videoRepository.findOne({ where: { id } });
    
    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Soft delete
    video.isActive = false;
    video.status = VideoStatus.ARCHIVED;
    await this.videoRepository.save(video);
    
    this.logger.log(`Vídeo removido: ${video.title} (ID: ${video.id})`);
  }

  // Buscar vídeos (admin)
  async search(query: string, limit: number = 10, offset: number = 0): Promise<[Video[], number]> {
    const queryBuilder = this.videoRepository.createQueryBuilder('video');
    
    queryBuilder
      .where('video.isActive = :isActive', { isActive: true })
      .andWhere(
        '(video.title LIKE :query OR video.description LIKE :query OR video.category LIKE :query)',
        { query: `%${query}%` }
      )
      .orderBy('video.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    return await queryBuilder.getManyAndCount();
  }

  // Estatísticas
  async getVideoStats(videoId?: number): Promise<{
    totalViews: number;
    uniqueViewers: number;
    completionRate: number;
    averageWatchTime: number;
  }> {
    let queryBuilder = this.userVideoRepository.createQueryBuilder('userVideo');
    
    if (videoId) {
      queryBuilder = queryBuilder.where('userVideo.videoId = :videoId', { videoId });
    }

    const userVideos = await queryBuilder.getMany();

    const totalViews = userVideos.reduce((sum, uv) => sum + uv.viewCount, 0);
    const uniqueViewers = userVideos.filter(uv => uv.viewCount > 0).length;
    const completed = userVideos.filter(uv => uv.isCompleted).length;
    const completionRate = uniqueViewers > 0 ? (completed / uniqueViewers) * 100 : 0;
    const averageWatchTime = userVideos.length > 0 
      ? userVideos.reduce((sum, uv) => sum + uv.watchPosition, 0) / userVideos.length
      : 0;

    return {
      totalViews,
      uniqueViewers,
      completionRate: Math.round(completionRate * 100) / 100,
      averageWatchTime: Math.round(averageWatchTime),
    };
  }

  // Obter categorias disponíveis
  async getCategories(): Promise<string[]> {
    const result = await this.videoRepository
      .createQueryBuilder('video')
      .select('DISTINCT video.category', 'category')
      .where('video.isActive = :isActive', { isActive: true })
      .andWhere('video.status = :status', { status: VideoStatus.PUBLISHED })
      .andWhere('video.category IS NOT NULL')
      .getRawMany();

    return result.map(r => r.category).filter(Boolean);
  }
}