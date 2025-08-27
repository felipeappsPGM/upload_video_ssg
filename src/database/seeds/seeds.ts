import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Video, VideoStatus } from '../../videos/entities/video.entity';
import { UserVideo, AccessType } from '../../videos/entities/user-video.entity';
import { AppDataSource } from '../data-source';

class DatabaseSeeder {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
  }

  async run(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }

    console.log('🌱 Iniciando seed do banco de dados...');

    try {
      await this.seedUsers();
      await this.seedVideos();
      await this.seedUserVideos();
      
      console.log('✅ Seed concluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro durante o seed:', error);
      throw error;
    }
  }

  private async seedUsers(): Promise<void> {
    console.log('👥 Criando usuários...');
    
    const userRepository = this.dataSource.getRepository(User);

    // Verificar se já existem usuários
    const existingUsersCount = await userRepository.count();
    if (existingUsersCount > 0) {
      console.log('⏭️  Usuários já existem, pulando...');
      return;
    }

    const users = [
      {
        email: 'rodrigo.paiva@gmail.com',
        firstName: 'Rodrigo',
        lastName: 'Paiva',
        isActive: true,
      },
      {
        email: 'admin@sysmap.com',
        firstName: 'Admin',
        lastName: 'SysMap',
        isActive: true,
      },
      {
        email: 'maria.silva@empresa.com',
        firstName: 'Maria',
        lastName: 'Silva',
        isActive: true,
      },
      {
        email: 'joao.santos@empresa.com',
        firstName: 'João',
        lastName: 'Santos',
        isActive: true,
      },
      {
        email: 'ana.costa@empresa.com',
        firstName: 'Ana',
        lastName: 'Costa',
        isActive: true,
      },
    ];

    for (const userData of users) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`   ✓ Usuário criado: ${userData.email}`);
    }

    console.log(`   📊 Total: ${users.length} usuários criados`);
  }

  private async seedVideos(): Promise<void> {
    console.log('🎥 Criando vídeos...');
    
    const videoRepository = this.dataSource.getRepository(Video);

    // Verificar se já existem vídeos
    const existingVideosCount = await videoRepository.count();
    if (existingVideosCount > 0) {
      console.log('⏭️  Vídeos já existem, pulando...');
      return;
    }

    const videos = [
      {
        title: 'Introdução ao Sistema',
        description: 'Aprenda os conceitos básicos do SysMap View e como navegar pela plataforma. Este vídeo é essencial para novos usuários.',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/320x180/1e88e5/ffffff?text=Introdução+ao+Sistema',
        duration: '05:30',
        durationSeconds: 330,
        status: VideoStatus.PUBLISHED,
        category: 'Treinamento',
        tags: 'introdução,básico,tutorial,sistema',
        viewCount: 0,
        fileSize: 1048576,
        resolution: '720p',
      },
      {
        title: 'Boas Práticas para Reuniões',
        description: 'Como conduzir reuniões eficazes e produtivas. Técnicas de facilitação e gestão de tempo.',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/320x180/42a5f5/ffffff?text=Boas+Práticas+Reuniões',
        duration: '08:45',
        durationSeconds: 525,
        status: VideoStatus.PUBLISHED,
        category: 'Gestão',
        tags: 'reuniões,produtividade,gestão,comunicação',
        viewCount: 0,
        fileSize: 2097152,
        resolution: '720p',
      },
      {
        title: 'Gestão de Projetos Ágeis',
        description: 'Metodologias ágeis aplicadas na gestão de projetos. Scrum, Kanban e outras frameworks.',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/320x180/1565c0/ffffff?text=Gestão+Ágil',
        duration: '12:20',
        durationSeconds: 740,
        status: VideoStatus.PUBLISHED,
        category: 'Metodologia',
        tags: 'agile,scrum,kanban,projetos,metodologia',
        viewCount: 0,
        fileSize: 5242880,
        resolution: '720p',
      },
      {
        title: 'Segurança da Informação',
        description: 'Princípios fundamentais de segurança da informação e boas práticas para proteger dados corporativos.',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/320x180/2e7d32/ffffff?text=Segurança+Informação',
        duration: '15:10',
        durationSeconds: 910,
        status: VideoStatus.PUBLISHED,
        category: 'Segurança',
        tags: 'segurança,informação,dados,proteção,cyber',
        viewCount: 0,
        fileSize: 1048576,
        resolution: '1080p',
      },
      {
        title: 'Liderança e Motivação',
        description: 'Como desenvolver habilidades de liderança e motivar equipes para alcançar melhores resultados.',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/320x180/f57c00/ffffff?text=Liderança+Motivação',
        duration: '11:35',
        durationSeconds: 695,
        status: VideoStatus.PUBLISHED,
        category: 'Liderança',
        tags: 'liderança,motivação,equipe,gestão,pessoas',
        viewCount: 0,
        fileSize: 2097152,
        resolution: '1080p',
      },
      {
        title: 'Excel Avançado para Análise',
        description: 'Técnicas avançadas do Excel para análise de dados e criação de relatórios dinâmicos.',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/320x180/388e3c/ffffff?text=Excel+Avançado',
        duration: '18:25',
        durationSeconds: 1105,
        status: VideoStatus.PUBLISHED,
        category: 'Ferramentas',
        tags: 'excel,análise,dados,relatórios,produtividade',
        viewCount: 0,
        fileSize: 5242880,
        resolution: '1080p',
      },
      {
        title: 'Comunicação Corporativa',
        description: 'Como se comunicar de forma eficaz no ambiente corporativo, incluindo apresentações e e-mails.',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/320x180/7b1fa2/ffffff?text=Comunicação+Corp',
        duration: '09:15',
        durationSeconds: 555,
        status: VideoStatus.PUBLISHED,
        category: 'Comunicação',
        tags: 'comunicação,apresentação,corporativo,soft skills',
        viewCount: 0,
        fileSize: 1048576,
        resolution: '720p',
      },
    ];

    for (const videoData of videos) {
      const video = videoRepository.create(videoData);
      await videoRepository.save(video);
      console.log(`   ✓ Vídeo criado: ${videoData.title}`);
    }

    console.log(`   📊 Total: ${videos.length} vídeos criados`);
  }

  private async seedUserVideos(): Promise<void> {
    console.log('🔗 Criando associações usuário-vídeo...');
    
    const userRepository = this.dataSource.getRepository(User);
    const videoRepository = this.dataSource.getRepository(Video);
    const userVideoRepository = this.dataSource.getRepository(UserVideo);

    // Verificar se já existem associações
    const existingAssociationsCount = await userVideoRepository.count();
    if (existingAssociationsCount > 0) {
      console.log('⏭️  Associações já existem, pulando...');
      return;
    }

    const users = await userRepository.find();
    const videos = await videoRepository.find();

    if (users.length === 0 || videos.length === 0) {
      console.log('⚠️  Não há usuários ou vídeos para criar associações');
      return;
    }

    // Rodrigo e Admin têm acesso a todos os vídeos
    const specialUsers = users.filter(u => 
      u.email === 'rodrigo.paiva@gmail.com' || u.email === 'admin@sysmap.com'
    );

    for (const user of specialUsers) {
      for (const video of videos) {
        const userVideo = userVideoRepository.create({
          userId: user.id,
          videoId: video.id,
          accessType: AccessType.ASSIGNED,
          isActive: true,
          grantedBy: 'System Seed',
          notes: 'Acesso total - usuário especial',
        });
        await userVideoRepository.save(userVideo);
      }
      console.log(`   ✓ Acesso total concedido para: ${user.email}`);
    }

    // Outros usuários têm acesso limitado
    const regularUsers = users.filter(u => 
      u.email !== 'rodrigo.paiva@gmail.com' && u.email !== 'admin@sysmap.com'
    );

    for (const user of regularUsers) {
      // Cada usuário regular tem acesso a 3-5 vídeos aleatórios
      const shuffledVideos = videos.sort(() => 0.5 - Math.random());
      const userVideos = shuffledVideos.slice(0, Math.floor(Math.random() * 3) + 3);

      for (const video of userVideos) {
        const userVideo = userVideoRepository.create({
          userId: user.id,
          videoId: video.id,
          accessType: AccessType.ASSIGNED,
          isActive: true,
          grantedBy: 'System Seed',
          notes: 'Acesso limitado - usuário regular',
        });
        await userVideoRepository.save(userVideo);
      }
      console.log(`   ✓ Acesso a ${userVideos.length} vídeos para: ${user.email}`);
    }

    const totalAssociations = await userVideoRepository.count();
    console.log(`   📊 Total: ${totalAssociations} associações criadas`);
  }
}

// Script para executar o seed
async function runSeed() {
  const seeder = new DatabaseSeeder();
  try {
    await seeder.run();
    console.log('🎉 Seed finalizado!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Erro no seed:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runSeed();
}

export { DatabaseSeeder, runSeed };