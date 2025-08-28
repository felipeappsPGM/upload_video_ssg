import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

import { VideosService } from './videos.service';
import { JwtAuthGuard, Public } from '../auth/guards/jwt-auth.guard';
import {
  CreateVideoDto,
  UpdateVideoDto,
  AssignVideoDto,
  VideoSearchDto,
  WatchProgressDto,
  VideoResponseDto,
  VideoStatsDto,
} from './dto/videos.dto';
import { User } from '../users/entities/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('videos')
@UseGuards(ThrottlerGuard)
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(private readonly videosService: VideosService) {}

  // ========== ROTAS PÚBLICAS (ADMIN) ==========
  
  @Post()
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  async create(@Body() createVideoDto: CreateVideoDto) {
    return await this.videosService.create(createVideoDto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  async findAll() {
    return await this.videosService.findAll();
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    return await this.videosService.update(id, updateVideoDto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.videosService.remove(id);
  }

  @Post('admin/assign')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  async assignVideo(@Body() assignVideoDto: AssignVideoDto) {
    return await this.videosService.assignVideoToUser(assignVideoDto);
  }

  @Delete('admin/access/:userId/:videoId')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAccess(
    @Param('userId') userId: string,
    @Param('videoId', ParseIntPipe) videoId: number,
  ) {
    return await this.videosService.removeUserAccess(userId, videoId);
  }

  @Get('admin/search')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  async searchAll(
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ) {
    const [videos, total] = await this.videosService.search(query, limit, offset);
    return { videos, total, query, limit, offset };
  }

  // CORRIGIDO: Duas rotas separadas em vez de parâmetro opcional
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  async getAllStats(): Promise<VideoStatsDto> {
    return await this.videosService.getVideoStats();
  }

  @Get('admin/stats/:id')
  @UseGuards(JwtAuthGuard)
  // TODO: Adicionar RoleGuard para admin apenas
  async getVideoStats(@Param('id', ParseIntPipe) videoId: number): Promise<VideoStatsDto> {
    return await this.videosService.getVideoStats(videoId);
  }

  // ========== ROTAS DO USUÁRIO ==========

  @Get()
  @UseGuards(JwtAuthGuard)
  async findUserVideos(
    @Req() req: AuthenticatedRequest,
    @Query() searchDto: VideoSearchDto,
  ): Promise<{
    videos: VideoResponseDto[];
    total: number;
    query?: string;
    limit?: number;
    offset?: number;
  }> {
    this.logger.log(`Listando vídeos para usuário ${req.user.id}`);
    
    const result = await this.videosService.findUserVideos(req.user.id, searchDto);
    
    return {
      videos: result.videos.map(video => this.formatVideoResponse(video)),
      total: result.total,
      query: searchDto.query,
      limit: searchDto.limit,
      offset: searchDto.offset,
    };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUserVideos(
    @Req() req: AuthenticatedRequest,
    @Query() searchDto: VideoSearchDto,
  ) {
    this.logger.log(`Busca de vídeos para usuário ${req.user.id}: ${searchDto.query}`);
    
    const result = await this.videosService.findUserVideos(req.user.id, searchDto);
    
    return {
      videos: result.videos.map(video => this.formatVideoResponse(video)),
      total: result.total,
      query: searchDto.query,
      limit: searchDto.limit,
      offset: searchDto.offset,
    };
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories() {
    return {
      categories: await this.videosService.getCategories(),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ video: VideoResponseDto }> {
    this.logger.log(`Acessando vídeo ${id} pelo usuário ${req.user.id}`);
    
    const video = await this.videosService.findUserVideo(req.user.id, id);
    
    return {
      video: this.formatVideoResponse(video),
    };
  }

  @Post(':id/watch')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAsWatched(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() watchProgressDto?: WatchProgressDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Marcando vídeo ${id} como assistido pelo usuário ${req.user.id}`);
    
    await this.videosService.markAsWatched(
      req.user.id,
      id,
      watchProgressDto?.position,
    );

    return {
      message: 'Visualização registrada com sucesso',
    };
  }

  @Post(':id/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProgress(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() watchProgressDto: WatchProgressDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Atualizando progresso do vídeo ${id} para usuário ${req.user.id}`);
    
    await this.videosService.markAsWatched(
      req.user.id,
      id,
      watchProgressDto.position,
    );

    return {
      message: 'Progresso atualizado com sucesso',
    };
  }

  // ========== MÉTODOS AUXILIARES ==========

  private formatVideoResponse(video: any): VideoResponseDto {
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      durationSeconds: video.durationSeconds,
      category: video.category,
      tagsArray: video.tagsArray || [],
      viewCount: video.viewCount,
      userVideoInfo: video.userVideoInfo ? {
        viewCount: video.userVideoInfo.viewCount,
        lastViewedAt: video.userVideoInfo.lastViewedAt,
        completionPercentage: video.userVideoInfo.completionPercentage,
        isCompleted: video.userVideoInfo.isCompleted,
        watchPosition: video.userVideoInfo.watchPosition,
      } : undefined,
    };
  }
}