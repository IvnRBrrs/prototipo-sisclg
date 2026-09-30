import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCachedPageContent, fetchPageContentCached, getCachedContentSync } from './contentCache'
import PageBuilder from './PageBuilder'
import DynamicStyles from './DynamicStyles'

function PageSkeleton() {
  return (
    <div className="page-skeleton">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="page-skeleton-block">
          <div className="page-skeleton-line w-60" />
          <div className="page-skeleton-line w-80" />
          <div className="page-skeleton-line w-40" />
        </div>
      ))}
      <style>{`
        .page-skeleton { padding: 60px 20px; max-width: 1100px; margin: 0 auto; }
        .page-skeleton-block { margin-bottom: 48px; }
        .page-skeleton-line { height: 20px; border-radius: 8px; background: #e0e0e0; margin-bottom: 12px; animation: skeletonPulse 1.5s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }
        .w-60 { width: 60%; } .w-80 { width: 80%; } .w-40 { width: 40%; }
      `}</style>
    </div>
  )
}

function CtaOverlay() {
  const globalContent = getCachedContentSync()
  const ctaHidden = globalContent?.calltoaction_hidden === '1'
  const ctaTitle = globalContent?.calltoaction_title
  const hasCtaContent = !!ctaTitle
  const [dismissed, setDismissed] = useState(false)
  const [autoClosed, setAutoClosed] = useState(false)

  const durationSec = parseInt(globalContent?.calltoaction_duration || '10', 10)
  const [countdown, setCountdown] = useState(durationSec)

  const visible = !ctaHidden && !dismissed && !autoClosed

  useEffect(() => {
    if (ctaHidden) return
    setAutoClosed(false)
    setDismissed(false)
    setCountdown(durationSec)
    if (durationSec <= 0) return
    const timer = setTimeout(() => setAutoClosed(true), durationSec * 1000)
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [ctaHidden, durationSec])

  if (!visible) return null

  const bgImage = globalContent?.calltoaction_image || '/stj/assets/BANNER-1920x793-CSJT-2048x846.png'
  const ctaText = globalContent?.calltoaction_text || ''
  const ctaLink = globalContent?.calltoaction_link || '/matricula'
  const ctaLinkLabel = globalContent?.calltoaction_link_label || 'Matricule-se Agora'

  return (
    <>
      <style>{`
        @keyframes plmSpin { to { transform: rotate(360deg) } }
        @keyframes plmBtnPulse {
          0%,100% { box-shadow: 0 0 8px rgba(244,240,132,0.3); }
          50% { box-shadow: 0 0 28px rgba(244,240,132,0.8), 0 0 60px rgba(244,240,132,0.3); }
        }
        .plm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .plm-card {
          position: relative; z-index: 1; margin-top: -12vh;
          width: 92vw; max-width: 560px;
          min-height: 40vh; max-height: 75vh;
          border-radius: 20px; overflow: hidden;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: rgba(0,0,0,0.15);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .plm-card--expanded { 
          min-width:auto;
          width: 70vw; 
          min-height: auto; 
          height: 50vh; 
          max-height: none;
        }
        .plm-card-bg {
          position: absolute; inset: 0;
          background-size: contain; background-repeat: no-repeat;
          background-position: center; background-color: #06244a;
          opacity: 0.4;
        }
        .plm-card-gradient {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(6,36,74,0.8) 0%, rgba(9,52,106,0.6) 100%);
        }
        .plm-body {
          position: relative; z-index: 2;
          text-align: left; padding: 32px 28px;
          width: 100%; box-sizing: border-box;
        }
        .plm-spinner {
          width: 36px; height: 36px; margin: 0 auto 16px;
          border: 2px solid rgba(244,240,132,0.25);
          border-top-color: #F4F084;
          border-radius: 50%;
          animation: plmSpin 0.9s linear infinite;
        }
        .plm-countdown {
          width: 40px; height: 40px; margin: 0 auto 16px;
          border: 2px solid rgba(244,240,132,0.5);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Open Sans', sans-serif;
          font-size: 1rem; font-weight: 700;
          color: #F4F084;
        }
        .plm-badge {
          display: inline-block;
          font-family: 'Open Sans', sans-serif;
          font-size: 0.7rem; font-weight: 600;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: #F4F084; margin-bottom: 12px;
          padding: 4px 12px;
          border: 1px solid rgba(244,240,132,0.3);
          border-radius: 100px;
          background: rgba(244,240,132,0.08);
        }
        .plm-title {
          font-family: 'Open Sans', sans-serif;
          font-size: clamp(1.3rem, 5vw, 2.2rem);
          font-weight: 800; line-height: 1.15;
          color: #fff; margin: 0 0 10px;
          letter-spacing: -0.02em;
        }
        .plm-title-accent { color: #F4F084; }
        .plm-desc {
          font-family: 'Open Sans', sans-serif;
          font-size: clamp(0.75rem, 2vw, 0.9rem);
          color: rgba(255,255,255,0.85);
          line-height: 1.6; margin: 0;
          max-width: 420px;
        }
        .plm-close {
          position: absolute; top: 12px; right: 12px; z-index: 3;
          width: 32px; height: 32px; padding: 0;
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 50%;
          background: rgba(0,0,0,0.3);
          color: #fff; font-size: 1.1rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
          line-height: 1;
        }
        .plm-close:hover { background: rgba(255,255,255,0.25); }
        .plm-btn-wrapper { margin-top: 16px; }
        .plm-btn {
          display: inline-block;
          padding: 12px 32px;
          font-family: 'Open Sans', sans-serif;
          font-size: 1rem; font-weight: 700;
          color: #1a1a2e; text-decoration: none;
          background: linear-gradient(135deg, #F4F084, #e8c84a);
          border-radius: 8px;
          animation: plmBtnPulse 2s ease-in-out infinite;
          transition: transform 0.2s;
        }
        .plm-btn:hover { transform: scale(1.06); }
        @media (min-width: 480px) {
          .plm-overlay { padding: 24px; }
          .plm-card { width: 80vw; max-width: 560px; min-height: 42vh; max-height: 70vh; border-radius: 22px; }
          .plm-body { padding: 36px 32px; }
          .plm-spinner { width: 38px; height: 38px; }
          .plm-badge { font-size: 0.72rem; padding: 5px 14px; }
        }
        @media (min-width: 768px) {
          .plm-overlay { padding: 0; }
          .plm-card { width: 50vw; max-width: 600px; min-height: 45vh; max-height: 60vh; border-radius: 24px; margin-top: -15vh; }
          .plm-body { padding: 40px 36px; }
          .plm-spinner { width: 40px; height: 40px; margin-bottom: 20px; }
          .plm-badge { font-size: 0.75rem; margin-bottom: 16px; }
          .plm-title { font-size: clamp(1.5rem, 4vw, 2.5rem); }
          .plm-desc { font-size: clamp(0.8rem, 1.5vw, 0.95rem); }
        }
        @media (min-width: 1024px) {
          .plm-card { max-height: 50vh; }
          .plm-card--expanded { max-height: none; }
        }
      `}</style>
      <div className="plm-overlay">
        <div className={'plm-card' + (hasCtaContent ? ' plm-card--expanded' : '')}>
          <div className="plm-card-bg" style={{ backgroundImage: `url(${bgImage})` }} />
          <div className="plm-card-gradient" />
          <button className="plm-close" onClick={() => setDismissed(true)} aria-label="Fechar">&times;</button>
          <div className="plm-body">
            {hasCtaContent ? (
              <div className="plm-countdown">{countdown}</div>
            ) : (
              <div className="plm-spinner" />
            )}
            {hasCtaContent ? (
              <>
                <h1 className="plm-title">{ctaTitle}</h1>
                {ctaText && <p className="plm-desc">{ctaText}</p>}
                <div className="plm-btn-wrapper">
                  <a href={ctaLink} className="plm-btn">{ctaLinkLabel}</a>
                </div>
              </>
            ) : (
              <>
                <div className="plm-badge">Tradição desde 1989</div>
                <h1 className="plm-title">
                  Educação que<br />
                  <span className="plm-title-accent">transforma futuros</span>
                </h1>
                <p className="plm-desc">
                  Há mais de três décadas formando cidadãos críticos, autônomos e preparados para os desafios do amanhã.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function DynamicPage() {
  const { slug } = useParams()
  const pageSlug = slug || 'home'

  const [content, setContent] = useState<Record<string, string>>(() => {
    const cached = getCachedPageContent(pageSlug)
    return cached || {}
  })
  const [contentLoading, setContentLoading] = useState(() => {
    return !getCachedPageContent(pageSlug)
  })
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const cached = getCachedPageContent(pageSlug)
    if (cached) { setContent(cached); setContentLoading(false) }
    else { setContent({}); setContentLoading(true) }
    setNotFound(false)

    let cancelled = false
    fetchPageContentCached(pageSlug).then(({ data }) => {
      if (cancelled) return
      setContent(data)
      setContentLoading(false)
    }).catch((err: any) => {
      if (cancelled) return
      if (err?.response?.status === 404) {
        setNotFound(true)
        setContentLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [pageSlug])

  if (notFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--primary)', margin: 0, lineHeight: 1 }}>404</h1>
        <h2 style={{ color: 'var(--primary-dark)', margin: '16px 0 8px' }}>Ops, a página não existe</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: 32, maxWidth: 400 }}>
          A página que você está procurando pode ter sido removida ou o endereço está incorreto.
        </p>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 32px', background: 'var(--primary)', color: '#fff',
          borderRadius: 8, textDecoration: 'none', fontWeight: 600,
          fontSize: '1rem', transition: 'background 0.3s',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-dark)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
        >
          Voltar para Home
        </a>
      </div>
    )
  }

  let sectionsOrder: { title: string; instanceId?: string }[] = []
  try { if (content._sections) sectionsOrder = JSON.parse(content._sections) } catch { }

  const sections = sectionsOrder.map((s) => ({ title: s.title, instanceId: s.instanceId, content }))

  return (
    <>
      <DynamicStyles content={content} />
      <CtaOverlay />
      {contentLoading && sections.length === 0 ? <PageSkeleton /> : <PageBuilder sections={sections} />}
    </>
  )
}
