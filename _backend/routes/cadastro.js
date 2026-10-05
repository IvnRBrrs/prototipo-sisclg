// Cadastro da organização — dados jurídicos/fiscais (faturamento) e do
// responsável legal. UMA linha por organização (PK = company_id), escopada
// pelo token/header: super_admin opera na org selecionada (X-Company-Id) e
// gestor_admin sempre na própria escola. Estes dados alimentarão
// faturamento/contratos no futuro.
import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN))

const FIELDS = [
  'razao_social', 'nome_fantasia', 'cnpj', 'inscricao_estadual', 'inscricao_municipal',
  'regime_tributario', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento',
  'endereco_bairro', 'endereco_cidade', 'endereco_estado', 'endereco_cep',
  'telefone_corporativo', 'email_institucional', 'website',
  'responsavel_nome', 'responsavel_cpf', 'responsavel_cargo', 'responsavel_email',
  'responsavel_telefone',
]

// GET — cadastro da organização do contexto (token/header). Sem linha
// cadastrada, retorna valores vazios (o formulário ainda não foi preenchido).
router.get('/', async (req, res) => {
  try {
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: 'SELECT * FROM org_cadastro WHERE company_id = ?',
      args: [company_id],
    })
    const row = rowsToObjects(result.rows, result.columns)[0] || { company_id }
    for (const f of FIELDS) {
      if (row[f] === undefined || row[f] === null) row[f] = ''
    }
    row.company_id = company_id
    res.json(row)
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// PUT — upsert dos dados da organização do contexto (token/header). Campos
// não enviados são gravados como '' (o formulário envia todos).
router.put('/', async (req, res) => {
  try {
    const company_id = req.user.company_id || 'default'
    const values = {}
    for (const f of FIELDS) {
      values[f] = String(req.body[f] ?? '').trim().slice(0, 300)
    }
    const cols = ['company_id', ...FIELDS]
    const placeholders = cols.map(() => '?').join(', ')
    const updates = FIELDS.map((f) => `${f} = excluded.${f}`).join(', ')
    await req.db.execute({
      sql: `INSERT INTO org_cadastro (${cols.join(', ')}) VALUES (${placeholders})
            ON CONFLICT(company_id) DO UPDATE SET ${updates}, updated_at = datetime('now')`,
      args: [company_id, ...FIELDS.map((f) => values[f])],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
