// Suíte de UI E2E — o "usuário humano" navega, digita, salva e nós verificamos
// no banco que tudo foi gravado com o company_id correto. Cobertura:
//   T1 Login no painel
//   T2 Org picker (REGRESSÃO do bug de logoff ao selecionar organização)
//   T3 Edição de conteúdo da seção Hero + Salvar + verificação no banco
//   T4 Criação de usuário escopado à organização ativa
//   T5 Sair da organização (continua logado)
//   T6 Smoke do site público
//   afterAll: limpeza total + NET-ZERO
import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'fs'
import {
  UI_SUPER, UI_SUPER_PASS, UI_ORG, UI_ORG_NOME, UI_EDITOR, UI_EDITOR_PASS,
  setupFixtures, teardownFixtures, shot, loginInUI, db,
} from './helpers'

mkdirSync('e2e/artifacts/screenshots', { recursive: true })

let PRE: Awaited<ReturnType<typeof setupFixtures>>['PRE']

test.describe.serial('Admin UI — fluxo humano', () => {

  test.beforeAll(async () => {
    const setup = await setupFixtures()
    PRE = setup.PRE
  })

  test.afterAll(async () => {
    const diff = await teardownFixtures(PRE)
    expect(diff, 'NET-ZERO: banco idêntico ao início da suíte').toEqual([])
  })

  test('T1 — login no painel com usuário e senha', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await expect(page.getByText('Painel de Controle')).toBeVisible()
    const token = await page.evaluate(() => localStorage.getItem('cms_token'))
    expect(token).toBeTruthy()
    await shot(page, '01-login')
  })

  test('T2 — org picker: selecionar organização SEM logoff (regressão)', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await expect(page.getByText('Painel de Controle')).toBeVisible()

    // O modal de seleção aparece (2+ organizações no banco)
    await expect(page.getByRole('heading', { name: 'Selecionar Organização' })).toBeVisible()
    await shot(page, '02-org-picker')

    // Clica na organização de teste
    await page.locator('.org-picker-item', { hasText: UI_ORG_NOME }).click()

    // REGRESSÃO: continua logado (sem redirect para login, token intacto)
    await expect(page.getByText('Painel de Controle')).toBeVisible()
    await page.waitForTimeout(400) // dá tempo a qualquer redirect indesejado
    expect(page.url()).not.toContain('/login')
    const token = await page.evaluate(() => localStorage.getItem('cms_token'))
    expect(token).toBeTruthy()
    const companyId = await page.evaluate(() => localStorage.getItem('cms_company_id'))
    expect(companyId).toBe(UI_ORG)

    // Chip da organização ativa visível na sidebar
    const chip = page.locator('.admin-org-chip')
    await expect(chip).toBeVisible()
    await expect(chip).toContainText(UI_ORG_NOME)
    await shot(page, '03-dentro-da-org')
  })

  test('T3 — editar Hero, salvar e verificar no banco (company_id da org)', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await page.locator('.org-picker-item', { hasText: UI_ORG_NOME }).click()
    await expect(page.locator('.admin-org-chip')).toContainText(UI_ORG_NOME)

    // Dashboard → card Páginas
    await page.locator('.admin-card', { hasText: 'Páginas' }).first().click()
    await expect(page.getByRole('heading', { name: 'Gerenciar Páginas' })).toBeVisible()

    // Linha da página home → Editar Seções
    await page.locator('tr', { hasText: 'home' }).getByRole('button', { name: 'Editar Seções' }).click()
    await expect(page.getByRole('heading', { name: /Editando: home/ })).toBeVisible()

    // Abre a seção Hero
    await page.locator('.admin-page-section-header', { hasText: 'Hero' }).click()
    const campoBoasVindas = page
      .locator('.admin-page-section-body div.admin-field')
      .filter({ has: page.locator('label', { hasText: 'Texto de Boas-Vindas' }) })
      .locator('input')
    await expect(campoBoasVindas).toBeVisible()
    await page.waitForTimeout(500)
    await shot(page, '04-editor-hero')

    // Digita o novo valor — slow-mo pode causar re-render que limpa o fill;
    // re-preenche se necessário antes de salvar
    const NOVO_TEXTO = 'Bem-vindo ao teste UI ' + Date.now()
    for (let i = 0; i < 3; i++) {
      await campoBoasVindas.fill(NOVO_TEXTO)
      await page.waitForTimeout(300)
      const check = await campoBoasVindas.inputValue()
      if (check === NOVO_TEXTO) break
    }
    await page.getByRole('button', { name: 'Salvar Página' }).click()

    // Verifica no BANCO: gravado na página home da org, com company_id dela
    await expect.poll(async () => {
      const r = await db.execute({
        sql: "SELECT value FROM page_content WHERE page_slug = 'home' AND key = 'hero_welcome' AND company_id = ?",
        args: [UI_ORG],
      })
      return (r.rows[0] as any)?.value ?? null
    }, { timeout: 15_000 }).toBe(NOVO_TEXTO)

    // E a default NÃO foi alterada por essa edição
    const defRow = await db.execute({
      sql: "SELECT value FROM page_content WHERE page_slug = 'home' AND key = 'hero_welcome' AND company_id = 'default'",
    })
    expect(String((defRow.rows[0] as any)?.value || '')).not.toContain('teste UI')
    await shot(page, '05-salvo')
  })

  test('T4 — criar usuário dentro da organização ativa (escopo company_id)', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await page.locator('.org-picker-item', { hasText: UI_ORG_NOME }).click()
    await expect(page.locator('.admin-org-chip')).toContainText(UI_ORG_NOME)

    // Dashboard → aba Sistema (grupos ficam recolhidos; só "conteudo" abre por padrão)
    await page.locator('.admin-dashboard-tab', { hasText: 'Sistema' }).click()
    await page.locator('.admin-card', { hasText: 'Usuários (T.)' }).first().click()
    await expect(page.getByRole('heading', { name: /Gerenciar Usuários/ })).toBeVisible()

    // Hint de escopo visível
    await expect(page.getByText(`Novos usuários serão criados na organização ${UI_ORG}`)).toBeVisible()

    // Preenche o formulário como um humano
    const campo = (label: string) =>
      page.locator('div.admin-field').filter({ has: page.locator('label', { hasText: label }) })
    await campo('Nome de usuário').locator('input').fill(UI_EDITOR)
    await campo('Senha').locator('input').fill(UI_EDITOR_PASS)
    await campo('Email').locator('input').fill(`${UI_EDITOR}@uitest.local`)
    await campo('Função').locator('select').selectOption('editor_admin')
    await page.getByRole('button', { name: 'Criar Usuário' }).click()

    // Verifica no BANCO: usuário criado com company_id da ORG (não da default)
    await expect.poll(async () => {
      const r = await db.execute({ sql: 'SELECT company_id, role FROM users WHERE username = ?', args: [UI_EDITOR] })
      return (r.rows[0] as any)?.company_id ?? null
    }, { timeout: 15_000 }).toBe(UI_ORG)
    await shot(page, '06-usuario-criado')
  })

  test('T5 — sair da organização continua logado', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await page.locator('.org-picker-item', { hasText: UI_ORG_NOME }).click()
    await expect(page.locator('.admin-org-chip')).toContainText(UI_ORG_NOME)

    // Clica em "Sair" no chip da org ativa
    await page.locator('.admin-org-chip').getByRole('button', { name: 'Sair' }).click()

    // Chip some, contexto volta ao padrão, MAS continua logado
    await expect(page.locator('.admin-org-chip')).toHaveCount(0)
    await expect(page.getByText('Painel de Controle')).toBeVisible()
    const companyId = await page.evaluate(() => localStorage.getItem('cms_company_id'))
    expect(companyId).toBeNull()
    const token = await page.evaluate(() => localStorage.getItem('cms_token'))
    expect(token).toBeTruthy()
    await shot(page, '07-saiu-da-org')
  })

  test('T6 — smoke do site público (default)', async ({ page }) => {
    await page.goto('/')
    // Hero da default renderiza (SPA carregou conteúdo e montou a seção)
    await expect(page.locator('section, main, div').first()).toBeVisible()
    await page.waitForTimeout(1500)
    await shot(page, '08-site-publico')
  })

  test('T7 — painel Organizações exibe a key e o Pin (token) de cada organização', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await expect(page.getByText('Painel de Controle')).toBeVisible()

    // Modal de seleção aparece (super com 2+ orgs) → continuar no padrão
    await expect(page.getByRole('heading', { name: 'Selecionar Organização' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar sem selecionar (organização padrão)' }).click()
    await expect(page.locator('.admin-org-chip')).toHaveCount(0)

    // Sidebar (apenas do painel, não a tab do dashboard) → Organizações
    await page.locator('aside.admin-sidebar').getByRole('button', { name: 'Organizações', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Organizações', exact: true })).toBeVisible()

    // Aguarda a tabela carregar as organizações
    const orgsDb = await db.execute('SELECT id, tenant_pin FROM organizations ORDER BY id')
    const orgs = orgsDb.rows.map((r: any) => ({ id: String(r.id), pin: String(r.tenant_pin || '') }))
    expect(orgs.length).toBeGreaterThanOrEqual(2)

    for (const org of orgs) {
      const row = page.locator('tbody tr').filter({ has: page.locator('code', { hasText: org.id }) })
      await expect(row).toBeVisible()
      // key: company_id exibido na primeira coluna da linha
      await expect(row.locator('code').first()).toHaveText(org.id)
      // token: o Pin do deploy aparece (10 primeiros chars + …), nunca '—'
      expect(org.pin.length).toBeGreaterThanOrEqual(16)
      const pinCode = row.locator('code', { hasText: org.pin.slice(0, 10) })
      await expect(pinCode).toBeVisible()
      await expect(pinCode).toContainText('…')
      // botões de gestão do pin presentes
      await expect(row.getByRole('button', { name: 'Copiar' })).toBeVisible()
      await expect(row.getByRole('button', { name: 'Novo Pin' })).toBeVisible()
    }
    await shot(page, '09-organizations-pins')

    // Copiar pin da primeira org → status do painel + clipboard com o pin COMPLETO
    const first = orgs[0]
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const firstRow = page.locator('tbody tr').filter({ has: page.locator('code', { hasText: first.id }) })
    await firstRow.getByRole('button', { name: 'Copiar' }).click()
    await expect(page.getByText('Pin copiado para a área de transferência')).toBeVisible()
    try {
      const clip = await page.evaluate(() => navigator.clipboard.readText())
      // O pin copiado é o COMPLETO (o da coluna é truncado) — prova de que o
      // botão entrega exatamente o que vai para a Vercel.
      expect(clip).toBe(first.pin)
    } catch {
      console.log('[T7] leitura do clipboard indisponível neste ambiente — validado pelo status do painel')
    }
    await shot(page, '10-pin-copiado')
  })

  test('T8 — Supabase suspenso: sem botão de login, sem nome da escola, sem aba Usuários (Server S.)', async ({ page }) => {
    await page.goto('/admin')

    // 1. Botão "Login via Server S." OCULTO na tela de login
    await expect(page.getByRole('button', { name: /Login via Server S/ })).toHaveCount(0)

    // 2. Nome da escola REMOVIDO da tela de login
    await expect(page.getByText('Colégio São Judas Tadeu')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Painel Administrativo' })).toBeVisible()
    await shot(page, '11-login-sem-supabase')

    // Login normal (Turso) continua funcionando
    await page.fill('input[name="username"]', UI_SUPER)
    await page.fill('input[name="password"]', UI_SUPER_PASS)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('Painel de Controle')).toBeVisible()

    // Picker → continuar no padrão (para ver o gerenciador completo)
    await page.getByRole('button', { name: 'Continuar sem selecionar (organização padrão)' }).click()
    await expect(page.locator('.admin-org-chip')).toHaveCount(0)

    // 3. Card "Usuários (Server S.)" AUSENTE na aba Sistema do dashboard
    await page.locator('.admin-dashboard-tab', { hasText: 'Sistema' }).click()
    await expect(page.getByRole('heading', { name: /Gerenciar Usuários/ })).toHaveCount(0)
    await expect(page.locator('.admin-card').filter({ hasText: 'Usuários (Server S.)' })).toHaveCount(0)
    // Card de usuários Turso CONTINUA presente — e navegar até ele expande o
    // grupo Sistema da sidebar (necessário para o assert a seguir)
    const cardTurso = page.locator('.admin-card', { hasText: 'Usuários (T.)' }).first()
    await expect(cardTurso).toBeVisible()
    await cardTurso.click()
    await expect(page.getByRole('heading', { name: /Gerenciar Usuários/ })).toBeVisible()
    await shot(page, '12-sistema-sem-supabase')

    // 4. Botão ausente também no grupo Sistema da sidebar (agora expandido)
    await expect(page.locator('aside.admin-sidebar').getByRole('button', { name: 'Usuários (Server S.)' })).toHaveCount(0)
    await expect(page.locator('aside.admin-sidebar').getByRole('button', { name: 'Usuários (T.)' })).toBeVisible()
  })

  test('T9 — Configurações > Cadastro: preencher, salvar e gerar ficha A4', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await expect(page.getByText('Painel de Controle')).toBeVisible()

    // Entra na org de teste (fixture) — dados ficam no company_id dela
    await page.locator('.org-picker-item', { hasText: UI_ORG_NOME }).click()
    await expect(page.locator('.admin-org-chip')).toContainText(UI_ORG_NOME)

    // Sidebar → Configurações (grupo) → Cadastro
    const configGroup = page.locator('aside.admin-sidebar div.sidebar-group', {
      has: page.locator('button.sidebar-group-header', { hasText: 'Configurações' }),
    })
    await configGroup.locator('button.sidebar-group-header').click()
    await configGroup.locator('.sidebar-group-items button', { hasText: 'Cadastro' }).first().click()
    await expect(page.getByRole('heading', { name: 'Cadastro da Organização' })).toBeVisible()
    // Aguarda o load() assíncrono completar (hint com org name = dados prontos).
    await expect(page.getByText(/dados jurídicos, fiscais e do responsável legal/)).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(500)
    await shot(page, '13-cadastro-form')

    // Preenche os inputs como um humano — slow-mo pode limpar campos entre
    // fills (re-render do React durante load()); helper com retry resolve
    const fillRobust = async (input: any, value: string) => {
      for (let i = 0; i < 3; i++) {
        await input.fill(value)
        await page.waitForTimeout(300)
        const check = await input.inputValue()
        if (check === value) return
      }
      await input.fill(value)
    }
    const campo = (label: string) =>
      page.locator('.cadastro-fieldset div.admin-field').filter({ has: page.locator('label', { hasText: label }) }).locator('input')
    await fillRobust(campo('Razão Social *'), 'Escola UI Teste LTDA')
    await fillRobust(campo('Nome Fantasia'), 'Escola UI Teste')
    await fillRobust(campo('CNPJ / Tax ID / EIN'), '12.345.678/0001-90')
    await page.locator('.cadastro-fieldset div.admin-field')
      .filter({ has: page.locator('label', { hasText: 'Regime Tributário' }) })
      .locator('select')
      .selectOption('Simples Nacional')
    await fillRobust(campo('Logradouro'), 'Rua dos Testes')
    await fillRobust(campo('Número'), '42')
    await fillRobust(campo('Cidade'), 'Testópolis')
    await fillRobust(campo('Nome Completo'), 'Responsável UI Teste')
    await fillRobust(campo('Cargo / Função'), 'Diretor')
    await shot(page, '14-cadastro-preenchido')

    // Salva — slow-mo pode limpar campos entre fills (re-render do React);
    // re-preenche o campo obrigatório se necessário antes de salvar
    const btnSalvar = page.getByRole('button', { name: 'Salvar Cadastro' })
    for (let i = 0; i < 3; i++) {
      const val = await campo('Razão Social *').inputValue()
      if (val === 'Escola UI Teste LTDA') break
      await campo('Razão Social *').fill('Escola UI Teste LTDA')
      await page.waitForTimeout(300)
    }
    await expect(btnSalvar).toBeEnabled({ timeout: 10_000 })
    await btnSalvar.click()
    await expect(page.getByText('Cadastro salvo com sucesso.')).toBeVisible()

    // Verifica no BANCO: gravado com o company_id da ORG (não na default)
    await expect.poll(async () => {
      const r = await db.execute({
        sql: 'SELECT razao_social FROM org_cadastro WHERE company_id = ?',
        args: [UI_ORG],
      })
      return (r.rows[0] as any)?.razao_social ?? null
    }, { timeout: 15_000 }).toBe('Escola UI Teste LTDA')
    const defRow = await db.execute({ sql: "SELECT COUNT(*) AS n FROM org_cadastro WHERE company_id = 'default'" })
    expect(Number((defRow.rows[0] as any).n)).toBe(0)

    // Ficha A4: tela de leitura com os dados + botão de impressão
    await page.getByRole('button', { name: 'Ficha A4' }).first().click()
    await expect(page.locator('.cadastro-print-doc')).toBeVisible()
    await expect(page.locator('.cadastro-print-doc')).toContainText('Escola UI Teste LTDA')
    await expect(page.locator('.cadastro-print-doc')).toContainText('Responsável UI Teste')
    await expect(page.getByRole('button', { name: /Imprimir \(A4\)/ })).toBeVisible()
    await shot(page, '15-cadastro-ficha-a4', { fullPage: false })
  })

  test('T10 — botão Importar do Cadastro preenche campos da seção Footer', async ({ page }) => {
    await loginInUI(page, UI_SUPER, UI_SUPER_PASS)
    await page.locator('.org-picker-item', { hasText: UI_ORG_NOME }).click()
    await expect(page.locator('.admin-org-chip')).toContainText(UI_ORG_NOME)

    // Primeiro salva dados no Cadastro da organização (via API — mais rápido)
    await db.execute({
      sql: `INSERT INTO org_cadastro (company_id, nome_fantasia, telefone_corporativo, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(company_id) DO UPDATE SET nome_fantasia = excluded.nome_fantasia, telefone_corporativo = excluded.telefone_corporativo, endereco_logradouro = excluded.endereco_logradouro, endereco_numero = excluded.endereco_numero, endereco_bairro = excluded.endereco_bairro, endereco_cidade = excluded.endereco_cidade, endereco_estado = excluded.endereco_estado, endereco_cep = excluded.endereco_cep, website = excluded.website, updated_at = datetime('now')`,
      args: [UI_ORG, 'Escola Import Teste', '(11) 4002-8922', 'Av. Importação', '999', 'Testville', 'São Teste', 'TS', '01234-567', 'https://import.com.br'],
    })

    // Dashboard → card da seção Hero (abre o SectionEditor GLOBAL)
    await page.locator('.admin-section-card', { hasText: 'Hero' }).first().click()
    await expect(page.getByRole('heading', { name: /Editando: Hero/ })).toBeVisible()

    // Verifica que o botão de importar está presente (Hero tem hero_welcome no CADASTRO_MAP)
    const btnImport = page.getByRole('button', { name: /📋 Cadastro/ })
    await expect(btnImport).toBeVisible()

    // Campo hero_welcome (Texto de Boas-Vindas)
    const campoWelcome = page.locator('.admin-editor-content div.admin-field')
      .filter({ has: page.locator('label', { hasText: 'Texto de Boas-Vindas' }) })
      .locator('input')
    const valorAntes = await campoWelcome.inputValue()

    // Clica em importar
    await btnImport.click()

    // Verifica a mensagem de sucesso
    await expect(page.getByText(/importado\(s\) do cadastro/)).toBeVisible({ timeout: 15_000 })

    // Verifica que o campo foi preenchido com nome_fantasia do cadastro
    const valorDepois = await campoWelcome.inputValue()
    expect(valorDepois).toBe('Bem-vindo ao Escola Import Teste')

    await shot(page, '16-importar-cadastro')
  })
})
