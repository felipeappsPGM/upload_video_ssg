import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Ip,
  Headers,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard, Public } from './guards/jwt-auth.guard';
import {
  RequestTokenDto,
  ValidateTokenDto,
  LoginResponseDto,
  RequestTokenResponseDto,
  LogoutResponseDto,
} from './dto/auth.dto';
import { User } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('request-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  async requestToken(
    @Body() requestTokenDto: RequestTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<RequestTokenResponseDto> {
    this.logger.log(`Token solicitado para ${requestTokenDto.email} de IP ${ip}`);
    
    return await this.authService.requestToken(
      requestTokenDto,
      ip,
      userAgent,
    );
  }

  @Public()
  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 300000 } }) // 10 requests per 5 minutes
  async validateToken(
    @Body() validateTokenDto: ValidateTokenDto,
    @Ip() ip: string,
  ): Promise<LoginResponseDto> {
    this.logger.log(`Validação de token para ${validateTokenDto.email} de IP ${ip}`);
    
    const result = await this.authService.validateToken(validateTokenDto, ip);
    
    return {
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        fullName: result.user.fullName,
      },
      message: 'Login realizado com sucesso',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest): Promise<LogoutResponseDto> {
    this.logger.log(`Logout para usuário ${req.user.id}`);
    
    return await this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: AuthenticatedRequest): Promise<{ user: UserResponseDto }> {
    return {
      user: new UserResponseDto(req.user),
    };
  }

  @Get('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() req: AuthenticatedRequest): Promise<{ token: string; user: UserResponseDto }> {
    // Em um sistema mais robusto, você implementaria refresh tokens
    // Por ora, retornamos os dados do usuário atual
    this.logger.log(`Token refresh solicitado para usuário ${req.user.id}`);
    
    return {
      token: 'token_would_be_refreshed_here',
      user: new UserResponseDto(req.user),
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  // Apenas para usuários admin (implementar role-based auth se necessário)
  async getAuthStats(@Req() req: AuthenticatedRequest) {
    this.logger.log(`Estatísticas de auth solicitadas por ${req.user.id}`);
    
    return await this.authService.getAuthStats();
  }
}