import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { generateToken, authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES, ROLE_NAMES, ROLE_WEIGHT, canManageRole, canCreateRole } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import supabaseAdmin from '../supabaseAdmin.js'

const router = Router()

router.post('/setup', authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { username, password, email } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    const existing = await req.db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: [username],
    })

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hash = await bcrypt.hash(password, 10)
    const userEmail = email || (username + '@colegiostjm.com.br')
    await req.db.execute({
      sql: 'INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)',
      args: [username, hash, ROLES.SUPER_ADMIN, userEmail],
    })

    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    const result = await req.db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username],
    })

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const role = user.role || ROLES.SUPER_ADMIN
    const mustChangePassword = !!user.must_change_password
    const company_id = user.company_id || 'default'

    // Kill-switch TENANT_ENFORCE: restringe login ao domínio da própria escola
    if (process.env.TENANT_ENFORCE === 'true' && role !== ROLES.SUPER_ADMIN) {
      const resolvedCompany = req.company_id || 'default'
      if (company_id !== resolvedCompany) {
        return res.status(403).json({ error: 'Acesso restrito à escola deste domínio' })
      }
    }

    const token = generateToken(username, role, company_id)

    await req.db.execute({
      sql: 'INSERT INTO login_log (username, ip) VALUES (?, ?)',
      args: [username, (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()],
    })

    res.json({ token, role, company_id, mustChangePassword })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// User list — ONLY super_admin and gestor_admin can see the saved users.
// Any other role receives an empty list (no user data is leaked).
router.get('/users', authMiddleware, async (req, res) => {
  try {
    let role = req.user.role
    if (!role) {
      const lookup = await req.db.execute({
        sql: 'SELECT role FROM users WHERE username = ?',
        args: [req.user.username],
      })
      if (lookup.rows.length > 0) role = lookup.rows[0].role
    }

    if (role !== ROLES.SUPER_ADMIN && role !== ROLES.GESTOR_ADMIN) {
      return res.json([])
    }

    // 1. Try Turso users first
    const allTurso = await req.db.execute('SELECT id, username, email, role, company_id, professor_id, created_at, must_change_password FROM users ORDER BY created_at')
    let tursoUsers = rowsToObjects(allTurso.rows, allTurso.columns)

    if (role === ROLES.SUPER_ADMIN && req.headers['x-company-id']) {
      // super_admin navegando dentro de uma organização (header explícito):
      // vê apenas os usuários da organização ativa.
      const myCompany = req.user.company_id || 'default'
      tursoUsers = tursoUsers.filter(u => u.company_id === myCompany)
    }

    if (role === ROLES.GESTOR_ADMIN) {
      // gestor_admin vê apenas usuários da PRÓPRIA empresa, com role <= GESTOR_WEIGHT
      const myCompany = req.user.company_id || 'default'
      const maxWeight = ROLE_WEIGHT[ROLES.GESTOR_ADMIN]
      tursoUsers = tursoUsers.filter(u => u.company_id === myCompany && (ROLE_WEIGHT[u.role] || 0) <= maxWeight)
    }

    // 2. Try Supabase users (super/gestor only)
    let supabaseUsers = []
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers()
        if (!error && data?.users) {
          supabaseUsers = data.users.map(su => ({
            id: su.id,
            username: su.email,
            email: su.email,
            role: su.user_metadata?.role || 'editor_admin',
            company_id: su.user_metadata?.company_id || 'default',
            professor_id: su.user_metadata?.professor_id || '',
            created_at: su.created_at,
            must_change_password: 0,
          }))

          if (role === ROLES.SUPER_ADMIN && req.headers['x-company-id']) {
            const myCompany = req.user.company_id || 'default'
            supabaseUsers = supabaseUsers.filter(u => u.company_id === myCompany)
          }

          if (role === ROLES.GESTOR_ADMIN) {
            const myCompany = req.user.company_id || 'default'
            const maxWeight = ROLE_WEIGHT[ROLES.GESTOR_ADMIN]
            supabaseUsers = supabaseUsers.filter(u => u.company_id === myCompany && (ROLE_WEIGHT[u.role] || 0) <= maxWeight)
          }
        }
      } catch {}
    }

    // Merge: prefer Turso data, fallback to Supabase for users not in Turso
    const tursoUsernames = new Set(tursoUsers.map(u => u.username))
    const merged = [...tursoUsers, ...supabaseUsers.filter(su => !tursoUsernames.has(su.username))]

    res.json(merged)
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/users', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN), async (req, res) => {
  try {
    const { username, password, role, email, professor_id } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }
    if (role && !ROLE_NAMES[role]) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const newRole = role || ROLES.EDITOR_ADMIN
    if (newRole === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Somente super_admin pode criar usuários super_admin' })
    }
    if (req.user.role === ROLES.GESTOR_ADMIN && !canCreateRole(req.user.role, newRole)) {
      return res.status(403).json({ error: 'Cannot create users with this role' })
    }

    // Apenas super_admin pode definir a empresa de outro usuário; gestor
    // sempre cria na própria empresa (evita vazamento cross-tenant).
    const company_id = req.user.role === ROLES.SUPER_ADMIN
      ? (req.body.company_id || req.user.company_id || 'default')
      : (req.user.company_id || 'default')

    // Vínculo com cadastro de professor: só para role professor, professor
    // existente na mesma empresa e sem outro login já vinculado.
    const pid = professor_id !== undefined && professor_id !== null ? String(professor_id).trim() : ''
    if (pid) {
      if (newRole !== ROLES.PROFESSOR) {
        return res.status(400).json({ error: 'professor_id só pode ser vinculado a um usuário professor' })
      }
      const prof = await req.db.execute({
        sql: 'SELECT id FROM professores WHERE id = ? AND company_id = ?',
        args: [pid, company_id],
      })
      if (prof.rows.length === 0) return res.status(400).json({ error: 'Professor não encontrado' })
      const dup = await req.db.execute({
        sql: 'SELECT id FROM users WHERE professor_id = ? AND company_id = ?',
        args: [pid, company_id],
      })
      if (dup.rows.length > 0) return res.status(400).json({ error: 'Este professor já está vinculado a outro login' })
    }

    const existing = await req.db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: [username],
    })

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hash = await bcrypt.hash(password, 10)
    const userRole = role || ROLES.EDITOR_ADMIN
    const userEmail = email || (username + '@colegiostjm.com.br')
    await req.db.execute({
      sql: 'INSERT INTO users (username, password_hash, role, email, company_id, professor_id) VALUES (?, ?, ?, ?, ?, ?)',
      args: [username, hash, userRole, userEmail, company_id, pid],
    })

    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/users/:id', authMiddleware, async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN
    const isGestor = req.user.role === ROLES.GESTOR_ADMIN
    const targetId = req.params.id

    // Check if this is a Turso user (gestor só pode gerenciar a própria empresa)
    const gestorCompany = isGestor ? (req.user.company_id || 'default') : null
    const tursoTarget = await req.db.execute({
      sql: 'SELECT id, username, role, company_id FROM users WHERE id = ?' + (isGestor ? ' AND company_id = ?' : ''),
      args: isGestor ? [isNaN(targetId) ? -1 : parseInt(targetId), gestorCompany] : [isNaN(targetId) ? -1 : parseInt(targetId)],
    })

    if (tursoTarget.rows.length > 0) {
      const targetUser = tursoTarget.rows[0]

      // Permission check: non-super/gestor can only edit self
      if (!isSuper && !isGestor) {
        const me = await req.db.execute({
          sql: 'SELECT id FROM users WHERE username = ?',
          args: [req.user.username],
        })
        if (me.rows.length === 0 || me.rows[0].id !== targetUser.id) {
          return res.status(403).json({ error: 'Forbidden' })
        }
        // Non-manager users can only reset their own password (via /reset-password or /change-password)
        return res.status(403).json({ error: 'Somente resetar sua própria senha' })
      }

      // gestor_admin can only edit users with role <= GESTOR_WEIGHT
      if (isGestor && !canManageRole(ROLES.GESTOR_ADMIN, targetUser.role)) {
        return res.status(403).json({ error: 'Cannot edit users with higher role' })
      }

      const { username, role, email } = req.body
      const sets = []
      const args = []
      if (username !== undefined) {
        if (!isSuper) return res.status(403).json({ error: 'Only super_admin can change username' })
        const dup = await req.db.execute({
          sql: 'SELECT id FROM users WHERE username = ? AND id != ?',
          args: [username, targetUser.id],
        })
        if (dup.rows.length > 0) return res.status(400).json({ error: 'Username already taken' })
        sets.push('username = ?')
        args.push(username)
      }
      if (role) {
        if (!ROLE_NAMES[role]) return res.status(400).json({ error: 'Invalid role' })
        if (role === ROLES.SUPER_ADMIN && !isSuper) {
          return res.status(403).json({ error: 'Somente super_admin pode atribuir super_admin' })
        }
        if (!isSuper) {
          if (!isGestor || !canManageRole(ROLES.GESTOR_ADMIN, role)) {
            return res.status(403).json({ error: 'Cannot assign this role' })
          }
        }
        sets.push('role = ?')
        args.push(role)
      }
      if (email !== undefined) {
        sets.push('email = ?')
        args.push(email)
      }
      if (req.body.company_id !== undefined) {
        if (!isSuper) return res.status(403).json({ error: 'Only super_admin can change company_id' })
        sets.push('company_id = ?')
        args.push(req.body.company_id)
      }
      if (req.body.professor_id !== undefined) {
        const pid = String(req.body.professor_id).trim()
        const effectiveRole = role !== undefined ? role : targetUser.role
        const companyForUser = req.body.company_id !== undefined ? req.body.company_id : (targetUser.company_id || 'default')
        if (pid) {
          if (effectiveRole !== ROLES.PROFESSOR) {
            return res.status(400).json({ error: 'professor_id só pode ser vinculado a um usuário professor' })
          }
          const prof = await req.db.execute({
            sql: 'SELECT id FROM professores WHERE id = ? AND company_id = ?',
            args: [pid, companyForUser],
          })
          if (prof.rows.length === 0) return res.status(400).json({ error: 'Professor não encontrado' })
          const dup = await req.db.execute({
            sql: 'SELECT id FROM users WHERE professor_id = ? AND company_id = ? AND id != ?',
            args: [pid, companyForUser, targetUser.id],
          })
          if (dup.rows.length > 0) return res.status(400).json({ error: 'Este professor já está vinculado a outro login' })
        }
        sets.push('professor_id = ?')
        args.push(pid)
      }
      if (sets.length === 0) {
        return res.status(400).json({ error: 'Nothing to update' })
      }
      args.push(targetUser.id)
      await req.db.execute({
        sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
        args,
      })
      return res.json({ success: true })
    }

    // Not a Turso user — try Supabase
    if (!supabaseAdmin) return res.status(404).json({ error: 'User not found' })

    const suid = req.user.supabaseUid
    if (!suid) return res.status(404).json({ error: 'User not found' })

    // gestor_admin can edit Supabase users they can manage (mesma empresa)
    if (isGestor) {
      // Fetch target user's role to check permission
      const { data: td, error: tdErr } = await supabaseAdmin.auth.admin.getUserById(targetId)
      if (tdErr || !td?.user) return res.status(404).json({ error: 'User not found' })
      const targetRole = td.user.user_metadata?.role || 'editor_admin'
      if ((td.user.user_metadata?.company_id || 'default') !== gestorCompany) {
        return res.status(403).json({ error: 'Cannot edit users from another company' })
      }
      if (!canManageRole(ROLES.GESTOR_ADMIN, targetRole)) {
        return res.status(403).json({ error: 'Cannot edit users with higher role' })
      }
    } else if (!isSuper) {
      // Non-manager users can only reset their own password (via /reset-password or /change-password)
      return res.status(403).json({ error: 'Somente resetar sua própria senha' })
    }

    const { email, role, professor_id } = req.body
    const supdate = {}
    if (email !== undefined) supdate.email = email
    if (role !== undefined || req.body.company_id !== undefined || professor_id !== undefined) {
      const { data: td, error: tdErr } = await supabaseAdmin.auth.admin.getUserById(targetId)
      if (tdErr || !td?.user) return res.status(404).json({ error: 'User not found' })
      const existingMeta = td.user.user_metadata || {}
      const meta = { ...existingMeta }
      if (role !== undefined) {
        if (!ROLE_NAMES[role]) return res.status(400).json({ error: 'Invalid role' })
        if (role === ROLES.SUPER_ADMIN && !isSuper) {
          return res.status(403).json({ error: 'Somente super_admin pode atribuir super_admin' })
        }
        if (!isSuper) {
          if (!isGestor || !canManageRole(ROLES.GESTOR_ADMIN, role)) {
            return res.status(403).json({ error: 'Cannot assign this role' })
          }
        }
        meta.role = role
      }
      if (req.body.company_id !== undefined) {
        if (!isSuper) return res.status(403).json({ error: 'Only super_admin can change company_id' })
        meta.company_id = req.body.company_id || 'default'
      }
      if (professor_id !== undefined) {
        const pid = String(professor_id).trim()
        const effectiveRole = role !== undefined ? role : (existingMeta.role || 'editor_admin')
        const companyForUser = meta.company_id || 'default'
        if (pid) {
          if (effectiveRole !== ROLES.PROFESSOR) {
            return res.status(400).json({ error: 'professor_id só pode ser vinculado a um usuário professor' })
          }
          const prof = await req.db.execute({
            sql: 'SELECT id FROM professores WHERE id = ? AND company_id = ?',
            args: [pid, companyForUser],
          })
          if (prof.rows.length === 0) return res.status(400).json({ error: 'Professor não encontrado' })
          const dup = await req.db.execute({
            sql: 'SELECT id FROM users WHERE professor_id = ? AND company_id = ?',
            args: [pid, companyForUser],
          })
          if (dup.rows.length > 0) return res.status(400).json({ error: 'Este professor já está vinculado a outro login' })
        }
        meta.professor_id = pid
      }
      supdate.user_metadata = meta
    }
    if (Object.keys(supdate).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, supdate)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Reset password — super_admin/gestor_admin can reset for managed users; others can reset only themselves
