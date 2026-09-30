import { useState, useEffect } from 'react'

const styleId = 'loading-screen-styles'
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const s = document.createElement('style')
  s.id = styleId
  s.textContent = `
    @keyframes lsdots { 0%,20% { opacity: 0 } 50% { opacity: 1 } 80%,100% { opacity: 0 } }
    @keyframes lsspin { to { transform: rotate(360deg) } }
    @keyframes lspulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
    .ls-dot { display: inline-block; animation: lsdots 1.4s ease-in-out infinite }
    .ls-dot:nth-child(1) { animation-delay: 0s }
    .ls-dot:nth-child(2) { animation-delay: 0.2s }
    .ls-dot:nth-child(3) { animation-delay: 0.4s }
    .ls-spinner { width: 48px; height: 48px; margin: 0 auto; border: 3px solid rgba(244,240,132,0.25); border-top-color: #F4F084; border-radius: 50%; animation: lsspin 0.9s linear infinite }
    .ls-pulse { animation: lspulse 2s ease-in-out infinite }
  `
  document.head.appendChild(s)
}

export default function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/stj/assets/BANNER-1920x793-CSJT-2048x846.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(2px) scale(1.02)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(6,36,74,0.88) 0%, rgba(9,52,106,0.7) 50%, rgba(21,61,138,0.45) 100%)',
      }} />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div className="ls-spinner" />
        <p className="ls-pulse" style={{
          marginTop: 24, fontFamily: "'Open Sans', sans-serif",
          fontSize: '1.05rem', fontWeight: 500,
          color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em',
        }}>
          Carregando
          <span className="ls-dot">.</span>
          <span className="ls-dot">.</span>
          <span className="ls-dot">.</span>
        </p>
      </div>
    </div>
  )
}
