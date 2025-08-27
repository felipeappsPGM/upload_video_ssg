// Data Source for TypeORM CLI
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'sysmap_view',
  entities: [User, Token, Video, UserVideo],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
});