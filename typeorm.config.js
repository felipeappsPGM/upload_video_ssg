// ✅ Configuração alternativa do TypeORM em JavaScript
// Use este arquivo se a versão TypeScript não funcionar

require('dotenv').config();

const isAzure = (process.env.DB_HOST || '').includes('database.windows.net');

function getEncryptValue() {
  if (isAzure) {
    return 'strict';
  }
  
  const encryptConfig = process.env.DB_ENCRYPT || 'false';
  
  if (encryptConfig === 'strict') {
    return 'strict';
  }
  
  return encryptConfig === 'true';
}

module.exports = {
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'sysmap_view',
  
  // Entidades (compiladas)
  entities: ['dist/**/*.entity.js'],
  
  // Migrations
  migrations: ['dist/database/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  
  // Configurações
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  
  // Configurações de conexão
  extra: {
    encrypt: getEncryptValue(),
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    connectTimeout: 60000,
    requestTimeout: 60000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
};