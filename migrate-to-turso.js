import { createClient } from '@libsql/client';
import fs from 'fs';

// Lê as variáveis do arquivo .env
function loadEnv() {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    });
  } catch(e) {}
}
loadEnv();

const remoteUrl = process.env.DATABASE_URL;
const remoteAuthToken = process.env.DATABASE_AUTH_TOKEN;

if (!remoteUrl || !remoteUrl.startsWith('libsql://')) {
    console.error("ERRO: DATABASE_URL remota não encontrada no .env!");
    process.exit(1);
}

// Cria cliente para banco de dados local (arquivo)
const localClient = createClient({ url: 'file:./data/cms.db' });

// Cria cliente para banco de dados remoto (Turso)
const remoteClient = createClient({ url: remoteUrl, authToken: remoteAuthToken });

const tables = ['content', 'pages', 'page_content', 'users', 'images', 'content_backups', 'contact_messages', 'blog_posts'];

async function migrateData() {
    console.log("Iniciando migração de dados do SQLite Local para o Turso...");
    
    for (const table of tables) {
        console.log(`\nMigrando tabela: ${table}...`);
        try {
            // Busca os dados na tabela local
            const result = await localClient.execute(`SELECT * FROM ${table}`);
            
            if (result.rows.length === 0) {
                console.log(`  └ Tabela vazia no banco local. Nenhuma ação necessária.`);
                continue;
            }

            const columns = result.columns;
            const placeholders = columns.map(() => '?').join(', ');
            const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

            let count = 0;
            // Insere cada linha no banco remoto
            for (const row of result.rows) {
                const values = columns.map(col => row[col]);
                await remoteClient.execute({ sql, args: values });
                count++;
            }
            
            console.log(`  └ Migrados ${count} registros com sucesso!`);
        } catch (err) {
            console.error(`  └ ERRO na tabela ${table}:`, err.message);
        }
    }
    
    console.log("\n✅ Migração concluída com sucesso! Seu Turso agora tem os dados locais.");
}

migrateData();
