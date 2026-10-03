// Resolução de qual conteúdo de site público serve cada requisição.
//
// "Site principal" (hidden feature do painel): o super_admin pode publicar o
// conteúdo de outra organização no site principal (o domínio que resolve para
// 'default'). O estado fica em organizations.settings.site_principal da org
// 'default': { org_id, ativo }.
//
// Regras (apenas LEITURA de dados do site público — content, pages,
// page_content; blog usa só a substituição, sem merge):
//   - Chamadas do PAINEL (header X-Cms-Ctx: admin): NUNCA substituem e NUNCA
//     herdam da default — o painel sempre edita os dados próprios da
//     organização resolvida (token/header). Evita a armadilha de "ver o
//     conteúdo de X mas salvar na default" e mantém cada escola isolada.
//   - Site público resolvido para 'default': se site_principal.ativo → serve
//     a organização publicada COM fallback por-chave para 'default' (o site
//     principal nunca fica incompleto).
//   - Site público de outra organização (domínio/header): SOMENTE os dados
//     próprios dela — sem importar/herdar nada da default. Org nova nasce
//     vazia; ao provisionar, recebe o template DUMMY.
//   - Escopo de dados: SOMENTE componentes do site (content/pages/page_content
//     + substituição do blog). Mensagens, pré-matrículas, usuários e demais
//     dados continuam isolados por organização.

export async function getSitePrincipal(db) {
  try {
    const r = await db.execute({
      sql: "SELECT settings FROM organizations WHERE id = 'default'",
    })
    if (r.rows.length === 0) return null
    let settings = {}
    try { settings = JSON.parse(r.rows[0].settings || '{}') } catch {}
    const sp = settings?.site_principal
    if (!sp || !sp.org_id || sp.ativo !== true) return null
    if (sp.org_id === 'default') return null
    return { org_id: String(sp.org_id), ativo: true }
  } catch {
    return null
  }
}

// Retorna { effective, base }:
//   effective = organização cujo conteúdo serve a requisição
//   base      = organização de fallback por-chave ('default') ou null
export async function resolveSiteCompany(req, { isAdmin } = { isAdmin: false }) {
  const resolved = req.company_id || 'default'
  const admin = isAdmin || req.headers['x-cms-ctx'] === 'admin'

  // Painel: sempre a organização resolvida, sem substituição e sem herança.
  if (admin) {
    return { effective: resolved, base: null }
  }

  // Site público na 'default': substituição pelo site principal publicado,
  // com fallback por-chave para a default (site principal sempre completo).
  if (resolved === 'default') {
    const sp = await getSitePrincipal(req.db)
    if (sp) {
      // Organização publicada ainda existe?
      try {
        const exists = await req.db.execute({
          sql: 'SELECT id FROM organizations WHERE id = ?',
          args: [sp.org_id],
        })
        if (exists.rows.length > 0) {
          return { effective: sp.org_id, base: 'default' }
        }
      } catch {}
    }
    return { effective: 'default', base: null }
  }

  // Site público de outra organização: SOMENTE os dados próprios dela.
  return { effective: resolved, base: null }
}
