import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateInitialTables1703000001000 implements MigrationInterface {
  name = 'CreateInitialTables1703000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela Users
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'NEWID()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'bit',
            default: 1,
          },
          {
            name: 'lastLoginAt',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime2',
            default: 'GETDATE()',
          },
          {
            name: 'updatedAt',
            type: 'datetime2',
            default: 'GETDATE()',
          },
        ],
      }),
      true,
    );

    // Criar tabela Videos
    await queryRunner.createTable(
      new Table({
        name: 'videos',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'thumbnailUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'varchar',
            length: '10',
            isNullable: true,
            comment: 'Duration in format MM:SS or HH:MM:SS',
          },
          {
            name: 'durationSeconds',
            type: 'int',
            isNullable: true,
            comment: 'Duration in seconds',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'PUBLISHED'",
          },
          {
            name: 'isActive',
            type: 'bit',
            default: 1,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
            comment: 'Tags separated by comma',
          },
          {
            name: 'viewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'fileSize',
            type: 'bigint',
            isNullable: true,
            comment: 'File size in bytes',
          },
          {
            name: 'resolution',
            type: 'varchar',
            length: '10',
            isNullable: true,
            comment: 'Video resolution (e.g., 1080p, 720p)',
          },
          {
            name: 'createdAt',
            type: 'datetime2',
            default: 'GETDATE()',
          },
          {
            name: 'updatedAt',
            type: 'datetime2',
            default: 'GETDATE()',
          },
        ],
      }),
      true,
    );

    // Criar tabela Tokens
    await queryRunner.createTable(
      new Table({
        name: 'tokens',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'NEWID()',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            default: "'EMAIL_LOGIN'",
          },
          {
            name: 'expiresAt',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'isUsed',
            type: 'bit',
            default: 0,
          },
          {
            name: 'usedAt',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime2',
            default: 'GETDATE()',
          },
        ],
      }),
      true,
    );

    // Criar tabela UserVideos
    await queryRunner.createTable(
      new Table({
        name: 'user_videos',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'NEWID()',
          },
          {
            name: 'accessType',
            type: 'varchar',
            length: '50',
            default: "'ASSIGNED'",
          },
          {
            name: 'expiresAt',
            type: 'datetime2',
            isNullable: true,
            comment: 'When access expires (null = no expiration)',
          },
          {
            name: 'isActive',
            type: 'bit',
            default: 1,
          },
          {
            name: 'firstViewedAt',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'lastViewedAt',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'viewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'watchPosition',
            type: 'int',
            default: 0,
            comment: 'Last watched position in seconds',
          },
          {
            name: 'completionPercentage',
            type: 'decimal(5,2)',
            default: 0,
            comment: 'Completion percentage (0-100)',
          },
          {
            name: 'isCompleted',
            type: 'bit',
            default: 0,
          },
          {
            name: 'grantedBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Who granted access',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'videoId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime2',
            default: 'GETDATE()',
          },
          {
            name: 'updatedAt',
            type: 'datetime2',
            default: 'GETDATE()',
          },
        ],
      }),
      true,
    );

    // Criar índices
    await queryRunner.createIndex(
      'videos',
      new Index('IDX_videos_status_active', ['status', 'isActive']),
    );

    await queryRunner.createIndex(
      'tokens',
      new Index('IDX_tokens_token_type', ['token', 'type']),
    );

    await queryRunner.createIndex(
      'tokens',
      new Index('IDX_tokens_userId_type', ['userId', 'type']),
    );

    await queryRunner.createIndex(
      'user_videos',
      new Index('IDX_user_videos_userId_accessType', ['userId', 'accessType']),
    );

    await queryRunner.createIndex(
      'user_videos',
      new Index('IDX_user_videos_videoId_accessType', ['videoId', 'accessType']),
    );

    // Criar constraint de unique em user_videos
    await queryRunner.createIndex(
      'user_videos',
      new Index('UQ_user_videos_userId_videoId', ['userId', 'videoId'], { isUnique: true }),
    );

    // Criar Foreign Keys
    await queryRunner.createForeignKey(
      'tokens',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_tokens_users',
      }),
    );

    await queryRunner.createForeignKey(
      'user_videos',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_user_videos_users',
      }),
    );

    await queryRunner.createForeignKey(
      'user_videos',
      new ForeignKey({
        columnNames: ['videoId'],
        referencedTableName: 'videos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_user_videos_videos',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover Foreign Keys
    await queryRunner.dropForeignKey('user_videos', 'FK_user_videos_videos');
    await queryRunner.dropForeignKey('user_videos', 'FK_user_videos_users');
    await queryRunner.dropForeignKey('tokens', 'FK_tokens_users');

    // Remover tabelas
    await queryRunner.dropTable('user_videos');
    await queryRunner.dropTable('tokens');
    await queryRunner.dropTable('videos');
    await queryRunner.dropTable('users');
  }
}