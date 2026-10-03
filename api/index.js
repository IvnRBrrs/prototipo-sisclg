import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createDb, initDb } from '../_backend/db.js'
import { tenantMiddleware } from '../_backend/middleware/tenant.js'
import authRoutes from '../_backend/routes/auth.js'
import contentRoutes from '../_backend/routes/content.js'
import pagesRoutes from '../_backend/routes/pages.js'
import imagesRoutes from '../_backend/routes/images.js'
import messagesRoutes from '../_backend/routes/messages.js'
import preEnrollmentsRoutes from '../_backend/routes/pre_enrollments.js'
import backupsRoutes from '../_backend/routes/backups.js'
import seedRoutes from '../_backend/routes/seed.js'
import blogRoutes from '../_backend/routes/blog.js'
import historicoAlunosRoutes from '../_backend/routes/historico_alunos.js'
import supabaseUsersRoutes from '../_backend/routes/supabase_users.js'
import turmasRoutes from '../_backend/routes/turmas.js'
import professoresRoutes from '../_backend/routes/professores.js'
import disciplinasRoutes from '../_backend/routes/disciplinas.js'
import matriculasRoutes from '../_backend/routes/matriculas.js'
import notasRoutes from '../_backend/routes/notas.js'
import frequenciaRoutes from '../_backend/routes/frequencia.js'
import aulasRoutes from '../_backend/routes/aulas.js'
import avaliacoesRoutes from '../_backend/routes/avaliacoes.js'
import ocorrenciasRoutes from '../_backend/routes/ocorrencias.js'
import conselhoClasseRoutes from '../_backend/routes/conselho_classe.js'
import anosLetivosRoutes from '../_backend/routes/anos_letivos.js'
import horariosRoutes from '../_backend/routes/horarios.js'
import adminRoutes from '../_backend/routes/admin.js'
import publicRoutes from '../_backend/routes/public.js'
import organizationsRoutes from '../_backend/routes/organizations.js'
import keepaliveRoutes from '../_backend/routes/keepalive.js'

console.log('[api/index.js] Starting module load...')
console.log('[api/index.js] DATABASE_URL present:', !!process.env.DATABASE_URL)
console.log('[api/index.js] DATABASE_AUTH_TOKEN present:', !!process.env.DATABASE_AUTH_TOKEN)

let db = null
let initPromise = null

try {
  db = createDb()
  console.log('[api/index.js] createDb() OK, db type:', typeof db)
  initPromise = initDb(db)
  initPromise.then(() => console.log('[api/index.js] initDb() complete')).catch((e) => console.error('[api/index.js] initDb failed:', e.message))
} catch (e) {
  console.error('[api/index.js] createDb FAILED:', e.message)
}

const app = express()
console.log('[api/index.js] Express app created')

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.use(async (req, _res, next) => {
  console.log('[index.js middleware] req.url:', req.url, 'initPromise:', !!initPromise)
  if (!db) {
    console.error('[index.js middleware] db is null')
    return _res.status(500).json({ error: 'Database not initialized' })
  }
  if (initPromise) {
    console.log('[index.js middleware] awaiting initPromise...')
    try {
      await initPromise
      console.log('[index.js middleware] initPromise resolved')
    } catch (e) {
      console.error('[index.js middleware] initPromise REJECTED:', e.message)
      return _res.status(500).json({ error: 'Database init failed: ' + e.message })
    }
  }
  req.db = db
  next()
})

// Resolução de empresa (tenant) por domínio — roda em todas as rotas.
// Fallback seguro para 'default' em localhost/domínios não cadastrados.
app.use(tenantMiddleware)

app.use('/api/auth', authRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/pages', pagesRoutes)
app.use('/api/images', imagesRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/pre-enrollments', preEnrollmentsRoutes)
app.use('/api/backups', backupsRoutes)
app.use('/api/seed', seedRoutes)
app.use('/api/blog', blogRoutes)
app.use('/api/historico-alunos', historicoAlunosRoutes)
app.use('/api/admin/supabase-users', supabaseUsersRoutes)
app.use('/api/turmas', turmasRoutes)
app.use('/api/professores', professoresRoutes)
app.use('/api/disciplinas', disciplinasRoutes)
app.use('/api/matriculas', matriculasRoutes)
app.use('/api/notas', notasRoutes)
app.use('/api/frequencia', frequenciaRoutes)
app.use('/api/aulas', aulasRoutes)
app.use('/api/avaliacoes', avaliacoesRoutes)
app.use('/api/ocorrencias', ocorrenciasRoutes)
app.use('/api/conselho-classe', conselhoClasseRoutes)
app.use('/api/anos-letivos', anosLetivosRoutes)
app.use('/api/horarios', horariosRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/organizations', organizationsRoutes)
app.use('/api/keep-alive', keepaliveRoutes)

// 404 JSON para rotas /api não registradas (compatível com Vercel; no dev,
// sem isto o fallback SPA do Vite responderia index.html para /api/*).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: String(err) })
})

export default app
