import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/guards/jwt-auth.guard';

@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV', 'development'),
      version: '1.0.0',
      service: 'sysmap-view-api',
      database: 'connected', // Em produção, verificar conexão real
      email: this.configService.get('EMAIL_USER') ? 'configured' : 'not_configured',
    };
  }

  @Public()
  @Get('ping')
  ping() {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }
}