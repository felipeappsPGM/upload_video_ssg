import { IsEmail, IsOptional, IsString, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateUserDto {
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Sobrenome deve ser uma string' })
  @MinLength(2, { message: 'Sobrenome deve ter pelo menos 2 caracteres' })
  @MaxLength(100, { message: 'Sobrenome deve ter no máximo 100 caracteres' })
  lastName?: string;

  @IsOptional()
  @IsBoolean({ message: 'IsActive deve ser um valor booleano' })
  isActive?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UserResponseDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: any) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.fullName = user.fullName;
    this.isActive = user.isActive;
    this.lastLoginAt = user.lastLoginAt;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}