router.post('/users/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password required' })

    const isSuper = req.user.role === ROLES.SUPER_ADMIN
    const isGestor = req.user.role === ROLES.GESTOR_ADMIN
    const targetId = req.params.id

    // Try Turso first
    const me = await req.db.execute({
      sql: 'SELECT id, role FROM users WHERE username = ?',
      args: [req.user.username],
    })
    if (me.rows.length > 0) {
      const currentUser = me.rows[0]
      const tid = parseInt(targetId)
      // Allow if: same user, OR super_admin, OR gestor_admin managing lower-or-equal role
      if (currentUser.id !== tid && !isSuper && !isGestor) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      if (currentUser.id !== tid && isGestor) {
        const gestorCompany = req.user.company_id || 'default'
        const targetExists = await req.db.execute({
          sql: 'SELECT role FROM users WHERE id = ? AND company_id = ?',
          args: [tid, gestorCompany],
        })
        if (targetExists.rows.length === 0) return res.status(404).json({ error: 'User not found' })
        if (!canManageRole(ROLES.GESTOR_ADMIN, targetExists.rows[0].role)) {
          return res.status(403).json({ error: 'Cannot reset password for users with higher role' })
        }
      }
      if (currentUser.id !== tid && isSuper) {
        const targetExists = await req.db.execute({
          sql: 'SELECT id FROM users WHERE id = ?',
          args: [tid],
        })
        if (targetExists.rows.length === 0) return res.status(404).json({ error: 'User not found' })
      }
      const hash = await bcrypt.hash(password, 10)
      await req.db.execute({
        sql: 'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
        args: [hash, tid],
      })
      return res.json({ success: true })
    }

    // Not in Turso — try Supabase
    if (!supabaseAdmin) return res.status(404).json({ error: 'User not found' })

    const suid = req.user.supabaseUid
    if (!suid) return res.status(404).json({ error: 'User not found' })

    // gestor_admin: fetch target user to check role AND company
    if (isGestor) {
      const { data: td, error: tdErr } = await supabaseAdmin.auth.admin.getUserById(targetId)
      if (tdErr || !td?.user) return res.status(404).json({ error: 'User not found' })
      const targetRole = td.user.user_metadata?.role || 'editor_admin'
      if ((td.user.user_metadata?.company_id || 'default') !== (req.user.company_id || 'default')) {
        return res.status(403).json({ error: 'Cannot reset password for users from another company' })
      }
      if (!canManageRole(ROLES.GESTOR_ADMIN, targetRole)) {
        return res.status(403).json({ error: 'Cannot reset password for users with higher role' })
      }
    } else if (!isSuper && suid !== targetId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword required' })
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' })
    }

    const result = await req.db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [req.user.username],
    })

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(currentPassword, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await req.db.execute({
      sql: 'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE username = ?',
      args: [hash, req.user.username],
    })

    const newToken = generateToken(req.user.username, user.role || null, user.company_id || 'default')
    res.json({ success: true, token: newToken })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/users/:id', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN), async (req, res) => {
  try {
    const targetId = req.params.id
    const isGestor = req.user.role === ROLES.GESTOR_ADMIN

    if (isGestor) {
      const gestorCompany = req.user.company_id || 'default'
      const tursoTarget = await req.db.execute({
        sql: 'SELECT id, username, role FROM users WHERE id = ? AND company_id = ?',
        args: [isNaN(targetId) ? -1 : parseInt(targetId), gestorCompany],
      })
      if (tursoTarget.rows.length === 0) return res.status(404).json({ error: 'User not found' })
      const t = tursoTarget.rows[0]

      // gestor cannot delete themselves
      const me = await req.db.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [req.user.username],
      })
      if (me.rows.length > 0 && me.rows[0].id === t.id) {
        return res.status(403).json({ error: 'You cannot delete yourself' })
      }

      // gestor can only delete users with role <= GESTOR_WEIGHT
      if (!canManageRole(ROLES.GESTOR_ADMIN, t.role)) {
        return res.status(403).json({ error: 'Cannot delete users with higher role' })
      }
    }

    await req.db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [isNaN(targetId) ? targetId : parseInt(targetId)],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/login-log', authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const result = await req.db.execute('SELECT * FROM login_log ORDER BY login_time DESC')
    const logs = rowsToObjects(result.rows, result.columns)

    const enriched = []
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      let duration = ''
      const next = logs.slice(0, i).find((l) => l.username === log.username)
      if (next) {
        const diffMs = new Date(next.login_time.replace(' ', 'T') + 'Z').getTime() - new Date(log.login_time.replace(' ', 'T') + 'Z').getTime()
        const mins = Math.floor(diffMs / 60000)
        if (mins < 1) duration = '< 1 min'
        else if (mins < 60) duration = `${mins} min`
        else duration = `${Math.floor(mins / 60)}h ${mins % 60}min`
      }
      enriched.push({ ...log, duration })
    }

    res.json(enriched)
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/login-log/:id', authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    await req.db.execute({
      sql: 'DELETE FROM login_log WHERE id = ?',
      args: [req.params.id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
