import { createClient } from '@libsql/client';
import fs from 'fs';

// Função auxiliar para ler o .env manualmente, caso o usuário não use o node --env-file
function loadEnv() {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.warn("Aviso: Arquivo .env não encontrado. Certifique-se de criá-lo!");
  }
}

loadEnv();

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url || !url.startsWith('libsql://')) {
  console.error("❌ ERRO: DATABASE_URL não configurada no .env ou não é uma URL do Turso (libsql://...).");
  process.exit(1);
}

if (!authToken) {
  console.error("❌ ERRO: DATABASE_AUTH_TOKEN não configurada no .env.");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function setupDatabase() {
  console.log(`🔌 Conectando ao Turso em: ${url}...`);
  
  try {
    const schema = fs.readFileSync('schema.sql', 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');

    console.log("⏳ Criando tabelas...");
    
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    
    console.log("✅ Banco de dados criado e configurado com sucesso no Turso!");
  } catch (error) {
    console.error("❌ Ocorreu um erro ao criar as tabelas:", error);
  }
}

setupDatabase();
