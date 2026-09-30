import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import apiApp from './api/index.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/api')) {
            apiApp(req, res, next)
          } else {
            next()
          }
        })
      },
    },
  ],
})
