import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Token } from '../auth/entities/token.entity';
import { Video } from '../videos/entities/video.entity';
import { UserVideo } from '../videos/entities/user-video.entity';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'mssql',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 1433),
      username: this.configService.get('DB_USERNAME', 'sa'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_DATABASE', 'sysmap_view'),
      entities: [User, Token, Video, UserVideo],
      synchronize: this.configService.get('NODE_ENV') !== 'production',
      logging: this.configService.get('NODE_ENV') === 'development',
      options: {
        encrypt: this.configService.get('DB_ENCRYPT', false),
        trustServerCertificate: this.configService.get('DB_TRUST_SERVER_CERTIFICATE', true),
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      requestTimeout: 30000,
      connectionTimeout: 30000,
      // Migrations
      migrations: ['dist/database/migrations/*.js'],
      migrationsRun: false,
      migrationsTableName: 'migrations',
    };
  }
}

