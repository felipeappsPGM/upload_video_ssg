import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RequestTokenDto {
  @ApiProperty({
    description: 'E-mail do usuário para receber o token',
    example: 'rodrigo.paiva@gmail.com',
  })
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

export class ValidateTokenDto {
  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'rodrigo.paiva@gmail.com',
  })
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Token de 6 dígitos recebido por e-mail',
    example: 'ABC123',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'Token deve ser uma string' })
  @Length(6, 6, { message: 'Token deve ter exatamente 6 caracteres' })
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Token deve conter apenas letras maiúsculas e números' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  token: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT token para autenticação',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Dados do usuário logado',
  })
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName: string;
  };

  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Login realizado com sucesso',
  })
  message: string;
}

export class RequestTokenResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação',
    example: 'Token enviado com sucesso para seu e-mail',
  })
  message: string;

  @ApiProperty({
    description: 'E-mail onde o token foi enviado',
    example: 'rodrigo.paiva@gmail.com',
  })
  email: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação',
    example: 'Logout realizado com sucesso',
  })
  message: string;
}