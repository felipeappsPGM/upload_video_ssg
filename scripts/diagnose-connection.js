#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNÓSTICO - SysMap View Backend
 * Verifica conectividade com SQL Server e configurações de e-mail
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para console
const colors = {
  red: '\033[31m',
  green: '\033[32m',
  yellow: '\033[33m',
  blue: '\033[34m',
  magenta: '\033[35m',
  cyan: '\033[36m',
  white: '\033[37m',
  reset: '\033[0m',
  bold: '\033[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(`🔍 ${title}`, 'cyan');
  console.log('='.repeat(60));
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

function logInfo(message) {
  log(`💡 ${message}`, 'blue');
}

// Carregar variáveis do .env
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    logError('.env file not found!');
    logInfo('Crie um arquivo .env baseado no .env.example');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

// Verificar dependências do Node.js
function checkNodeDependencies() {
  logHeader('VERIFICANDO DEPENDÊNCIAS NODE.JS');

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    logSuccess('package.json encontrado');

    const requiredDeps = ['mssql', 'typeorm', '@nestjs/typeorm', 'nodemailer'];
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        logSuccess(`${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        logError(`${dep}: não encontrado`);
      }
    });

    // Verificar se node_modules existe
    if (fs.existsSync('node_modules')) {
      logSuccess('node_modules directory exists');
    } else {
      logError('node_modules não encontrado. Execute: npm install');
    }

  } catch (error) {
    logError(`Erro ao verificar dependências: ${error.message}`);
  }
}

// Verificar Docker
function checkDocker() {
  logHeader('VERIFICANDO DOCKER');

  try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf8' });
    logSuccess(`Docker: ${dockerVersion.trim()}`);

    const dockerComposeVersion = execSync('docker-compose --version', { encoding: 'utf8' });
    logSuccess(`Docker Compose: ${dockerComposeVersion.trim()}`);

    // Verificar containers
    try {
      const containers = execSync('docker ps -a --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: 'utf8' });
      log('\n📋 Containers Docker:', 'blue');
      console.log(containers);
    } catch (error) {
      logWarning('Não foi possível listar containers Docker');
    }

  } catch (error) {
    logWarning('Docker não encontrado ou não está rodando');
    logInfo('Instale Docker: https://docs.docker.com/get-docker/');
  }
}

// Verificar conectividade SQL Server
async function checkSqlServerConnection(env) {
  logHeader('VERIFICANDO CONECTIVIDADE SQL SERVER');

  const dbConfig = {
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || 1433,
    username: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || 'sysmap_view',
    encrypt: env.DB_ENCRYPT === 'true',
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
  };

  log(`🔗 Tentando conectar em: ${dbConfig.host}:${dbConfig.port}`, 'blue');
  log(`📊 Database: ${dbConfig.database}`, 'blue');
  log(`🔐 Username: ${dbConfig.username}`, 'blue');
  log(`🔒 Encrypt: ${dbConfig.encrypt}`, 'blue');
  log(`🛡️  Trust Certificate: ${dbConfig.trustServerCertificate}`, 'blue');

  try {
    // Testar conectividade básica de rede
    const net = require('net');
    const socket = new net.Socket();
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }, 5000);

      socket.connect(dbConfig.port, dbConfig.host, () => {
        clearTimeout(timeout);
        socket.destroy();
        logSuccess(`Porta ${dbConfig.port} está acessível em ${dbConfig.host}`);
        resolve();
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Testar conexão SQL Server
    const sql = require('mssql');
    
    const config = {
      server: dbConfig.host,
      port: parseInt(dbConfig.port),
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      options: {
        encrypt: dbConfig.encrypt,
        trustServerCertificate: dbConfig.trustServerCertificate,
        connectTimeout: 15000,
        requestTimeout: 15000,
      }
    };

    const pool = await sql.connect(config);
    logSuccess('Conectado ao SQL Server!');

    // Testar query simples
    const result = await pool.request().query('SELECT @@VERSION as version');
    logSuccess(`SQL Server Version: ${result.recordset[0].version.split('\n')[0]}`);

    // Verificar se database existe
    try {
      const dbResult = await pool.request().query(`SELECT name FROM sys.databases WHERE name = '${dbConfig.database}'`);
      if (dbResult.recordset.length > 0) {
        logSuccess(`Database '${dbConfig.database}' existe`);
      } else {
        logWarning(`Database '${dbConfig.database}' não encontrada`);
        logInfo(`Crie o database com: CREATE DATABASE ${dbConfig.database};`);
      }
    } catch (error) {
      logWarning(`Não foi possível verificar database: ${error.message}`);
    }

    await pool.close();

  } catch (error) {
    logError(`Erro na conexão SQL Server: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      logInfo('💡 SOLUÇÕES:');
      logInfo('   1. Iniciar SQL Server: docker-compose up -d sqlserver');
      logInfo('   2. Verificar se SQL Server está rodando na porta 1433');
      logInfo('   3. Verificar configurações de firewall');
    } else if (error.code === 'ELOGIN') {
      logInfo('💡 SOLUÇÕES:');
      logInfo('   1. Verificar credenciais (usuário/senha)');
      logInfo('   2. Verificar se SQL Server permite autenticação');
    } else if (error.message.includes('encrypt')) {
      logInfo('💡 SOLUÇÕES:');
      logInfo('   1. Definir DB_ENCRYPT=false para desenvolvimento local');
      logInfo('   2. Definir DB_ENCRYPT=strict para Azure SQL Database');
      logInfo('   3. Verificar DB_TRUST_SERVER_CERTIFICATE=true');
    }
  }
}

