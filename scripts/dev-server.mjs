import 'dotenv/config'

const { default: app } = await import('../api/index.js')
app.listen(3001, () => console.log('[dev-server] api listening on http://localhost:3001'))
