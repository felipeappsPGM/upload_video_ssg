import {
  IsString,
  IsOptional,
  IsUrl,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsDateString,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoStatus } from '../entities/video.entity';
import { AccessType } from '../entities/user-video.entity';

export class CreateVideoDto {
  @ApiProperty({
    description: 'Título do vídeo',
    example: 'Introdução ao Sistema',
    minLength: 3,
    maxLength: 255,
  })
  @IsString({ message: 'Título deve ser uma string' })
  @MinLength(3, { message: 'Título deve ter pelo menos 3 caracteres' })
  @MaxLength(255, { message: 'Título deve ter no máximo 255 caracteres' })
  title: string;

  @ApiPropertyOptional({
    description: 'Descrição do vídeo',
    example: 'Aprenda os conceitos básicos do nosso sistema',
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  @MaxLength(5000, { message: 'Descrição deve ter no máximo 5000 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'URL do vídeo',
    example: 'https://example.com/video.mp4',
  })
  @IsUrl({}, { message: 'URL do vídeo deve ser válida' })
  url: string;

  @ApiPropertyOptional({
    description: 'URL da thumbnail',
    example: 'https://example.com/thumbnail.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL da thumbnail deve ser válida' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Duração do vídeo (MM:SS ou HH:MM:SS)',
    example: '10:30',
  })
  @IsOptional()
  @IsString({ message: 'Duração deve ser uma string' })
  duration?: string;

  @ApiPropertyOptional({
    description: 'Duração do vídeo em segundos',
    example: 630,
  })
  @IsOptional()
  @IsInt({ message: 'Duração em segundos deve ser um número inteiro' })
  @Min(1, { message: 'Duração deve ser pelo menos 1 segundo' })
  durationSeconds?: number;

  @ApiPropertyOptional({
    description: 'Status do vídeo',
    enum: VideoStatus,
    example: VideoStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(VideoStatus, { message: 'Status deve ser válido' })
  status?: VideoStatus;

  @ApiPropertyOptional({
    description: 'Categoria do vídeo',
    example: 'Treinamento',
  })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(100, { message: 'Categoria deve ter no máximo 100 caracteres' })
  category?: string;

  @ApiPropertyOptional({
    description: 'Tags do vídeo separadas por vírgula',
    example: 'treinamento,básico,introdução',
  })
  @IsOptional()
  @IsString({ message: 'Tags devem ser uma string' })
  tags?: string;

  @ApiPropertyOptional({
    description: 'Tamanho do arquivo em bytes',
    example: 1048576,
  })
  @IsOptional()
  @IsInt({ message: 'Tamanho do arquivo deve ser um número inteiro' })
  @Min(1, { message: 'Tamanho do arquivo deve ser positivo' })
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Resolução do vídeo',
    example: '1080p',
  })
  @IsOptional()
  @IsString({ message: 'Resolução deve ser uma string' })
  resolution?: string;
}

export class UpdateVideoDto extends PartialType(CreateVideoDto) {
  @ApiPropertyOptional({
    description: 'Se o vídeo está ativo',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'IsActive deve ser um valor booleano' })
  isActive?: boolean;
}

export class AssignVideoDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: 'uuid-do-usuario',
  })
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  userId: string;

  @ApiProperty({
    description: 'ID do vídeo',
    example: 1,
  })
  @IsInt({ message: 'ID do vídeo deve ser um número inteiro' })
  @Min(1, { message: 'ID do vídeo deve ser positivo' })
  videoId: number;

  @ApiPropertyOptional({
    description: 'Tipo de acesso',
    enum: AccessType,
    example: AccessType.ASSIGNED,
  })
  @IsOptional()
  @IsEnum(AccessType, { message: 'Tipo de acesso deve ser válido' })
  accessType?: AccessType;

  @ApiPropertyOptional({
    description: 'Data de expiração do acesso',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de expiração deve ser válida' })
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Notas sobre a atribuição',
    example: 'Acesso liberado para treinamento',
  })
  @IsOptional()
  @IsString({ message: 'Notas devem ser uma string' })
  @MaxLength(500, { message: 'Notas devem ter no máximo 500 caracteres' })
  notes?: string;
}

export class VideoSearchDto {
  @ApiPropertyOptional({
    description: 'Termo de busca',
    example: 'treinamento',
  })
  @IsOptional()
  @IsString({ message: 'Query deve ser uma string' })
  @MaxLength(100, { message: 'Query deve ter no máximo 100 caracteres' })
  query?: string;

  @ApiPropertyOptional({
    description: 'Categoria para filtrar',
    example: 'Treinamento',
  })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  category?: string;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'OrderBy deve ser uma string' })
  orderBy?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'OrderDirection deve ser ASC ou DESC' })
  orderDirection?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Limite de resultados',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit deve ser um número inteiro' })
  @Min(1, { message: 'Limit deve ser pelo menos 1' })
  @Max(100, { message: 'Limit deve ser no máximo 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset para paginação',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset deve ser um número inteiro' })
  @Min(0, { message: 'Offset deve ser pelo menos 0' })
  offset?: number;
}

export class WatchProgressDto {
  @ApiProperty({
    description: 'Posição atual em segundos',
    example: 120,
    minimum: 0,
  })
  @IsInt({ message: 'Posição deve ser um número inteiro' })
  @Min(0, { message: 'Posição deve ser pelo menos 0' })
  position: number;
}

export class VideoResponseDto {
  @ApiProperty({ description: 'ID do vídeo' })
  id: number;

  @ApiProperty({ description: 'Título do vídeo' })
  title: string;

  @ApiProperty({ description: 'Descrição do vídeo' })
  description?: string;

  @ApiProperty({ description: 'URL do vídeo' })
  url: string;

  @ApiProperty({ description: 'URL da thumbnail' })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Duração formatada' })
  duration?: string;

  @ApiProperty({ description: 'Duração em segundos' })
  durationSeconds?: number;

  @ApiProperty({ description: 'Categoria' })
  category?: string;

  @ApiProperty({ description: 'Tags array' })
  tagsArray: string[];

  @ApiProperty({ description: 'Número de visualizações' })
  viewCount: number;

  @ApiProperty({ description: 'Informações de acesso do usuário' })
  userVideoInfo?: {
    viewCount: number;
    lastViewedAt?: Date;
    completionPercentage: number;
    isCompleted: boolean;
    watchPosition: number;
  };
}

export class VideoStatsDto {
  @ApiProperty({ description: 'Total de visualizações' })
  totalViews: number;

  @ApiProperty({ description: 'Número de espectadores únicos' })
  uniqueViewers: number;

  @ApiProperty({ description: 'Taxa de conclusão em %' })
  completionRate: number;

  @ApiProperty({ description: 'Tempo médio de visualização em segundos' })
  averageWatchTime: number;
}