import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Token } from '../auth/entities/token.entity';
import { Video } from '../videos/entities/video.entity';
import { UserVideo } from '../videos/entities/user-video.entity';

// ✅ Carregar variáveis do .env
config();

// ✅ Verificar se é ambiente Azure
const isAzure = (process.env.DB_HOST || '').includes('database.windows.net');

// ✅ Função para determinar valor do encrypt
function getEncryptValue(): boolean | 'strict' {
  if (isAzure) {
    return 'strict';
  }
  
  const encryptConfig = process.env.DB_ENCRYPT || 'false';
  
  if (encryptConfig === 'strict') {
    return 'strict';
  }
  
  return encryptConfig === 'true';
}

// ✅ CORREÇÃO: Garantir que porta seja number
const dbPort = parseInt(process.env.DB_PORT || '1433', 10);
const dbHost = process.env.DB_HOST || 'localhost';

console.log(`🔗 TypeORM CLI conectando em: ${dbHost}:${dbPort} (tipo: ${typeof dbPort})`);

// ✅ Data Source para TypeORM CLI
export const AppDataSource = new DataSource({
  type: 'mssql',
  host: dbHost,
  port: dbPort, // ✅ Garantido que é number
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'sysmap_view',
  
  // ✅ Entidades
  entities: [User, Token, Video, UserVideo],
  
  // ✅ Migrations
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  
  // ✅ Configurações
  synchronize: false, // NUNCA true em produção
  logging: process.env.NODE_ENV === 'development',
  
  // ✅ CORREÇÃO: Usar 'extra' para configurações de conexão
  extra: {
    encrypt: getEncryptValue(),
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    connectTimeout: 30000, // 30 segundos
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    // ✅ Configurações específicas Windows
    ...(process.platform === 'win32' && {
      enableArithAbort: true,
    })
  },
});

// ✅ Inicializar conexão se executado diretamente
if (require.main === module) {
  AppDataSource.initialize()
    .then(() => {
      console.log('✅ Data Source inicializado com sucesso!');
      console.log(`📊 Conectado em: ${dbHost}:${dbPort}`);
      console.log(`🗄️  Database: ${process.env.DB_DATABASE}`);
    })
    .catch((error) => {
      console.error('❌ Erro na inicialização do Data Source:', error);
      process.exit(1);
    });
}