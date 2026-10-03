import 'dotenv/config'

const { default: app } = await import('../api/index.js')
const port = Number(process.env.PORT || 3002)
app.listen(port, () => console.log(`[probe-server] api listening on http://localhost:${port} (TENANT_PINNED_ORG: ${process.env.TENANT_PINNED_ORG ? 'ATIVO' : 'desativado'})`))
