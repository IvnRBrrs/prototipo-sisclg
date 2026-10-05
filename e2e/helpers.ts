// Fixtures e utilidades para os testes de UI (Playwright).
// Mesma disciplina das suítes E2E de API: fixtures prefixados, limpeza total
// e auditoria NET-ZERO ao final (o teste roda contra o banco REAL).
import 'dotenv/config'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

export const UI_SUPER = '__ui_super__'
export const UI_SUPER_PASS = 'ui-prova-123'
export const UI_ORG = 'uitestorg'
export const UI_ORG_NOME = 'UI Test Org'
export const UI_EDITOR = '__ui_editor__'
export const UI_EDITOR_PASS = 'ui-prova-123'
const GESTOR_EMAIL = `uitestorg_admin@${UI_ORG}.com.br`

export const db = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN })
const supabase = createSupabaseClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const BASE = 'http://localhost:5173/api'

async function api(path: string, { method = 'GET', token, body }: { method?: string; token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = 'Bearer ' + token
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data: any = null
  try { data = await res.json() } catch { }
  return { status: res.status, data }
}

// login_log NÃO entra no NET-ZERO genérico: logins REAIS de usuários
// legítimos (fal, ivan, …) podem acontecer em paralelo com a suíte — a
// limpeza por padrão de fixture (abaixo no cleanup) garante zero resíduo.
const COUNT_TABLES = ['organizations', 'content', 'pages', 'page_content', 'blog_posts', 'images', 'users', 'contact_messages', 'org_cadastro']
export type Snapshot = Record<string, number>
export async function snapshot(): Promise<Snapshot> {
  const s: Snapshot = {}
  for (const t of COUNT_TABLES) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t}`)
    s[t] = Number((r.rows[0] as any).n)
  }
  return s
}

export async function cleanupFixtures() {
  await db.execute({ sql: 'DELETE FROM users WHERE username IN (?, ?)', args: [UI_SUPER, UI_EDITOR] })
  for (const t of ['page_content', 'pages', 'content', 'images', 'blog_posts', 'users', 'org_cadastro']) {
    await db.execute({ sql: `DELETE FROM ${t} WHERE company_id = ?`, args: [UI_ORG] }).catch(() => { })
  }
  await db.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [UI_ORG] }).catch(() => { })
  await db.execute({ sql: "DELETE FROM login_log WHERE username LIKE '%__ui%' OR username LIKE '%uitestorg%'" })
  try {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const alvo = data?.users?.find?.((u: any) => u.email === GESTOR_EMAIL)
    if (alvo) await supabase.auth.admin.deleteUser(alvo.id)
  } catch { }

  // Blindagem: escritas tardias do navegador (saves em voo) podem recriar
  // linhas após o DELETE. Repete até zerar, SEM engolir erro — se não zerar,
  // o NET-ZERO do afterAll aponta exatamente o que sobrou.
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 1500 : 1000))
    for (const t of ['page_content', 'pages', 'content', 'images', 'blog_posts', 'users', 'org_cadastro']) {
      await db.execute({ sql: `DELETE FROM ${t} WHERE company_id = ?`, args: [UI_ORG] })
    }
    let remaining = 0
    for (const t of ['page_content', 'pages', 'content', 'images', 'blog_posts', 'users', 'org_cadastro']) {
      const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t} WHERE company_id = ?`, [UI_ORG])
      remaining += Number((r.rows[0] as any).n)
    }
    if (remaining === 0) return
  }
  // último check — lança com detalhes se algo persistir
  const sobra = await db.execute("SELECT page_slug, key FROM page_content WHERE company_id = ? LIMIT 10", [UI_ORG])
  if (sobra.rows.length > 0) {
    throw new Error('cleanup: linhas persistem em uitestorg: ' + JSON.stringify(sobra.rows))
  }
}

// Setup: super temp + org criada e provisionada VIA API (invalida cache de
// tenant e popula dummy data — o editor de páginas precisa das seções).
export async function setupFixtures(): Promise<{ token: string; PRE: Snapshot }> {
  await cleanupFixtures()
  const PRE = await snapshot()

  await db.execute({
    sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
    args: [UI_SUPER, await bcrypt.hash(UI_SUPER_PASS, 10), 'super_admin', UI_SUPER + '@prova.local', 'default'],
  })
  const login = await api('/auth/login', { method: 'POST', body: { username: UI_SUPER, password: UI_SUPER_PASS } })
  if (login.status !== 200) throw new Error('setup: login do super falhou (' + login.status + ')')
  const token = login.data.token

  const org = await api('/organizations', { method: 'POST', token, body: { slug: UI_ORG, nome: UI_ORG_NOME } })
  if (org.status !== 200) throw new Error('setup: criação da org falhou (' + JSON.stringify(org.data) + ')')

  const onb = await api(`/organizations/${UI_ORG}/onboarding`, { method: 'POST', token, body: { admin_password: 'ui-prova-123' } })
  if (onb.status !== 200) throw new Error('setup: onboarding falhou (' + JSON.stringify(onb.data) + ')')

  return { token, PRE }
}

export async function teardownFixtures(PRE: Snapshot): Promise<string[]> {
  await cleanupFixtures()
  const POST = await snapshot()
  const diff: string[] = []
  for (const k of Object.keys(PRE)) {
    if (String(PRE[k]) !== String(POST[k])) diff.push(`${k}: ${PRE[k]} -> ${POST[k]}`)
  }
  return diff
}

export async function shot(page: Page, name: string, opts: { fullPage?: boolean } = {}) {
  await page.screenshot({ path: `e2e/artifacts/screenshots/${name}.png`, fullPage: opts.fullPage ?? false })
}

// Preenche o formulário de login do painel (usuário humano digitando).
export async function loginInUI(page: Page, username: string, password: string) {
  await page.goto('/admin')
  await page.fill('input[name="username"]', username)
  await page.fill('input[name="password"]', password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}
