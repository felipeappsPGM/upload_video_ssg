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
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const isAzure = this.configService.get('DB_HOST', '').includes('database.windows.net');
    
    // ✅ CORREÇÃO: Converter porta para número explicitamente
    const dbPort = parseInt(this.configService.get('DB_PORT', '1433'), 10);
    const dbHost = this.configService.get('DB_HOST', 'localhost');
    
    console.log(`🔗 Conectando em: ${dbHost}:${dbPort} (tipo: ${typeof dbPort})`);
    
    return {
      type: 'mssql',
      host: dbHost,
      port: dbPort, // ✅ Garantido que é number
      username: this.configService.get('DB_USERNAME', 'sa'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_DATABASE', 'sysmap_view'),
      entities: [User, Token, Video, UserVideo],
      synchronize: !isProduction && this.configService.get('DB_AUTO_SYNC', 'true') === 'true',
      logging: this.configService.get('NODE_ENV') === 'development',
      
      // ✅ CORREÇÃO: Configuração robusta para mssql
      extra: {
        encrypt: this.getEncryptValue(isAzure),
        trustServerCertificate: this.configService.get('DB_TRUST_SERVER_CERTIFICATE', 'true') === 'true',
        connectTimeout: 30000, // 30 segundos
        requestTimeout: 30000,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
        // ✅ Configurações adicionais para Windows
        ...(process.platform === 'win32' && {
          enableArithAbort: true,
          enableAnsiNullDefault: true,
          enableAnsiNull: true,
          enableAnsiPadding: true,
          enableAnsiWarnings: true,
        })
      },
      
      // Migrations
      migrations: ['dist/database/migrations/*.js'],
      migrationsRun: false,
      migrationsTableName: 'typeorm_migrations',
      
      // ✅ Configurações de retry
      maxQueryExecutionTime: 30000,
      retryAttempts: 3,
      retryDelay: 3000,
    };
  }

  private getEncryptValue(isAzure: boolean): boolean | 'strict' {
    if (isAzure) {
      return 'strict';
    }
    
    const encryptConfig = this.configService.get('DB_ENCRYPT', 'false');
    
    if (encryptConfig === 'strict') {
      return 'strict';
    }
    
    return encryptConfig === 'true';
  }
}