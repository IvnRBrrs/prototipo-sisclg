import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DynamicPage from './cms/DynamicPage'
import GlobalNavbar from './components/GlobalNavbar'
import GlobalFooter from './components/GlobalFooter'
import WhatsAppButton from './components/WhatsAppButton'

function isLowEnd(): boolean {
  if (typeof window === 'undefined') return true
  const mem = (navigator as any).deviceMemory
  const cpu = navigator.hardwareConcurrency
  if (window.innerWidth < 768) return true
  if (mem !== undefined && mem < 4) return true
  if (cpu !== undefined && cpu < 4) return true
  return false
}

const ThreeBackground = lazy(() => {
  if (isLowEnd()) return Promise.resolve({ default: () => null })
  return import('./components/ThreeBackground')
})
const AdminApp = lazy(() => import('./admin/AdminApp'))

function Loading() { return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-light)', fontFamily: 'var(--font-sans)' }}>Carregando...</div> }

function SiteLayout() {
  return (
    <div className="site-layout">
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>
      <GlobalNavbar />
      <WhatsAppButton />
      <main className="site-main" style={{ position: 'relative', zIndex: 1 }}>
        <DynamicPage />
      </main>
      <GlobalFooter />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<Loading />}><AdminApp /></Suspense>} />
        <Route path="/:slug" element={<SiteLayout />} />
        <Route path="/" element={<SiteLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
