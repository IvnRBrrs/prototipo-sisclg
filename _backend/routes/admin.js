import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

const MESSAGE_ROLES = [ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.SECRETARIA_ESCOLAR]
const PRE_ENROLLMENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.SECRETARIA_ESCOLAR]

router.get('/preload', authMiddleware, async (req, res) => {
  try {
    const isSuper = req.user.role === 'super_admin' && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const canMessages = MESSAGE_ROLES.includes(req.user.role)
    const canPreEnrollments = PRE_ENROLLMENT_ROLES.includes(req.user.role)

    const whereCompany = isSuper ? '' : ' WHERE company_id = ?'
    const args = isSuper ? [] : [company_id]

    const [contentResult, imagesResult, pagesResult, blogResult, tagsResult, messagesResult, preEnrollmentsResult] = await Promise.all([
      req.db.execute({ sql: 'SELECT key, value FROM content' + whereCompany, args }),
      req.db.execute({
        sql: `SELECT id, filename, type, component_type, thumbnail, created_at FROM images${whereCompany} ORDER BY created_at DESC`,
        args,
      }),
      req.db.execute({ sql: 'SELECT * FROM pages' + whereCompany, args }),
      req.db.execute({
        sql: `SELECT id, title, subtitle, author, date, tags, images, slug, published, created_at FROM blog_posts${whereCompany} ORDER BY date DESC LIMIT 50`,
        args,
      }),
      req.db.execute({
        sql: `SELECT tags FROM blog_posts WHERE tags != '[]'` + (isSuper ? '' : ' AND company_id = ?'),
        args: isSuper ? [] : [company_id],
      }),
      canMessages
        ? req.db.execute({
            sql: 'SELECT id, name, email, phone, message, created_at, read, archived FROM contact_messages' + whereCompany + ' ORDER BY created_at DESC',
            args,
          })
        : Promise.resolve({ rows: [], columns: [] }),
      canPreEnrollments
        ? req.db.execute({
            sql: 'SELECT * FROM pre_enrollments' + whereCompany + ' ORDER BY created_at DESC',
            args,
          })
        : Promise.resolve({ rows: [], columns: [] }),
    ])

    const content = {}
    contentResult.rows.forEach((r) => { content[r.key] = r.value })

    const tagSet = new Set()
    tagsResult.rows.forEach((row) => {
      try { JSON.parse(row.tags).forEach((t) => tagSet.add(t)) } catch {}
    })

    res.json({
      content,
      images: rowsToObjects(imagesResult.rows, imagesResult.columns),
      pages: rowsToObjects(pagesResult.rows, pagesResult.columns),
      blogPosts: rowsToObjects(blogResult.rows, blogResult.columns),
      tags: Array.from(tagSet).sort(),
      messages: rowsToObjects(messagesResult.rows, messagesResult.columns),
      preEnrollments: rowsToObjects(preEnrollmentsResult.rows, preEnrollmentsResult.columns),
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
