import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private emailConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    const emailHost = this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com');
    const emailPort = this.configService.get<number>('EMAIL_PORT', 587);
    const emailSecure = this.configService.get<boolean>('EMAIL_SECURE', false);

    // ✅ CORREÇÃO: Verificar se as credenciais estão configuradas
    if (!emailUser) {
      this.logger.warn('EMAIL_USER não configurado. Serviço de e-mail será simulado.');
      this.emailConfigured = false;
      return;
    }

    // ✅ Para MailHog ou desenvolvimento, permitir sem senha
    const isMailHog = emailHost === 'localhost' || emailHost === 'mailhog';
    if (!emailPass && !isMailHog) {
      this.logger.warn('EMAIL_PASS não configurado. Configure uma senha de aplicativo.');
      this.emailConfigured = false;
      return;
    }

    try {
      // ✅ CORREÇÃO: Configuração mais robusta do transporter
      const emailConfig: any = {
        host: emailHost,
        port: emailPort,
        secure: emailSecure, // true para 465, false para 587
      };

      // Apenas adicionar auth se não for MailHog
      if (!isMailHog) {
        emailConfig.auth = {
          user: emailUser,
          pass: emailPass,
        };

        // ✅ Para Gmail, adicionar configurações específicas
        if (emailHost.includes('gmail')) {
          emailConfig.service = 'gmail';
          emailConfig.auth.type = 'OAuth2';
          delete emailConfig.auth.type; // Usar autenticação simples
        }
      }

      this.logger.log(`Configurando e-mail: ${emailHost}:${emailPort} (secure: ${emailSecure})`);
      this.transporter = nodemailer.createTransport(emailConfig);

      // ✅ CORREÇÃO: Verificação assíncrona e não bloquear inicialização
      this.verifyConnection();

    } catch (error) {
      this.logger.error('Erro ao configurar transporter de e-mail:', error.message);
      this.emailConfigured = false;
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Servidor de e-mail configurado com sucesso');
      this.emailConfigured = true;
    } catch (error) {
      this.logger.error('❌ Erro na verificação do e-mail:', error.message);
      
      // ✅ Instruções específicas baseadas no erro
      if (error.code === 'EAUTH') {
        this.logger.error(`
🔧 SOLUÇÃO PARA ERRO DE AUTENTICAÇÃO:
1. Para Gmail:
   - Acesse: https://myaccount.google.com/apppasswords
   - Gere uma senha de aplicativo de 16 dígitos
   - Use essa senha no EMAIL_PASS (não sua senha normal)
   
2. Para desenvolvimento:
   - Use MailHog: docker-compose up -d mailhog
   - Configure: EMAIL_HOST=localhost, EMAIL_PORT=1025
   
3. Verificar variáveis:
   - EMAIL_USER=${this.configService.get('EMAIL_USER', 'não definido')}
   - EMAIL_PASS=${this.configService.get('EMAIL_PASS') ? '[DEFINIDO]' : '[NÃO DEFINIDO]'}
        `);
      }
      
      this.emailConfigured = false;
    }
  }

  async sendLoginToken(email: string, token: string): Promise<void> {
    // ✅ Se e-mail não configurado, simular envio
    if (!this.emailConfigured) {
      this.logger.warn(`📧 [SIMULADO] Token para ${email}: ${token}`);
      this.logger.warn('Configure EMAIL_USER e EMAIL_PASS para envio real');
      return;
    }

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
      this.logger.log(`📧 E-mail enviado com sucesso para ${email}. MessageId: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar e-mail para ${email}:`, error.message);
      
      // ✅ Em desenvolvimento, não falhar completamente
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(`📧 [FALLBACK] Token para ${email}: ${token}`);
        return;
      }
      
      throw new Error('Falha ao enviar e-mail');
    }
  }

  async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
    if (!this.emailConfigured) {
      this.logger.log(`📧 [SIMULADO] E-mail de boas-vindas para ${email}`);
      return;
    }

    const name = firstName ? firstName : 'Usuário';
    
    const mailOptions = {
      from: {
        name: 'SysMap View',
        address: this.configService.get<string>('EMAIL_USER'),
      },
      to: email,
      subject: 'Bem-vindo ao SysMap View!',
      html: this.getWelcomeTemplate(name),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 E-mail de boas-vindas enviado para ${email}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar e-mail de boas-vindas para ${email}:`, error.message);
      // Não lançar erro pois não é crítico
    }
  }

  async sendNotificationEmail(email: string, subject: string, content: string): Promise<void> {
    if (!this.emailConfigured) {
      this.logger.log(`📧 [SIMULADO] Notificação para ${email}: ${subject}`);
      return;
    }

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
      this.logger.log(`📧 E-mail de notificação enviado para ${email}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar e-mail de notificação para ${email}:`, error.message);
    }
  }

  // ✅ Método para verificar status da configuração
  getEmailStatus(): { configured: boolean; service: string; user?: string } {
    return {
      configured: this.emailConfigured,
      service: this.configService.get<string>('EMAIL_HOST', 'não configurado'),
      user: this.emailConfigured ? this.configService.get<string>('EMAIL_USER') : undefined,
    };
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

  private getWelcomeTemplate(firstName: string): string {
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
                  <h2>Olá, ${firstName}! 👋</h2>
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