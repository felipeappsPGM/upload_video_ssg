import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailConfig = {
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    };

    this.transporter = nodemailer.createTransporter(emailConfig);

    // Verificar configuração
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Erro na configuração do e-mail:', error);
      } else {
        this.logger.log('Servidor de e-mail configurado com sucesso');
      }
    });
  }

  async sendLoginToken(email: string, token: string): Promise<void> {
    const mailOptions = {
      from: {
        name: 'SysMap View',
        address: this.configService.get<string>('EMAIL_USER'),
      },
      to: email,
      subject: 'Seu token de acesso - SysMap View',
      html: this.getLoginTokenTemplate(token),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`E-mail enviado com sucesso para ${email}. MessageId: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail para ${email}:`, error.stack);
      throw new Error('Falha ao enviar e-mail');
    }
  }

  async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
    const mailOptions = {
      from: {
        name: 'SysMap View',
        address: this.configService.get<string>('EMAIL_USER'),
      },
      to: email,
      subject: 'Bem-vindo ao SysMap View!',
      html: this.getWelcomeTemplate(firstName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`E-mail de boas-vindas enviado para ${email}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail de boas-vindas para ${email}:`, error.stack);
      // Não lançar erro aqui pois não é crítico
    }
  }

  async sendNotificationEmail(email: string, subject: string, content: string): Promise<void> {
    const mailOptions = {
      from: {
        name: 'SysMap View',
        address: this.configService.get<string>('EMAIL_USER'),
      },
      to: email,
      subject: `SysMap View - ${subject}`,
      html: this.getNotificationTemplate(subject, content),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`E-mail de notificação enviado para ${email}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail de notificação para ${email}:`, error.stack);
    }
  }

  private getLoginTokenTemplate(token: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Seu token de acesso - SysMap View</title>
          <style>
              body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
              .header { background: linear-gradient(135deg, #1e88e5, #42a5f5); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; }
              .header .brand { font-weight: bold; }
              .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; }
              .content { padding: 40px 30px; background: #f8f9fa; }
              .content h2 { color: #333; margin-bottom: 20px; font-size: 24px; }
              .content p { color: #666; margin-bottom: 20px; font-size: 16px; }
              .token-container { background: white; border: 3px dashed #1e88e5; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
              .token { font-size: 36px; font-weight: bold; color: #1e88e5; letter-spacing: 8px; font-family: 'Courier New', monospace; }
              .info { background: #e3f2fd; border-left: 4px solid #1e88e5; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .info p { margin: 0; font-size: 14px; color: #1565c0; }
              .footer { background: #333; padding: 30px; text-align: center; }
              .footer p { color: #999; margin: 0; font-size: 12px; }
              .security-tips { background: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; padding: 15px; margin: 20px 0; }
              .security-tips h3 { color: #856404; margin: 0 0 10px 0; font-size: 16px; }
              .security-tips ul { color: #856404; margin: 0; padding-left: 20px; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Sys<span class="brand">Map</span> View</h1>
                  <p>Plataforma de Vídeos Exclusivos</p>
              </div>
              
              <div class="content">
                  <h2>🔑 Seu token de acesso chegou!</h2>
                  <p>Use o código abaixo para acessar seus vídeos exclusivos na plataforma SysMap View:</p>
                  
                  <div class="token-container">
                      <div class="token">${token}</div>
                  </div>
                  
                  <div class="info">
                      <p><strong>⏰ Expira em 10 minutos</strong> • Use apenas uma vez • Não compartilhe este código</p>
                  </div>
                  
                  <div class="security-tips">
                      <h3>🛡️ Dicas de Segurança:</h3>
                      <ul>
                          <li>Este token é pessoal e intransferível</li>
                          <li>Nunca compartilhe com terceiros</li>
                          <li>Se não solicitou, ignore este e-mail</li>
                          <li>O token expira automaticamente em 10 minutos</li>
                      </ul>
                  </div>
                  
                  <p style="margin-top: 30px; font-size: 14px; color: #999;">
                      Se você não solicitou este código, pode ignorar este e-mail com segurança.
                  </p>
              </div>
              
              <div class="footer">
                  <p>© ${new Date().getFullYear()} SysMap View - Todos os direitos reservados</p>
                  <p>Este é um e-mail automático, não responda.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  private getWelcomeTemplate(firstName?: string): string {
    const name = firstName ? firstName : 'Usuário';
    
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao SysMap View</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #1e88e5, #42a5f5); padding: 40px 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">Sys<span style="font-weight: bold;">Map</span> View</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Bem-vindo à plataforma!</p>
              </div>
              
              <div style="padding: 40px 30px;">
                  <h2>Olá, ${name}! 👋</h2>
                  <p>É um prazer tê-lo conosco na SysMap View, sua nova plataforma de vídeos exclusivos.</p>
                  <p>Agora você tem acesso a conteúdos selecionados especialmente para o seu perfil.</p>
                  <p>Aproveite a experiência!</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  private getNotificationTemplate(subject: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #1e88e5, #42a5f5); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">Sys<span style="font-weight: bold;">Map</span> View</h1>
              </div>
              
              <div style="padding: 30px;">
                  <h2>${subject}</h2>
                  <div>${content}</div>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                  © ${new Date().getFullYear()} SysMap View - Todos os direitos reservados
              </div>
          </div>
      </body>
      </html>
    `;
  }
}