// Verificar configuração de e-mail
async function checkEmailConfiguration(env) {
  logHeader('VERIFICANDO CONFIGURAÇÃO DE E-MAIL');

  const emailConfig = {
    host: env.EMAIL_HOST || 'smtp.gmail.com',
    port: env.EMAIL_PORT || 587,
    secure: env.EMAIL_SECURE === 'true',
    user: env.EMAIL_USER || '',
    pass: env.EMAIL_PASS || ''
  };

  log(`📧 Host: ${emailConfig.host}:${emailConfig.port}`, 'blue');
  log(`🔒 Secure: ${emailConfig.secure}`, 'blue');
  log(`👤 User: ${emailConfig.user || 'NÃO DEFINIDO'}`, 'blue');
  log(`🔑 Pass: ${emailConfig.pass ? '[DEFINIDO]' : '[NÃO DEFINIDO]'}`, 'blue');

  if (!emailConfig.user) {
    logWarning('EMAIL_USER não está definido');
    logInfo('Configure EMAIL_USER no arquivo .env');
    return;
  }

  if (!emailConfig.pass && emailConfig.host !== 'localhost' && emailConfig.host !== 'mailhog') {
    logWarning('EMAIL_PASS não está definido');
    logInfo('💡 CONFIGURAÇÃO DO GMAIL:');
    logInfo('   1. Acesse: https://myaccount.google.com/apppasswords');
    logInfo('   2. Gere uma senha de aplicativo');
    logInfo('   3. Use essa senha em EMAIL_PASS');
    return;
  }

  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.user && emailConfig.pass ? {
        user: emailConfig.user,
        pass: emailConfig.pass
      } : undefined
    });

    await transporter.verify();
    logSuccess('Configuração de e-mail válida!');

  } catch (error) {
    logError(`Erro na configuração de e-mail: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      logInfo('💡 SOLUÇÕES:');
      logInfo('   1. Verificar credenciais de e-mail');
      logInfo('   2. Para Gmail: usar senha de aplicativo');
      logInfo('   3. Para desenvolvimento: usar MailHog');
    } else if (error.code === 'ECONNECTION') {
      logInfo('💡 SOLUÇÕES:');
      logInfo('   1. Verificar conectividade de internet');
      logInfo('   2. Verificar configurações de proxy/firewall');
    }
  }
}

// Verificar arquivos de configuração
function checkConfigFiles() {
  logHeader('VERIFICANDO ARQUIVOS DE CONFIGURAÇÃO');

  const requiredFiles = [
    '.env',
    'src/app.module.ts',
    'src/database/database.config.ts',
    'src/main.ts'
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logSuccess(`${file} existe`);
    } else {
      logError(`${file} não encontrado`);
    }
  });

  // Verificar estrutura de pastas
  const requiredDirs = [
    'src',
    'src/auth',
    'src/users',
    'src/videos',
    'src/email',
    'src/database'
  ];

  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      logSuccess(`Diretório ${dir} existe`);
    } else {
      logError(`Diretório ${dir} não encontrado`);
    }
  });
}

// Gerar relatório de diagnóstico
function generateReport(env) {
  logHeader('RELATÓRIO DE DIAGNÓSTICO');

  log('📋 CONFIGURAÇÕES ATUAIS:', 'cyan');
  console.log('  Database:');
  console.log(`    Host: ${env.DB_HOST || 'localhost'}`);
  console.log(`    Port: ${env.DB_PORT || '1433'}`);
  console.log(`    Database: ${env.DB_DATABASE || 'sysmap_view'}`);
  console.log(`    Username: ${env.DB_USERNAME || 'sa'}`);
  console.log(`    Encrypt: ${env.DB_ENCRYPT || 'false'}`);
  
  console.log('  Email:');
  console.log(`    Host: ${env.EMAIL_HOST || 'smtp.gmail.com'}`);
  console.log(`    Port: ${env.EMAIL_PORT || '587'}`);
  console.log(`    User: ${env.EMAIL_USER || 'NÃO DEFINIDO'}`);
  
  console.log('  JWT:');
  console.log(`    Secret: ${env.JWT_SECRET ? '[DEFINIDO]' : '[NÃO DEFINIDO]'}`);

  log('\n🚀 PRÓXIMOS PASSOS:', 'magenta');
  logInfo('1. Corrija os problemas identificados acima');
  logInfo('2. Execute: npm run start:dev');
  logInfo('3. Teste a API: curl http://localhost:3001/api/v1/health');
  logInfo('4. Execute as migrations: npm run migration:run');
  logInfo('5. Execute o seed: npm run seed');
}

// Função principal
async function main() {
  log('🔍 DIAGNÓSTICO DO SYSMAP VIEW BACKEND', 'bold');
  log('=====================================', 'cyan');

  const env = loadEnvVariables();

  checkNodeDependencies();
  checkDocker();
  checkConfigFiles();
  
  await checkSqlServerConnection(env);
  await checkEmailConfiguration(env);
  
  generateReport(env);

  log('\n✅ Diagnóstico concluído!', 'green');
  log('📖 Para mais ajuda, consulte o README.md', 'blue');
}

// Executar diagnóstico
if (require.main === module) {
  main().catch(error => {
    logError(`Erro durante diagnóstico: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };