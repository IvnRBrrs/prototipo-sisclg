import { createClient } from '@tursodatabase/serverless/compat'
import bcrypt from 'bcryptjs'

export function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL environment variable is required')
  const isTurso = url.startsWith('libsql://')
  console.log('[api/db.js] URL:', url.slice(0, 30) + '...', 'isTurso:', isTurso, 'hasToken:', !!process.env.DATABASE_AUTH_TOKEN)

  const client = createClient({
    url,
    ...(isTurso && process.env.DATABASE_AUTH_TOKEN
      ? { authToken: process.env.DATABASE_AUTH_TOKEN }
      : {}),
  })
  console.log('[api/db.js] Client created successfully')
  return client
}

let _initPromise = null

function parseSerieFromNome(text) {
  const t = String(text || '')
  let m = t.match(/(\d{1,2})\s*[º°]\s*Ano/i)
  if (m) return `${m[1]}º ano`
  m = t.match(/(\d{1,2})\s*[ªa]\s*s[eé]rie/i)
  if (m) return `${m[1]}ª série`
  m = t.match(/(\d{1,2})\s*[º°]/)
  if (m) return `${m[1]}º`
  return ''
}

export async function initDb(db) {
  console.log('[db.js] initDb called, _initPromise:', !!_initPromise)
  if (_initPromise) return _initPromise

  const tables = [
    `CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS pages (
      slug TEXT PRIMARY KEY, title TEXT NOT NULL,
      show_in_menu INTEGER DEFAULT 1, parent_slug TEXT,
      menu_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_slug) REFERENCES pages(slug))`,
    `CREATE TABLE IF NOT EXISTS page_content (
      page_slug TEXT NOT NULL, key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (page_slug, key),
      FOREIGN KEY (page_slug) REFERENCES pages(slug))`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY, filename TEXT NOT NULL,
      data TEXT NOT NULL, type TEXT NOT NULL,
      component_type TEXT,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS content_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT NOT NULL, value TEXT NOT NULL,
      version INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS historico_alunos (
      id TEXT PRIMARY KEY,
      aluno_nome TEXT NOT NULL,
      data TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS alunos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL DEFAULT '',
      sexo TEXT DEFAULT '',
      escolaridade TEXT DEFAULT '',
      turma TEXT DEFAULT '',
      data_nascimento TEXT DEFAULT '',
      cpf TEXT DEFAULT '',
      telefone TEXT DEFAULT '',
      nome_pai TEXT DEFAULT '',
      nome_mae TEXT DEFAULT '',
      telefone_pais TEXT DEFAULT '',
      responsavel_financeiro TEXT DEFAULT '',
      cpf_responsavel TEXT DEFAULT '',
      endereco TEXT DEFAULT '',
      telefone_contato TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS aluno_anexos (
      id TEXT PRIMARY KEY,
      aluno_id TEXT NOT NULL,
      categoria TEXT NOT NULL,
      filename TEXT NOT NULL,
      data TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY, title TEXT NOT NULL,
      subtitle TEXT DEFAULT '', content TEXT NOT NULL DEFAULT '',
      author TEXT DEFAULT '', date TEXT NOT NULL,
      tags TEXT DEFAULT '[]', images TEXT DEFAULT '[]',
      videos TEXT DEFAULT '[]', slug TEXT UNIQUE,
      published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS pre_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      responsavel TEXT NOT NULL,
      nome_aluno TEXT NOT NULL,
      idade TEXT DEFAULT '',
      ano_letivo_atual TEXT DEFAULT '',
      serie_desejada TEXT DEFAULT '',
      telefone TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      email TEXT NOT NULL,
      mensagem TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS login_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      login_time TEXT DEFAULT (datetime('now')),
      ip TEXT DEFAULT '')`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')))`,
  ]

  console.log('[db.js] Creating tables in batch...')
  _initPromise = (async () => {
    for (const sql of tables) await db.execute(sql)
  })()
  try {
    await _initPromise
    console.log('[db.js] All CREATE TABLEs done')
  } catch (e) {
    console.error('[db.js] CREATE TABLEs FAILED:', e.message)
    _initPromise = null
    throw e
  }

  let migrationComplete = false
  try {
    const versionCheck = await db.execute(`SELECT value FROM content WHERE key = '_migration_version'`)
    migrationComplete = versionCheck.rows.length > 0
  } catch {}

  if (!migrationComplete) {
    const tableInfo = await db.execute('PRAGMA table_info(users)')
    const existingColumns = tableInfo.rows.map((r) => r.name)

    if (!existingColumns.includes('role')) {
      await db.execute(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'super_admin'`)
      console.log('[db.js] Role column added')
    }

    if (!existingColumns.includes('email')) {
      await db.execute(`ALTER TABLE users ADD COLUMN email TEXT`)
      console.log('[db.js] Email column added')
    }

    if (!existingColumns.includes('must_change_password')) {
      await db.execute(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0`)
      console.log('[db.js] must_change_password column added')
    }

    await db.execute(`UPDATE users SET email = username || '@colegiostjm.com.br' WHERE email IS NULL OR email = ''`)
    console.log('[db.js] Emails seeded')

    await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_content_version', '1')`)
    console.log('[db.js] _content_version OK')

    const r1 = await db.execute(`UPDATE pages SET slug = TRIM(slug, '/') WHERE slug LIKE '/%' OR slug LIKE '%/'`)
    const r2 = await db.execute(`UPDATE page_content SET page_slug = TRIM(page_slug, '/') WHERE page_slug LIKE '/%' OR page_slug LIKE '%/'`)
    const affected = (r1.rowsAffected || 0) + (r2.rowsAffected || 0)
    if (affected > 0) {
      await db.execute(`UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version'`)
    }
    console.log('[db.js] Slugs trimmed, affected:', affected)

    const navResult = await db.execute(`SELECT value FROM content WHERE key = '_nav_items'`)
    if (navResult.rows.length > 0) {
      const raw = navResult.rows[0].value
      let items = []
      try { items = JSON.parse(raw) } catch {}
      let changed = false
      items.forEach((item) => {
        if (item.label === 'Contato') { item.label = 'Login'; item.href = '/admin/login'; changed = true }
      })
      if (changed) {
        await db.execute({ sql: `UPDATE content SET value = ? WHERE key = '_nav_items'`, args: [JSON.stringify(items)] })
        await db.execute(`UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version'`)
        console.log('[db.js] Nav Contato → Login updated, version bumped')
      } else {
        console.log('[db.js] Nav already has Login, skipping')
      }
    }

    await db.execute(`INSERT OR IGNORE INTO pages (slug, title) VALUES ('home', 'Home')`)
    const homeSections = JSON.stringify([
      { title: 'Hero', instanceId: 'hero' },
      { title: 'Sobre', instanceId: 'sobre' },
      { title: 'Segmentos', instanceId: 'segmentos' },
      { title: 'Galeria', instanceId: 'galeria' },
      { title: 'Depoimentos', instanceId: 'depoimentos' },
      { title: 'FAQ', instanceId: 'faq' },
      { title: 'Contato', instanceId: 'contato' },
      { title: 'Mapa', instanceId: 'mapa' },
      { title: 'Blog', instanceId: 'blog' },
    ])
    await db.execute({
      sql: `INSERT OR IGNORE INTO page_content (page_slug, key, value) VALUES ('home', '_sections', ?)`,
      args: [homeSections],
    })
    console.log('[db.js] Home page _sections seeded OK')

    const testUsers = [
      { username: 'super_admin', password: 'admin123', role: 'super_admin', email: 'admin@colegiostjm.com.br' },
      { username: 'editor_admin', password: 'editor123', role: 'editor_admin', email: 'editor@colegiostjm.com.br' },
      { username: 'editor_blog', password: 'blog123', role: 'editor_blog', email: 'blog@colegiostjm.com.br' },
      { username: 'gestor_admin', password: 'gestor123', role: 'gestor_admin', email: 'gestor@colegiostjm.com.br' },
    ]
    for (const u of testUsers) {
      const existing = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [u.username] })
      if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(u.password, 10)
        await db.execute({
          sql: 'INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)',
          args: [u.username, hash, u.role, u.email],
        })
        console.log('[db.js] User created:', u.username, 'role:', u.role)
      }
    }
    console.log('[db.js] Test users seeding complete')

    await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_version', '1')`)
    console.log('[db.js] Migration marked complete')
  }

  // V2 migration: add ano_letivo_atual and turma_atual columns to alunos
  try {
    const v2Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v2'`)
    if (v2Check.rows.length === 0) {
      const alunosInfo = await db.execute('PRAGMA table_info(alunos)')
      const alunosCols = alunosInfo.rows.map((r) => r.name)
      if (!alunosCols.includes('ano_letivo_atual')) {
        await db.execute(`ALTER TABLE alunos ADD COLUMN ano_letivo_atual TEXT DEFAULT ''`)
        console.log('[db.js] ano_letivo_atual column added')
      }
      if (!alunosCols.includes('turma_atual')) {
        await db.execute(`ALTER TABLE alunos ADD COLUMN turma_atual TEXT DEFAULT ''`)
        console.log('[db.js] turma_atual column added')
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v2', '1')`)
      console.log('[db.js] Migration V2 complete')
    }
  } catch (e) {
    console.error('[db.js] Migration V2 FAILED:', e.message)
  }

  // Thumbnails migration: add thumbnail column to images
  try {
    const thumbCheck = await db.execute(`SELECT value FROM content WHERE key = '_migration_thumbnails'`)
    if (thumbCheck.rows.length === 0) {
      const imgInfo = await db.execute('PRAGMA table_info(images)')
      const imgCols = imgInfo.rows.map((r) => r.name)
      if (!imgCols.includes('thumbnail')) {
        await db.execute(`ALTER TABLE images ADD COLUMN thumbnail TEXT`)
        console.log('[db.js] thumbnail column added')
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_thumbnails', '1')`)
      console.log('[db.js] Thumbnail migration complete')
    }
  } catch (e) {
    console.error('[db.js] Thumbnail migration FAILED:', e.message)
  }

  // Messages table migration: add archived column if missing
  try {
    const msgInfo = await db.execute('PRAGMA table_info(contact_messages)')
    if (msgInfo.rows.length > 0) {
      const msgCols = msgInfo.rows.map((r) => r.name)
      if (!msgCols.includes('archived')) {
        await db.execute(`ALTER TABLE contact_messages ADD COLUMN archived INTEGER DEFAULT 0`)
        console.log('[db.js] archived column added to contact_messages')
      }
    }
  } catch (e) {
    console.error('[db.js] Messages migration FAILED:', e.message)
  }

  // Pre-enrollments migration: add source column if missing
  try {
    const preInfo = await db.execute('PRAGMA table_info(pre_enrollments)')
    if (preInfo.rows.length > 0) {
      const preCols = preInfo.rows.map((r) => r.name)
      if (!preCols.includes('source')) {
        await db.execute(`ALTER TABLE pre_enrollments ADD COLUMN source TEXT NOT NULL DEFAULT 'cliente'`)
        console.log('[db.js] source column added to pre_enrollments')
      }
      if (!preCols.includes('serie_desejada')) {
        await db.execute(`ALTER TABLE pre_enrollments ADD COLUMN serie_desejada TEXT DEFAULT ''`)
        console.log('[db.js] serie_desejada column added to pre_enrollments')
      }
    }
  } catch (e) {
    console.error('[db.js] Pre-enrollments migration FAILED:', e.message)
  }

  // V3 migration: add naturalidade and disciplinas columns to alunos
  try {
    const v3Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v3'`)
    if (v3Check.rows.length === 0) {
      const alunosInfo = await db.execute('PRAGMA table_info(alunos)')
      const alunosCols = alunosInfo.rows.map((r) => r.name)
      if (!alunosCols.includes('naturalidade')) {
        await db.execute(`ALTER TABLE alunos ADD COLUMN naturalidade TEXT DEFAULT ''`)
        console.log('[db.js] naturalidade column added')
      }
      if (!alunosCols.includes('disciplinas')) {
        await db.execute(`ALTER TABLE alunos ADD COLUMN disciplinas TEXT DEFAULT ''`)
        console.log('[db.js] disciplinas column added')
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v3', '1')`)
      console.log('[db.js] Migration V3 complete')
    }
  } catch (e) {
    console.error('[db.js] Migration V3 FAILED:', e.message)
  }

  // V4 migration: add periodo column to alunos
  try {
    const v4Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v4'`)
    if (v4Check.rows.length === 0) {
      const alunosInfo = await db.execute('PRAGMA table_info(alunos)')
      const alunosCols = alunosInfo.rows.map((r) => r.name)
      if (!alunosCols.includes('periodo')) {
        await db.execute(`ALTER TABLE alunos ADD COLUMN periodo TEXT DEFAULT ''`)
        console.log('[db.js] periodo column added')
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v4', '1')`)
      console.log('[db.js] Migration V4 complete')
    }
  } catch (e) {
    console.error('[db.js] Migration V4 FAILED:', e.message)
  }

  // V5 migration: add carga_horaria column to alunos
  try {
    const v5Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v5'`)
    if (v5Check.rows.length === 0) {
      const alunosInfo = await db.execute('PRAGMA table_info(alunos)')
      const alunosCols = alunosInfo.rows.map((r) => r.name)
      if (!alunosCols.includes('carga_horaria')) {
        await db.execute(`ALTER TABLE alunos ADD COLUMN carga_horaria TEXT DEFAULT ''`)
        console.log('[db.js] carga_horaria column added')
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v5', '1')`)
      console.log('[db.js] Migration V5 complete')
    }
  } catch (e) {
    console.error('[db.js] Migration V5 FAILED:', e.message)
  }

  // V6 migration: add organizations table and company_id to all tables
  try {
    const v6Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v6'`)
    if (v6Check.rows.length === 0) {
      await db.execute(`INSERT OR IGNORE INTO organizations (id, nome, slug) VALUES ('default', 'Colégio São Judas Tadeu', 'colegio-sao-judas-tadeu')`)
      console.log('[db.js] Default organization inserted')

      const tablesForCompany = ['content', 'pages', 'page_content', 'users', 'images', 'content_backups', 'historico_alunos', 'alunos', 'aluno_anexos', 'blog_posts', 'contact_messages', 'pre_enrollments', 'login_log']
      for (const tableName of tablesForCompany) {
        const tableInfo = await db.execute(`PRAGMA table_info(${tableName})`)
        const cols = tableInfo.rows.map((r) => r.name)
        if (!cols.includes('company_id')) {
          await db.execute(`ALTER TABLE ${tableName} ADD COLUMN company_id TEXT DEFAULT 'default'`)
          console.log(`[db.js] company_id column added to ${tableName}`)
        }
      }
      await db.execute(`UPDATE users SET company_id = 'default' WHERE company_id IS NULL OR company_id = ''`)
      console.log('[db.js] company_id set for existing users')

      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v6', '1')`)
      console.log('[db.js] Migration V6 complete')
    }
  } catch (e) {
    console.error('[db.js] Migration V6 FAILED:', e.message)
  }

  // V7 migration: academic core (turmas, professores, disciplinas, enturmação,
  // matrículas, notas, frequência, ocorrências, anos letivos, mensalidades)
  try {
    const v7Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v7'`)
    if (v7Check.rows.length === 0) {
      const v7Tables = [
        `CREATE TABLE IF NOT EXISTS turmas (
          id TEXT PRIMARY KEY, nome TEXT NOT NULL, serie TEXT DEFAULT '',
          periodo TEXT DEFAULT '', sala TEXT DEFAULT '', ano_letivo TEXT DEFAULT '',
          professor_responsavel_id TEXT DEFAULT '', status TEXT DEFAULT 'ativa',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS professores (
          id TEXT PRIMARY KEY, nome TEXT NOT NULL, email TEXT DEFAULT '',
          telefone TEXT DEFAULT '', cpf TEXT DEFAULT '', especialidade TEXT DEFAULT '',
          status TEXT DEFAULT 'ativo',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS disciplinas (
          id TEXT PRIMARY KEY, nome TEXT NOT NULL, abreviatura TEXT DEFAULT '',
          carga_horaria TEXT DEFAULT '',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS turma_disciplinas (
          id TEXT PRIMARY KEY, turma_id TEXT NOT NULL, disciplina_id TEXT NOT NULL,
          professor_id TEXT DEFAULT '',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS aluno_turmas (
          id TEXT PRIMARY KEY, aluno_id TEXT NOT NULL, turma_id TEXT NOT NULL,
          ano_letivo TEXT DEFAULT '', status TEXT DEFAULT 'ativo',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS matriculas (
          id TEXT PRIMARY KEY, aluno_id TEXT NOT NULL, turma_id TEXT DEFAULT '',
          ano_letivo TEXT DEFAULT '', numero TEXT DEFAULT '', codigo_acesso TEXT DEFAULT '',
          data_matricula TEXT DEFAULT '', status TEXT DEFAULT 'matriculado',
          origem TEXT DEFAULT 'cliente',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS notas (
          id TEXT PRIMARY KEY, aluno_id TEXT NOT NULL, disciplina_id TEXT NOT NULL,
          turma_id TEXT DEFAULT '', ano_letivo TEXT DEFAULT '',
          bimestre INTEGER DEFAULT 1, nota TEXT DEFAULT '', faltas INTEGER DEFAULT 0,
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS frequencia (
          id TEXT PRIMARY KEY, aluno_id TEXT NOT NULL, turma_id TEXT NOT NULL,
          data TEXT NOT NULL, disciplina_id TEXT DEFAULT '', status TEXT DEFAULT 'presente',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS ocorrencias (
          id TEXT PRIMARY KEY, aluno_id TEXT NOT NULL, data TEXT DEFAULT (datetime('now')),
          tipo TEXT DEFAULT '', descricao TEXT NOT NULL, responsavel_id TEXT DEFAULT '',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS anos_letivos (
          id TEXT PRIMARY KEY, ano TEXT NOT NULL, inicio TEXT DEFAULT '', fim TEXT DEFAULT '',
          status TEXT DEFAULT 'ativo',
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS mensalidades (
          id TEXT PRIMARY KEY, aluno_id TEXT NOT NULL, matricula_id TEXT DEFAULT '',
          descricao TEXT DEFAULT '', vencimento TEXT DEFAULT '', valor TEXT DEFAULT '',
          status TEXT DEFAULT 'pendente', data_pagamento TEXT DEFAULT '',
          forma_pagamento TEXT DEFAULT '', parcela INTEGER DEFAULT 0,
          company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`,
      ]
      for (const sql of v7Tables) await db.execute(sql)
      console.log('[db.js] V7 tables created')

      const currentYear = String(new Date().getFullYear())
      await db.execute({
        sql: 'INSERT OR IGNORE INTO anos_letivos (id, ano, status, company_id) VALUES (?, ?, ?, ?)',
        args: [currentYear, currentYear, 'ativo', 'default'],
      })
      console.log('[db.js] V7 ano letivo corrente seeded:', currentYear)

      const discRows = await db.execute('SELECT disciplinas, company_id FROM alunos')
      const discSeen = new Set()
      for (const r of discRows.rows) {
        const raw = String(r.disciplinas || '').trim()
        if (!raw) continue
        let names = []
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) names = parsed.map((d) => typeof d === 'string' ? d : (d && d.nome) || '').filter(Boolean)
        } catch {
          names = raw.split(',').map((s) => s.trim()).filter(Boolean)
        }
        const company = String(r.company_id || 'default')
        for (const name of names) {
          const key = name.toUpperCase() + '|' + company
          if (discSeen.has(key)) continue
          discSeen.add(key)
          await db.execute({
            sql: 'INSERT INTO disciplinas (id, nome, company_id) VALUES (?, ?, ?)',
            args: [crypto.randomUUID(), name, company],
          })
        }
      }
      if (discSeen.size > 0) console.log('[db.js] V7 disciplinas seeded from legacy alunos:', discSeen.size)

      const alRows = await db.execute('SELECT id, turma, turma_atual, ano_letivo_atual, company_id FROM alunos')
      const turmaSeen = new Map()
      let enturmados = 0
      for (const r of alRows.rows) {
        const alunoId = String(r.id)
        const turmaText = String(r.turma || '').trim() || String(r.turma_atual || '').trim()
        if (!turmaText) continue
        const company = String(r.company_id || 'default')
        const serie = String(r.ano_letivo_atual || '').trim() || parseSerieFromNome(turmaText)
        const key = turmaText + '|' + company
        if (!turmaSeen.has(key)) {
          const tid = crypto.randomUUID()
          await db.execute({
            sql: 'INSERT INTO turmas (id, nome, serie, company_id) VALUES (?, ?, ?, ?)',
            args: [tid, turmaText, serie, company],
          })
          turmaSeen.set(key, tid)
        }
        const turmaId = turmaSeen.get(key)
        const exists = await db.execute({
          sql: 'SELECT 1 FROM aluno_turmas WHERE aluno_id = ? AND turma_id = ? AND company_id = ?',
          args: [alunoId, turmaId, company],
        })
        if (exists.rows.length === 0) {
          await db.execute({
            sql: 'INSERT INTO aluno_turmas (id, aluno_id, turma_id, company_id) VALUES (?, ?, ?, ?)',
            args: [crypto.randomUUID(), alunoId, turmaId, company],
          })
          enturmados++
        }
      }
      console.log('[db.js] V7 turmas seeded:', turmaSeen.size, 'enturmações:', enturmados)

      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v7', '1')`)
      console.log('[db.js] Migration V7 complete')
    }
  } catch (e) {
    console.error('[db.js] Migration V7 FAILED:', e.message)
  }

  // V8 migration: conselho de classe (deliberações por aluno/turma/bimestre)
  try {
    const v8Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v8'`)
    if (v8Check.rows.length === 0) {
      await db.execute(`CREATE TABLE IF NOT EXISTS conselho_classe (
        id TEXT PRIMARY KEY, turma_id TEXT NOT NULL, aluno_id TEXT NOT NULL,
        ano_letivo TEXT DEFAULT '', bimestre INTEGER DEFAULT 0,
        parecer TEXT DEFAULT '', observacao TEXT DEFAULT '',
        company_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')))`)
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v8', '1')`)
      console.log('[db.js] Migration V8 complete (conselho_classe)')
    }
  } catch (e) {
    console.error('[db.js] Migration V8 FAILED:', e.message)
  }

  // V9 migration: seed users for academic/school roles
  try {
    const v9Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v9'`)
    if (v9Check.rows.length === 0) {
      const roleUsers = [
        { username: 'coordenador_pedagogico', password: 'coordenador123', role: 'coordenador_pedagogico', email: 'coordenador@colegiostjm.com.br' },
        { username: 'secretaria_escolar', password: 'secretaria123', role: 'secretaria_escolar', email: 'secretaria@colegiostjm.com.br' },
        { username: 'financeiro', password: 'financeiro123', role: 'financeiro', email: 'financeiro@colegiostjm.com.br' },
        { username: 'professor', password: 'professor123', role: 'professor', email: 'professor@colegiostjm.com.br' },
      ]
      for (const u of roleUsers) {
        const existing = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [u.username] })
        if (existing.rows.length === 0) {
          const hash = await bcrypt.hash(u.password, 10)
          await db.execute({
            sql: 'INSERT INTO users (username, password_hash, role, email, company_id) VALUES (?, ?, ?, ?, ?)',
            args: [u.username, hash, u.role, u.email, 'default'],
          })
          console.log('[db.js] V9 user created:', u.username, 'role:', u.role)
        }
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v9', '1')`)
      console.log('[db.js] Migration V9 complete (role users)')
    }
  } catch (e) {
    console.error('[db.js] Migration V9 FAILED:', e.message)
  }

  // V10 migration: vínculo login ↔ cadastro de professor (users.professor_id)
  try {
    const v10Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v10'`)
    if (v10Check.rows.length === 0) {
      const usersInfo = await db.execute('PRAGMA table_info(users)')
      const usersCols = usersInfo.rows.map((r) => r.name)
      if (!usersCols.includes('professor_id')) {
        await db.execute(`ALTER TABLE users ADD COLUMN professor_id TEXT DEFAULT ''`)
        console.log('[db.js] professor_id column added to users')
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v10', '1')`)
      console.log('[db.js] Migration V10 complete (professor_id)')
    }
  } catch (e) {
    console.error('[db.js] Migration V10 FAILED:', e.message)
  }

  // V11 migration: grade horária semanal (horario_aulas) baseada nos vínculos
  // existentes de turma_disciplinas (turma + disciplina + professor)
  try {
    const v11Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v11'`)
    if (v11Check.rows.length === 0) {
      await db.execute(`CREATE TABLE IF NOT EXISTS horario_aulas (
        id TEXT PRIMARY KEY,
        turma_disciplina_id TEXT NOT NULL,
        turma_id TEXT NOT NULL,
        disciplina_id TEXT NOT NULL,
        professor_id TEXT DEFAULT '',
        periodo TEXT DEFAULT '',
        dia_semana INTEGER NOT NULL,
        aula_num INTEGER NOT NULL,
        ano_letivo TEXT DEFAULT '',
        company_id TEXT DEFAULT 'default',
        created_at TEXT DEFAULT (datetime('now')))`)
      // Integridade: uma turma não pode ter duas aulas no mesmo slot;
      // um professor não pode estar em duas turmas no mesmo slot do período.
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_horario_turma_slot ON horario_aulas (company_id, turma_id, dia_semana, aula_num)`)
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_horario_prof_slot ON horario_aulas (company_id, professor_id, periodo, dia_semana, aula_num)`)
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v11', '1')`)
      console.log('[db.js] Migration V11 complete (horario_aulas)')
    }
  } catch (e) {
    console.error('[db.js] Migration V11 FAILED:', e.message)
  }

  // V12 migration: multi-tenant de verdade
  //  - organizations ganha domains (JSON de domínios) e settings (JSON de tema)
  //  - content/pages/page_content passam a ter PRIMARY KEY composta com
  //    company_id, permitindo que cada escola tenha as mesmas chaves/slugs
  //    (ex.: 'home', '_content_version') sem conflito entre empresas.
  try {
    const v12Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v12'`)
    if (v12Check.rows.length === 0) {
      // Desativa temporariamente FK enforcement durante o rebuild das tabelas
      // (renames/DROPs), restaurando o estado original ao final.
      let fkWasOn = false
      try {
        const fkInfo = await db.execute('PRAGMA foreign_keys')
        fkWasOn = fkInfo.rows.length > 0 && Number(fkInfo.rows[0].foreign_keys) === 1
        if (fkWasOn) await db.execute('PRAGMA foreign_keys = OFF')
      } catch {}

      const orgInfo = await db.execute('PRAGMA table_info(organizations)')
      const orgCols = orgInfo.rows.map((r) => r.name)
      if (!orgCols.includes('domains')) {
        await db.execute(`ALTER TABLE organizations ADD COLUMN domains TEXT DEFAULT '[]'`)
        console.log('[db.js] organizations.domains column added')
      }
      if (!orgCols.includes('settings')) {
        await db.execute(`ALTER TABLE organizations ADD COLUMN settings TEXT DEFAULT '{}'`)
        console.log('[db.js] organizations.settings column added')
      }

      await db.execute(`ALTER TABLE pages RENAME TO pages_old_v12`)
      await db.execute(`CREATE TABLE pages (
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        show_in_menu INTEGER DEFAULT 1,
        parent_slug TEXT,
        menu_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        company_id TEXT DEFAULT 'default',
        PRIMARY KEY (slug, company_id))`)
      await db.execute(`INSERT INTO pages (slug, title, show_in_menu, parent_slug, menu_order, created_at, company_id)
        SELECT slug, title, show_in_menu, parent_slug, menu_order, created_at, company_id FROM pages_old_v12`)
      await db.execute(`DROP TABLE pages_old_v12`)
      console.log('[db.js] pages rebuilt with PK (slug, company_id)')

      await db.execute(`ALTER TABLE page_content RENAME TO page_content_old_v12`)
      await db.execute(`CREATE TABLE page_content (
        page_slug TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        company_id TEXT DEFAULT 'default',
        PRIMARY KEY (page_slug, key, company_id))`)
      await db.execute(`INSERT INTO page_content (page_slug, key, value, company_id)
        SELECT page_slug, key, value, company_id FROM page_content_old_v12`)
      await db.execute(`DROP TABLE page_content_old_v12`)
      console.log('[db.js] page_content rebuilt with PK (page_slug, key, company_id)')

      await db.execute(`ALTER TABLE content RENAME TO content_old_v12`)
      await db.execute(`CREATE TABLE content (
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        company_id TEXT DEFAULT 'default',
        PRIMARY KEY (key, company_id))`)
      await db.execute(`INSERT INTO content (key, value, updated_at, company_id)
        SELECT key, value, updated_at, company_id FROM content_old_v12`)
      await db.execute(`DROP TABLE content_old_v12`)
      console.log('[db.js] content rebuilt with PK (key, company_id)')

      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v12', '1')`)
      console.log('[db.js] Migration V12 complete (multi-tenant PKs)')

      if (fkWasOn) {
        try { await db.execute('PRAGMA foreign_keys = ON') } catch {}
      }
    }
  } catch (e) {
    console.error('[db.js] Migration V12 FAILED:', e.message)
  }

  // V13 migration: blog_posts.slug deixa de ser UNIQUE global e passa a ser
  // único POR EMPRESA ((slug, company_id)), permitindo que cada escola tenha
  // seus próprios slugs (ex.: 'noticias') sem conflito entre empresas.
  try {
    const v13Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v13'`)
    if (v13Check.rows.length === 0) {
      await db.execute(`ALTER TABLE blog_posts RENAME TO blog_posts_old_v13`)
      await db.execute(`CREATE TABLE blog_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        author TEXT DEFAULT '',
        date TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        images TEXT DEFAULT '[]',
        videos TEXT DEFAULT '[]',
        slug TEXT,
        published INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        company_id TEXT DEFAULT 'default')`)
      await db.execute(`INSERT INTO blog_posts (id, title, subtitle, content, author, date, tags, images, videos, slug, published, created_at, company_id)
        SELECT id, title, subtitle, content, author, date, tags, images, videos, slug, published, created_at, company_id FROM blog_posts_old_v13`)
      await db.execute(`DROP TABLE blog_posts_old_v13`)
      await db.execute(`CREATE UNIQUE INDEX idx_blog_slug_company ON blog_posts (slug, company_id)`)
      console.log('[db.js] blog_posts rebuilt: UNIQUE global dropped, idx_blog_slug_company created (slug por empresa)')
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v13', '1')`)
      console.log('[db.js] Migration V13 complete (blog slug por empresa)')
    }
  } catch (e) {
    console.error('[db.js] Migration V13 FAILED:', e.message)
  }

  // V14 migration: Diário de Classe — registro diário do professor por turma.
  // Cada aula é uma entrada por (company, turma, data, disciplina) com o
  // conteúdo dado no dia; a chamada (presenças/faltas) continua na tabela
  // `frequencia`, vinculada pelos mesmos campos (turma_id, data, disciplina_id).
  try {
    const v14Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v14'`)
    if (v14Check.rows.length === 0) {
      await db.execute(`CREATE TABLE IF NOT EXISTS aulas (
        id TEXT PRIMARY KEY,
        turma_id TEXT NOT NULL,
        disciplina_id TEXT DEFAULT '',
        data TEXT NOT NULL,
        conteudo TEXT DEFAULT '',
        observacoes TEXT DEFAULT '',
        professor_id TEXT DEFAULT '',
        company_id TEXT DEFAULT 'default',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')))`)
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_aulas_turma_data ON aulas (company_id, turma_id, data, disciplina_id)`)
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v14', '1')`)
      console.log('[db.js] Migration V14 complete (aulas - diário de classe)')
    }
  } catch (e) {
    console.error('[db.js] Migration V14 FAILED:', e.message)
  }

  // V15 migration: Avaliações do Diário de Classe — agendamento no calendário
  // (mensal, bimestral, trabalhos 1-3) e notas por aluno. A média bimestral de
  // cada disciplina é recomposta na tabela `notas` (boletim/conselho leem dali).
  try {
    const v15Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v15'`)
    if (v15Check.rows.length === 0) {
      await db.execute(`CREATE TABLE IF NOT EXISTS avaliacoes (
        id TEXT PRIMARY KEY,
        turma_id TEXT NOT NULL,
        disciplina_id TEXT NOT NULL,
        data TEXT NOT NULL,
        tipo TEXT NOT NULL,
        bimestre INTEGER NOT NULL,
        descricao TEXT DEFAULT '',
        company_id TEXT DEFAULT 'default',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')))`)
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_avaliacoes_turma_data ON avaliacoes (company_id, turma_id, disciplina_id, data, tipo)`)
      await db.execute(`CREATE TABLE IF NOT EXISTS avaliacao_notas (
        id TEXT PRIMARY KEY,
        avaliacao_id TEXT NOT NULL,
        aluno_id TEXT NOT NULL,
        nota TEXT DEFAULT '',
        company_id TEXT DEFAULT 'default',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')))`)
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_avaliacao_notas ON avaliacao_notas (avaliacao_id, aluno_id)`)
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v15', '1')`)
      console.log('[db.js] Migration V15 complete (avaliacoes + avaliacao_notas)')
    }
  } catch (e) {
    console.error('[db.js] Migration V15 FAILED:', e.message)
  }

  // V16 migration: coluna espelho `company_id` em organizations, sempre igual
  // ao `id` da organização (que continua sendo a chave de tenant usada por
  // todas as outras tabelas). A coluna pode já existir (criada manualmente) —
  // a migração é tolerante e apenas garante que exista e esteja populada.
  try {
    const v16Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v16'`)
    if (v16Check.rows.length === 0) {
      const orgInfo = await db.execute('PRAGMA table_info(organizations)')
      const orgCols = orgInfo.rows.map((r) => r.name)
      if (!orgCols.includes('company_id')) {
        await db.execute(`ALTER TABLE organizations ADD COLUMN company_id TEXT`)
        console.log('[db.js] organizations.company_id column added')
      }
      await db.execute(`UPDATE organizations SET company_id = id WHERE company_id IS NULL OR company_id = ''`)
      console.log('[db.js] organizations.company_id backfilled (= id)')
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v16', '1')`)
      console.log('[db.js] Migration V16 complete (organizations.company_id espelho de id)')
    }
  } catch (e) {
    console.error('[db.js] Migration V16 FAILED:', e.message)
  }

  // V17 migration: Pin de tenant por organização — amarra um deploy (Vercel:
  // TENANT_PINNED_ORG no backend + VITE_TENANT_ORG_ID no frontend, mesmo pin)
  // a UMA escola. O site do deploy passa a servir única e exclusivamente a
  // organização dona do pin, independente de domínio/host.
  try {
    const v17Check = await db.execute(`SELECT value FROM content WHERE key = '_migration_v17'`)
    if (v17Check.rows.length === 0) {
      const orgInfo = await db.execute('PRAGMA table_info(organizations)')
      const orgCols = orgInfo.rows.map((r) => r.name)
      if (!orgCols.includes('tenant_pin')) {
        await db.execute(`ALTER TABLE organizations ADD COLUMN tenant_pin TEXT`)
        console.log('[db.js] organizations.tenant_pin column added')
      }
      // Backfill: toda organização existente ganha um pin (não fica órfã de pin)
      const semPin = await db.execute("SELECT id FROM organizations WHERE tenant_pin IS NULL OR tenant_pin = ''")
      for (const row of semPin.rows) {
        await db.execute({
          sql: 'UPDATE organizations SET tenant_pin = ? WHERE id = ?',
          args: [crypto.randomUUID().replace(/-/g, ''), row.id],
        })
      }
      console.log('[db.js] tenant_pin backfilled para', semPin.rows.length, 'organização(ões)')
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_migration_v17', '1')`)
      console.log('[db.js] Migration V17 complete (tenant_pin)')
    }
  } catch (e) {
    console.error('[db.js] Migration V17 FAILED:', e.message)
  }

  // Seed alunos fictícios (runs once regardless of migration status)
  try {
    const seedCheck = await db.execute(`SELECT value FROM content WHERE key = '_seed_alunos_version'`)
    if (seedCheck.rows.length === 0) {
      const alunos = [
        { nome: 'Maria Clara Silva', sexo: 'Feminino', escolaridade: 'Ensino Fundamental I', turma: '3º Ano A', data_nascimento: '2016-03-15', cpf: '123.456.789-01', telefone: '(11) 91234-5678', nome_pai: 'Carlos Silva', nome_mae: 'Ana Paula Silva', telefone_pais: '(11) 99876-5432', responsavel_financeiro: 'Carlos Silva', cpf_responsavel: '987.654.321-00', endereco: 'Rua das Flores, 123 - Centro', telefone_contato: '(11) 91234-5678' },
        { nome: 'João Pedro Santos', sexo: 'Masculino', escolaridade: 'Ensino Fundamental II', turma: '7º Ano B', data_nascimento: '2012-07-22', cpf: '234.567.890-12', telefone: '(11) 92345-6789', nome_pai: 'Roberto Santos', nome_mae: 'Juliana Santos', telefone_pais: '(11) 98765-4321', responsavel_financeiro: 'Roberto Santos', cpf_responsavel: '876.543.210-99', endereco: 'Av. Brasil, 456 - Jardim América', telefone_contato: '(11) 92345-6789' },
        { nome: 'Ana Beatriz Oliveira', sexo: 'Feminino', escolaridade: 'Ensino Médio', turma: '1º Ano C', data_nascimento: '2008-11-03', cpf: '345.678.901-23', telefone: '(11) 93456-7890', nome_pai: 'Fernando Oliveira', nome_mae: 'Patrícia Oliveira', telefone_pais: '(11) 97654-3210', responsavel_financeiro: 'Patrícia Oliveira', cpf_responsavel: '765.432.109-88', endereco: 'Rua dos Pinheiros, 789 - Vila Nova', telefone_contato: '(11) 93456-7890' },
      ]
      for (const a of alunos) {
        const id = crypto.randomUUID()
        const keys = Object.keys(a)
        const vals = Object.values(a)
        await db.execute({
          sql: `INSERT INTO alunos (id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`,
          args: [id, ...vals],
        })
        console.log('[db.js] Aluno criado:', a.nome)
      }
      await db.execute(`INSERT OR IGNORE INTO content (key, value) VALUES ('_seed_alunos_version', '1')`)
      console.log('[db.js] Alunos fictícios seeded complete')
    }
  } catch (e) {
    console.error('[db.js] Alunos seed FAILED:', e.message)
  }
}
