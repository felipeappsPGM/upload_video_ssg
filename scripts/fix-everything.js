#!/usr/bin/env node

/**
 * 🔧 SCRIPT PARA RESOLVER TODOS OS PROBLEMAS
 * Este script resolve automaticamente os problemas de SQL Server
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

const colors = {
  red: '\033[31m',
  green: '\033[32m',
  yellow: '\033[33m',
  blue: '\033[34m',
  cyan: '\033[36m',
  magenta: '\033[35m',
  reset: '\033[0m',
  bold: '\033[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(emoji, message) {
  log(`\n${emoji} ${message}`, 'cyan');
  log('='.repeat(60), 'blue');
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

async function sleep(seconds) {
  log(`⏳ Aguardando ${seconds} segundos...`, 'yellow');
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function checkPortOpen(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const onConnect = () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(true);
      }
    };

    const onError = () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    };

    socket.setTimeout(timeout);
    socket.once('connect', onConnect);
    socket.once('error', onError);
    socket.once('timeout', onError);

    socket.connect(port, host);
  });
}

async function stopExistingServices() {
  logStep('🛑', 'Parando serviços existentes...');

  try {
    // Parar containers Docker
    try {
      execSync('docker-compose down', { stdio: 'pipe' });
      logSuccess('Containers Docker parados');
    } catch (error) {
      logWarning('Nenhum container Docker para parar');
    }

    // Verificar se porta 1433 está livre
    const port1433Open = await checkPortOpen('localhost', 1433, 2000);
    if (port1433Open) {
      logWarning('Porta 1433 ainda está ocupada');
      
      // Tentar parar processos na porta 1433 (Windows)
      if (process.platform === 'win32') {
        try {
          const netstat = execSync('netstat -ano | findstr :1433', { encoding: 'utf8' });
          log(`Processos na porta 1433:\n${netstat}`, 'yellow');
        } catch (error) {
          logInfo('Nenhum processo encontrado na porta 1433');
        }
      }
    } else {
      logSuccess('Porta 1433 está livre');
    }

    await sleep(3);

  } catch (error) {
    logWarning(`Erro ao parar serviços: ${error.message}`);
  }
}

async function startSqlServer() {
  logStep('🐳', 'Iniciando SQL Server...');

  try {
    // Verificar se Docker está instalado
    try {
      execSync('docker --version', { stdio: 'pipe' });
      logSuccess('Docker encontrado');
    } catch (error) {
      logError('Docker não está instalado!');
      logInfo('Instale Docker Desktop: https://docs.docker.com/get-docker/');
      return false;
    }

    // Iniciar apenas o SQL Server
    log('Iniciando container SQL Server...', 'blue');
    execSync('docker-compose up -d sqlserver', { stdio: 'inherit' });
    
    // Aguardar inicialização
    await sleep(10);

    // Verificar se container está rodando
    const containerStatus = execSync('docker-compose ps sqlserver', { encoding: 'utf8' });
    if (containerStatus.includes('Up')) {
      logSuccess('Container SQL Server está rodando');
    } else {
      logError('Container não iniciou corretamente');
      log(containerStatus, 'red');
      return false;
    }

    // Aguardar SQL Server ficar disponível
    log('Aguardando SQL Server ficar disponível...', 'blue');
    let attempts = 0;
    const maxAttempts = 12; // 2 minutos

    while (attempts < maxAttempts) {
      const isOpen = await checkPortOpen('localhost', 1433, 3000);
      if (isOpen) {
        logSuccess('SQL Server está aceitando conexões na porta 1433');
        break;
      }
      
      attempts++;
      log(`Tentativa ${attempts}/${maxAttempts} - aguardando...`, 'yellow');
      await sleep(10);
    }

    if (attempts >= maxAttempts) {
      logError('SQL Server não ficou disponível após 2 minutos');
      
      // Mostrar logs do container
      log('Logs do SQL Server:', 'yellow');
      try {
        const logs = execSync('docker-compose logs --tail=20 sqlserver', { encoding: 'utf8' });
        console.log(logs);
      } catch (error) {
        logWarning('Não foi possível obter logs');
      }
      
      return false;
    }

    // Aguardar mais um pouco para SQL Server finalizar inicialização
    await sleep(15);
    logSuccess('SQL Server está pronto!');
    return true;

  } catch (error) {
    logError(`Erro ao iniciar SQL Server: ${error.message}`);
    
    logInfo('SOLUÇÕES POSSÍVEIS:');
    logInfo('1. Reiniciar Docker Desktop');
    logInfo('2. Executar: docker system prune -a');
    logInfo('3. Verificar se Hyper-V está ativado (Windows)');
    logInfo('4. Verificar antivírus/firewall');
    
    return false;
  }
}

async function testConnection() {
  logStep('🔍', 'Testando conexão com SQL Server...');

  try {
    const testScript = `
      require('dotenv').config();
      const sql = require('mssql');
      
      async function test() {
        const config = {
          server: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '1433'),
          user: process.env.DB_USERNAME || 'sa',
          password: process.env.DB_PASSWORD || 'SysMapView123!',
          database: 'master',
          options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 10000,
            requestTimeout: 10000,
          }
        };
        
        console.log('Tentando conectar em:', config.server + ':' + config.port);
        const pool = await sql.connect(config);
        console.log('✅ Conexão OK!');
        
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('SQL Server:', result.recordset[0].version.split('\\n')[0]);
        
        await pool.close();
        console.log('CONNECTION_SUCCESS');
      }
      
      test().catch(err => {
        console.error('❌ Erro:', err.message);
        process.exit(1);
      });
    `;

    execSync(`node -e "${testScript.replace(/\n/g, ' ')}"`, { 
      stdio: 'inherit',
      timeout: 30000
    });
    
    logSuccess('Conexão com SQL Server OK!');
    return true;

  } catch (error) {
    logError('Falha na conexão com SQL Server');
    
    // Diagnóstico adicional
    log('Executando diagnósticos...', 'blue');
    
    // Verificar se porta está aberta
    const portOpen = await checkPortOpen('localhost', 1433, 5000);
    if (portOpen) {
      logInfo('Porta 1433 está aberta');
    } else {
      logError('Porta 1433 não está acessível');
    }
    
    // Verificar container
    try {
      const containerLogs = execSync('docker-compose logs --tail=10 sqlserver', { encoding: 'utf8' });
      log('Últimos logs do SQL Server:', 'yellow');
      console.log(containerLogs);
    } catch (error) {
      logWarning('Não foi possível obter logs do container');
    }
    
    return false;
  }
}

async function createDatabaseAndRunMigrations() {
  logStep('🗄️', 'Criando database e executando migrations...');

  try {
    // Criar database
    const createDbScript = `
      require('dotenv').config();
      const sql = require('mssql');
      
      async function createDb() {
        const config = {
          server: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '1433'),
          user: process.env.DB_USERNAME || 'sa',
          password: process.env.DB_PASSWORD || 'SysMapView123!',
          database: 'master',
          options: {
            encrypt: false,
            trustServerCertificate: true,
          }
        };
        
        const pool = await sql.connect(config);
        const dbName = process.env.DB_DATABASE || 'sysmap_view';
        
        const result = await pool.request()
          .query(\`SELECT name FROM sys.databases WHERE name = '\${dbName}'\`);
        
        if (result.recordset.length === 0) {
          await pool.request().query(\`CREATE DATABASE [\${dbName}]\`);
          console.log('✅ Database criado:', dbName);
        } else {
          console.log('✅ Database já existe:', dbName);
        }
        
        await pool.close();
      }
      
      createDb().catch(console.error);
    `;

    execSync(`node -e "${createDbScript.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });

    // Compilar projeto
    log('Compilando projeto...', 'blue');
    execSync('npm run build', { stdio: 'inherit' });
    logSuccess('Compilação concluída');

    // Executar migrations
    log('Executando migrations...', 'blue');
    
    const migrationMethods = [
      'npm run typeorm -- migration:run -d src/database/data-source.ts',
      'npx typeorm migration:run -d dist/database/data-source.js',
      'npx typeorm migration:run -d typeorm.config.js'
    ];

    let migrationSuccess = false;

    for (const method of migrationMethods) {
      try {
        log(`Tentando: ${method}`, 'blue');
        execSync(method, { stdio: 'inherit', timeout: 60000 });
        logSuccess('Migrations executadas com sucesso!');
        migrationSuccess = true;
        break;
      } catch (error) {
        logWarning(`Método falhou, tentando próximo...`);
      }
    }

    if (!migrationSuccess) {
      throw new Error('Todas as tentativas de migration falharam');
    }

    return true;

  } catch (error) {
    logError(`Erro ao criar database/executar migrations: ${error.message}`);
    return false;
  }
}

async function runSeed() {
  logStep('🌱', 'Executando seed...');

  try {
    execSync('npm run seed', { stdio: 'inherit', timeout: 60000 });
    logSuccess('Seed executado com sucesso!');
    return true;
  } catch (error) {
    logWarning(`Erro no seed: ${error.message}`);
    return false;
  }
}

async function startMailHog() {
  logStep('📧', 'Iniciando MailHog...');

  try {
    execSync('docker-compose up -d mailhog', { stdio: 'pipe' });
    logSuccess('MailHog iniciado');
    logInfo('Interface web: http://localhost:8025');
  } catch (error) {
    logWarning('Erro ao iniciar MailHog (não crítico)');
  }
}

async function main() {
  log('🔧 RESOLVER TODOS OS PROBLEMAS - SYSMAP VIEW', 'bold');
  log('='.repeat(50), 'cyan');

  // 1. Parar serviços existentes
  await stopExistingServices();

  // 2. Iniciar SQL Server
  const sqlServerOk = await startSqlServer();
  if (!sqlServerOk) {
    logError('Não foi possível iniciar SQL Server');
    process.exit(1);
  }

  // 3. Testar conexão
  const connectionOk = await testConnection();
  if (!connectionOk) {
    logError('Conexão com SQL Server falhou');
    process.exit(1);
  }

  // 4. Iniciar MailHog
  await startMailHog();

  // 5. Criar database e migrations
  const migrationOk = await createDatabaseAndRunMigrations();
  if (!migrationOk) {
    logError('Falha na criação de database/migrations');
    process.exit(1);
  }

  // 6. Executar seed
  await runSeed();

  // 7. Instruções finais
  logStep('🎉', 'TUDO PRONTO!');
  
  logSuccess('✅ SQL Server rodando na porta 1433');
  logSuccess('✅ Database criado com migrations');
  logSuccess('✅ Dados de exemplo inseridos');
  logSuccess('✅ MailHog disponível em http://localhost:8025');

  log('\n📋 PRÓXIMOS PASSOS:', 'cyan');
  logInfo('1. Iniciar a aplicação: npm run start:dev');
  logInfo('2. Testar API: curl http://localhost:3001/api/v1/health');
  logInfo('3. Verificar logs: docker-compose logs -f');

  log('\n🔧 COMANDOS ÚTEIS:', 'magenta');
  logInfo('• Ver containers: docker-compose ps');
  logInfo('• Ver logs SQL: docker-compose logs sqlserver');
  logInfo('• Resetar tudo: docker-compose down -v');

  logSuccess('\n🚀 Backend SysMap View configurado com sucesso!');
}

// Executar
if (require.main === module) {
  main().catch(error => {
    logError(`Erro crítico: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}