import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Token, TokenType } from './entities/token.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RequestTokenDto, ValidateTokenDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async requestToken(requestTokenDto: RequestTokenDto, ipAddress?: string, userAgent?: string): Promise<{ message: string; email: string }> {
    const { email } = requestTokenDto;

    try {
      // Verificar rate limiting
      await this.checkRateLimit(email);

      // Encontrar ou criar usuário
      const user = await this.usersService.findOrCreateByEmail(email);

      // Invalidar tokens existentes do usuário
      await this.invalidateExistingTokens(user.id, TokenType.EMAIL_LOGIN);

      // Gerar novo token
      const tokenValue = this.generateTokenValue();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      const token = this.tokenRepository.create({
        token: tokenValue,
        type: TokenType.EMAIL_LOGIN,
        expiresAt,
        userId: user.id,
        ipAddress,
        userAgent,
      });

      await this.tokenRepository.save(token);

      // Enviar e-mail
      await this.emailService.sendLoginToken(user.email, tokenValue);

      this.logger.log(`Token de login enviado para ${email}`);

      return {
        message: 'Token enviado com sucesso para seu e-mail',
        email: user.email,
      };

    } catch (error) {
      this.logger.error(`Erro ao solicitar token para ${email}:`, error.stack);
      throw new BadRequestException('Erro ao processar solicitação de token');
    }
  }

  async validateToken(validateTokenDto: ValidateTokenDto, ipAddress?: string): Promise<{ token: string; user: User }> {
    const { email, token: tokenValue } = validateTokenDto;

    try {
      // Buscar usuário
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // Buscar token válido
      const token = await this.tokenRepository.findOne({
        where: {
          userId: user.id,
          token: tokenValue.toUpperCase(),
          type: TokenType.EMAIL_LOGIN,
          isUsed: false,
        },
      });

      if (!token) {
        throw new UnauthorizedException('Token inválido ou não encontrado');
      }

      if (!token.isValid()) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      // Marcar token como usado
      token.markAsUsed();
      await this.tokenRepository.save(token);

      // Atualizar último login do usuário
      await this.usersService.updateLastLogin(user.id);

      // Gerar JWT
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
      };

      const jwtToken = this.jwtService.sign(payload);

      this.logger.log(`Login realizado com sucesso para ${email}`);

      return {
        token: jwtToken,
        user,
      };

    } catch (error) {
      this.logger.error(`Erro na validação de token para ${email}:`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Erro ao validar token');
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findOne(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return user;
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Em um sistema mais avançado, você adicionaria o JWT a uma blacklist
    // Por ora, apenas retornamos sucesso pois o token expirará naturalmente
    
    this.logger.log(`Logout realizado para usuário ${userId}`);
    
    return {
      message: 'Logout realizado com sucesso',
    };
  }

  private generateTokenValue(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  private async invalidateExistingTokens(userId: string, type: TokenType): Promise<void> {
    await this.tokenRepository.update(
      { userId, type, isUsed: false },
      { isUsed: true, usedAt: new Date() }
    );
  }

  private async checkRateLimit(email: string): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentTokensCount = await this.tokenRepository.count({
      where: {
        user: { email },
        createdAt: LessThan(fiveMinutesAgo),
      },
    });

    if (recentTokensCount >= 3) {
      throw new BadRequestException('Muitas tentativas. Tente novamente em alguns minutos.');
    }
  }

  // Limpeza automática de tokens expirados (executa a cada hora)
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.tokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`${result.affected} tokens expirados removidos`);
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de tokens expirados:', error.stack);
    }
  }

  // Estatísticas de autenticação
  async getAuthStats(): Promise<{
    totalTokensToday: number;
    successfulLoginsToday: number;
    activeTokens: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalTokensToday, successfulLoginsToday, activeTokens] = await Promise.all([
      this.tokenRepository.count({
        where: {
          createdAt: LessThan(today),
        },
      }),
      this.tokenRepository.count({
        where: {
          createdAt: LessThan(today),
          isUsed: true,
        },
      }),
      this.tokenRepository.count({
        where: {
          isUsed: false,
          expiresAt: LessThan(new Date()),
        },
      }),
    ]);

    return {
      totalTokensToday,
      successfulLoginsToday,
      activeTokens,
    };
  }
}