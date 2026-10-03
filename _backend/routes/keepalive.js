// Keep-alive diário (hidden feature): pinga os dois backends (Turso e
// Supabase) para que os projetos gratuitos nunca entrem em pausa por
// inatividade. Chamado 1x/dia pelo Vercel Cron (vercel.json → crons) e
// também pode ser chamado manualmente em qualquer ambiente:
//   GET /api/keep-alive
// Sem autenticação (o cron não envia token), sem expor dados — só status.
import { Router } from 'express'
import supabaseAdmin from '../supabaseAdmin.js'

const router = Router()

router.get('/', async (req, res) => {
  const ts = new Date().toISOString()
  let tursoOk = false
  let supabaseOk = false

  try {
    await req.db.execute('SELECT 1 AS ok')
    tursoOk = true
  } catch (e) {
    console.error('[keep-alive] Turso ping failed:', e.message)
  }

  if (supabaseAdmin) {
    try {
      // Chamada autenticada leve ao Auth API (conta como atividade do projeto)
      const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
      supabaseOk = !error
      if (error) console.error('[keep-alive] Supabase ping failed:', error.message)
    } catch (e) {
      console.error('[keep-alive] Supabase ping failed:', e.message)
    }
  } else {
    console.warn('[keep-alive] Supabase not configured')
  }

  console.log('[keep-alive]', ts, 'turso:', tursoOk, 'supabase:', supabaseOk)
  res.json({ ok: tursoOk && supabaseOk, turso: tursoOk, supabase: supabaseOk, ts })
})

export default router
