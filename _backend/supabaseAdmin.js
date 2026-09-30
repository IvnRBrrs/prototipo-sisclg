import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin = null
try {
  if (supabaseUrl && serviceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    console.log('[supabaseAdmin] Client initialized')
  } else {
    console.warn('[supabaseAdmin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  }
} catch (e) {
  console.error('[supabaseAdmin] Init failed:', e.message)
}

export default supabaseAdmin
