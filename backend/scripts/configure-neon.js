#!/usr/bin/env node

/**
 * Script para configurar o banco Neon no desenvolvimento
 * 
 * Este script ajuda a:
 * 1. Configurar a DATABASE_URL no arquivo .env
 * 2. Comentar/descomentar as configurações apropriadas
 * 3. Testar a conexão
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_PATH = path.join(__dirname, '..', '.env');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('🚀 Configurador do Banco Neon\n');
    
    // Verificar se .env existe
    if (!fs.existsSync(ENV_PATH)) {
        console.log('❌ Arquivo .env não encontrado!');
        console.log('📝 Criando arquivo .env baseado no .env.example...\n');
        
        const examplePath = path.join(__dirname, '..', '.env.example');
        if (fs.existsSync(examplePath)) {
            fs.copyFileSync(examplePath, ENV_PATH);
            console.log('✅ Arquivo .env criado!\n');
        } else {
            console.log('❌ Arquivo .env.example não encontrado!');
            process.exit(1);
        }
    }
    
    const choice = await question(
        '🔧 O que você deseja fazer?\n' +
        '1. Configurar Neon (recomendado)\n' +
        '2. Voltar para banco local\n' +
        '3. Apenas testar conexão atual\n' +
        'Escolha (1-3): '
    );
    
    switch (choice.trim()) {
        case '1':
            await configureNeon();
            break;
        case '2':
            await configureLocal();
            break;
        case '3':
            await testConnection();
            break;
        default:
            console.log('❌ Opção inválida!');
            process.exit(1);
    }
    
    rl.close();
}

async function configureNeon() {
    console.log('\n🌐 Configurando Neon...\n');
    
    const connectionString = await question(
        '📝 Cole sua connection string do Neon:\n' +
        '(Exemplo: postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/db?sslmode=require)\n' +
        'Connection string: '
    );
    
    if (!connectionString.trim()) {
        console.log('❌ Connection string não pode estar vazia!');
        process.exit(1);
    }
    
    // Ler arquivo .env atual
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    
    // Configurar DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
        // Substituir linha existente
        envContent = envContent.replace(
            /^#?\s*DATABASE_URL=.*$/m,
            `DATABASE_URL=${connectionString}`
        );
    } else {
        // Adicionar nova linha
        envContent = `DATABASE_URL=${connectionString}\n` + envContent;
    }
    
    // Comentar configurações locais
    envContent = envContent.replace(/^(DB_USER=)/gm, '# $1');
    envContent = envContent.replace(/^(DB_HOST=)/gm, '# $1');
    envContent = envContent.replace(/^(DB_NAME=)/gm, '# $1');
    envContent = envContent.replace(/^(DB_PASSWORD=)/gm, '# $1');
    envContent = envContent.replace(/^(DB_PORT=)/gm, '# $1');
    envContent = envContent.replace(/^(DB_SSL=)/gm, '# $1');
    
    // Salvar arquivo
    fs.writeFileSync(ENV_PATH, envContent);
    
    console.log('✅ Configuração do Neon salva no arquivo .env!');
    console.log('🔄 Reinicie o servidor para aplicar as mudanças.\n');
    
    await testConnection();
}

async function configureLocal() {
    console.log('\n🏠 Configurando banco local...\n');
    
    // Ler arquivo .env atual
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    
    // Comentar DATABASE_URL
    envContent = envContent.replace(/^(DATABASE_URL=)/gm, '# $1');
    
    // Descomentar configurações locais
    envContent = envContent.replace(/^#\s*(DB_USER=)/gm, '$1');
    envContent = envContent.replace(/^#\s*(DB_HOST=)/gm, '$1');
    envContent = envContent.replace(/^#\s*(DB_NAME=)/gm, '$1');
    envContent = envContent.replace(/^#\s*(DB_PASSWORD=)/gm, '$1');
    envContent = envContent.replace(/^#\s*(DB_PORT=)/gm, '$1');
    envContent = envContent.replace(/^#\s*(DB_SSL=)/gm, '$1');
    
    // Salvar arquivo
    fs.writeFileSync(ENV_PATH, envContent);
    
    console.log('✅ Configuração local ativada no arquivo .env!');
    console.log('🔄 Reinicie o servidor para aplicar as mudanças.');
    console.log('⚠️  Certifique-se de que o PostgreSQL local está rodando.\n');
    
    await testConnection();
}

async function testConnection() {
    console.log('🔍 Testando conexão...\n');
    
    try {
        // Carregar variáveis de ambiente
        require('dotenv').config({ path: ENV_PATH });
        
        // Importar e testar database
        const db = require('../src/database.ts');
        const success = await db.testConnection();
        
        if (success) {
            console.log('✅ Conexão com banco estabelecida com sucesso!');
        } else {
            console.log('❌ Falha na conexão com o banco.');
        }
    } catch (error) {
        console.log('❌ Erro ao testar conexão:', error.message);
    }
}

// Executar script
main().catch(console.error);