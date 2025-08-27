import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1703000001000 implements MigrationInterface {
  name = 'CreateInitialTables1703000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela Users usando SQL direto para evitar problemas de API
    await queryRunner.query(`
      CREATE TABLE users (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        email varchar(255) UNIQUE NOT NULL,
        firstName varchar(100) NULL,
        lastName varchar(100) NULL,
        isActive bit DEFAULT 1,
        lastLoginAt datetime2 NULL,
        createdAt datetime2 DEFAULT GETDATE(),
        updatedAt datetime2 DEFAULT GETDATE()
      )
    `);

    // Criar tabela Videos
    await queryRunner.query(`
      CREATE TABLE videos (
        id int IDENTITY(1,1) PRIMARY KEY,
        title varchar(255) NOT NULL,
        description text NULL,
        url varchar(500) NOT NULL,
        thumbnailUrl varchar(500) NULL,
        duration varchar(10) NULL,
        durationSeconds int NULL,
        status varchar(50) DEFAULT 'PUBLISHED',
        isActive bit DEFAULT 1,
        category varchar(100) NULL,
        tags text NULL,
        viewCount int DEFAULT 0,
        fileSize bigint NULL,
        resolution varchar(10) NULL,
        createdAt datetime2 DEFAULT GETDATE(),
        updatedAt datetime2 DEFAULT GETDATE()
      )
    `);

    // Criar tabela Tokens
    await queryRunner.query(`
      CREATE TABLE tokens (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        token varchar(10) NOT NULL,
        type varchar(50) DEFAULT 'EMAIL_LOGIN',
        expiresAt datetime2 NOT NULL,
        isUsed bit DEFAULT 0,
        usedAt datetime2 NULL,
        ipAddress varchar(45) NULL,
        userAgent varchar(500) NULL,
        userId uniqueidentifier NOT NULL,
        createdAt datetime2 DEFAULT GETDATE()
      )
    `);

    // Criar tabela UserVideos
    await queryRunner.query(`
      CREATE TABLE user_videos (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        accessType varchar(50) DEFAULT 'ASSIGNED',
        expiresAt datetime2 NULL,
        isActive bit DEFAULT 1,
        firstViewedAt datetime2 NULL,
        lastViewedAt datetime2 NULL,
        viewCount int DEFAULT 0,
        watchPosition int DEFAULT 0,
        completionPercentage decimal(5,2) DEFAULT 0,
        isCompleted bit DEFAULT 0,
        grantedBy varchar(255) NULL,
        notes text NULL,
        userId uniqueidentifier NOT NULL,
        videoId int NOT NULL,
        createdAt datetime2 DEFAULT GETDATE(),
        updatedAt datetime2 DEFAULT GETDATE()
      )
    `);

    // Criar índices
    await queryRunner.query(`CREATE INDEX IDX_videos_status_active ON videos (status, isActive)`);
    await queryRunner.query(`CREATE INDEX IDX_tokens_token_type ON tokens (token, type)`);
    await queryRunner.query(`CREATE INDEX IDX_tokens_userId_type ON tokens (userId, type)`);
    await queryRunner.query(`CREATE INDEX IDX_user_videos_userId_accessType ON user_videos (userId, accessType)`);
    await queryRunner.query(`CREATE INDEX IDX_user_videos_videoId_accessType ON user_videos (videoId, accessType)`);
    
    // Criar constraint único
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_user_videos_userId_videoId ON user_videos (userId, videoId)`);

    // Criar Foreign Keys
    await queryRunner.query(`
      ALTER TABLE tokens 
      ADD CONSTRAINT FK_tokens_users 
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE user_videos 
      ADD CONSTRAINT FK_user_videos_users 
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE user_videos 
      ADD CONSTRAINT FK_user_videos_videos 
      FOREIGN KEY (videoId) REFERENCES videos (id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover Foreign Keys
    await queryRunner.query(`ALTER TABLE user_videos DROP CONSTRAINT FK_user_videos_videos`);
    await queryRunner.query(`ALTER TABLE user_videos DROP CONSTRAINT FK_user_videos_users`);
    await queryRunner.query(`ALTER TABLE tokens DROP CONSTRAINT FK_tokens_users`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE user_videos`);
    await queryRunner.query(`DROP TABLE tokens`);
    await queryRunner.query(`DROP TABLE videos`);
    await queryRunner.query(`DROP TABLE users`);
  }
}