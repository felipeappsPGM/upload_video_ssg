#!/usr/bin/env node

/**
 * 🔄 SCRIPT HELPER PARA MIGRATIONS
 * Tenta diferentes métodos para executar migrations
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  red: '\033[31m',
  green: '\033[32m',
  yellow: '\033[33m',
  blue: '\033[34m',
  cyan: '\033[36m',
  reset: '\033[0m',
  bold: '\033[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
  log('='.repeat(50), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function checkPrerequisites() {
  logStep('🔍', 'Verificando pré-requisitos...');

  // Verificar .env
  if (!fs.existsSync('.env')) {
    logError('Arquivo .env não encontrado');
    log('Crie um arquivo .env baseado no .env.example', 'blue');
    return false;
  }
  logSuccess('Arquivo .env encontrado');

  // Verificar se aplicação pode ser compilada
  try {
    log('Compilando TypeScript...', 'blue');
    execSync('npm run build', { stdio: 'pipe' });
    logSuccess('Compilação OK');
  } catch (error) {
    logWarning('Erro na compilação, tentando instalar dependências...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      execSync('npm run build', { stdio: 'pipe' });
      logSuccess('Compilação OK após npm install');
    } catch (buildError) {
      logError('Falha na compilação');
      console.log(buildError.message);
      return false;
    }
  }

  // Verificar conexão com banco
  try {
    log('Testando conexão com o banco...', 'blue');
    const testScript = `
      require('dotenv').config();
      const sql = require('mssql');
      sql.connect({
        server: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '1433'),
        user: process.env.DB_USERNAME || 'sa',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'sysmap_view',
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
        }
      }).then(() => {
        console.log('CONNECTION_OK');
        process.exit(0);
      }).catch(err => {
        console.error('CONNECTION_ERROR:', err.message);
        process.exit(1);
      });
    `;
    
    execSync(`node -e "${testScript.replace(/\n/g, ' ')}"`, { stdio: 'pipe' });
    logSuccess('Conexão com banco OK');
  } catch (error) {
    logWarning('Problema na conexão com banco');
    log('Verifique se o SQL Server está rodando: docker-compose up -d sqlserver', 'blue');
    log('Aguarde 30 segundos e tente novamente', 'blue');
    return false;
  }

  return true;
}

async function runMigrations() {
  logStep('🔄', 'Executando migrations...');

  const methods = [
    {
      name: 'TypeORM CLI com TypeScript',
      command: 'npm run typeorm -- migration:run -d src/database/data-source.ts'
    },
    {
      name: 'TypeORM CLI com JavaScript compilado',
      command: 'npx typeorm migration:run -d dist/database/data-source.js'
    },
    {
      name: 'TypeORM CLI com configuração JavaScript',
      command: 'npx typeorm migration:run -d typeorm.config.js'
    },
    {
      name: 'Execução direta do DataSource',
      command: 'node -e "require(\'./dist/database/data-source.js\').AppDataSource.initialize().then(ds => ds.runMigrations()).then(() => console.log(\'Migrations OK\')).catch(console.error)"'
    }
  ];

  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    log(`\n📋 Tentativa ${i + 1}: ${method.name}`, 'blue');
    
    try {
      execSync(method.command, { 
        stdio: 'inherit',
        timeout: 60000 // 60 segundos timeout
      });
      logSuccess(`Migrations executadas com sucesso usando: ${method.name}`);
      return true;
    } catch (error) {
      logError(`Falhou: ${method.name}`);
      if (i < methods.length - 1) {
        logWarning('Tentando próximo método...');
      }
    }
  }

  logError('Todos os métodos falharam');
  return false;
}

async function createDatabaseIfNotExists() {
  logStep('🗄️', 'Verificando/criando database...');

  try {
    const createDbScript = `
      require('dotenv').config();
      const sql = require('mssql');
      
      async function createDb() {
        const config = {
          server: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '1433'),
          user: process.env.DB_USERNAME || 'sa',
          password: process.env.DB_PASSWORD || '',
          database: 'master', // Conectar no master primeiro
          options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
          }
        };
        
        const pool = await sql.connect(config);
        const dbName = process.env.DB_DATABASE || 'sysmap_view';
        
        // Verificar se database existe
        const result = await pool.request()
          .query(\`SELECT name FROM sys.databases WHERE name = '\${dbName}'\`);
        
        if (result.recordset.length === 0) {
          await pool.request().query(\`CREATE DATABASE [\${dbName}]\`);
          console.log('Database criado:', dbName);
        } else {
          console.log('Database já existe:', dbName);
        }
        
        await pool.close();
      }
      
      createDb().catch(console.error);
    `;

    execSync(`node -e "${createDbScript.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
    logSuccess('Database verificado/criado');
  } catch (error) {
    logWarning('Não foi possível criar database automaticamente');
    log('Crie manualmente se necessário:', 'blue');
    log('docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U SA -P "SysMapView123!"', 'blue');
    log('1> CREATE DATABASE sysmap_view;', 'blue');
    log('2> GO', 'blue');
  }
}

async function main() {
  log('🚀 EXECUTAR MIGRATIONS - SYSMAP VIEW', 'bold');
  log('===================================', 'cyan');

  // Verificar pré-requisitos
  const prereqsOk = await checkPrerequisites();
  if (!prereqsOk) {
    log('\n❌ Pré-requisitos não atendidos. Corrija os problemas acima.', 'red');
    process.exit(1);
  }

  // Criar database se necessário
  await createDatabaseIfNotExists();

  // Executar migrations
  const migrationsOk = await runMigrations();
  
  if (migrationsOk) {
    logSuccess('\n🎉 Migrations executadas com sucesso!');
    log('Próximos passos:', 'cyan');
    log('  1. Execute o seed: npm run seed', 'blue');
    log('  2. Inicie a aplicação: npm run start:dev', 'blue');
  } else {
    logError('\n💥 Falha na execução das migrations');
    log('Soluções possíveis:', 'yellow');
    log('  1. Verificar se SQL Server está rodando', 'blue');
    log('  2. Verificar credenciais no .env', 'blue');
    log('  3. Executar: docker-compose up -d sqlserver', 'blue');
    log('  4. Aguardar 30 segundos e tentar novamente', 'blue');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    logError(`Erro inesperado: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };