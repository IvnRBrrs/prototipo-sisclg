import { defineConfig, devices } from '@playwright/test'

// Testes de UI E2E ("como um usuário humano"): o webServer sobe o app
// completo (vite dev = frontend + API na MESMA porta 5173 via middleware),
// roda a suíte e derruba o servidor ao final.
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/artifacts/test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    // Modo "assistir" (npm run test:ui:watch): câmera lenta para o humano
    // acompanhar cada ação na janela visível do navegador.
    launchOptions: { slowMo: process.env.UI_WATCH === '1' ? 800 : 0 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'pipe',
  },
})
