import { useRef, useCallback } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import LazyImage from '../../components/LazyImage'

interface HeroProps {
  content: Record<string, string>
}

export default function Hero({ content }: HeroProps) {
  const glassRef = useRef<HTMLDivElement>(null!)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = glassRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = (e.clientX - centerX) / (rect.width / 2)
    const deltaY = (e.clientY - centerY) / (rect.height / 2)
    rotateX.set(-deltaY * 6)
    rotateY.set(deltaX * 6)
  }, [])

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0)
    rotateY.set(0)
  }, [])

  return (
    <section id="hero" className="hero-section">
      <div className="hero-overlay" />
      <LazyImage
        src={content.hero_background || '/stj/assets/BANNER-1920x793-CSJT-2048x846.png'}
        asBackground
        className="hero-bg"
        loading="eager"
      />

      <div className="container hero-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="hero-text"
        >
          <motion.div
            ref={glassRef}
            className="hero-text-glass"
            style={{ rotateX, rotateY, perspective: 800, transformStyle: 'preserve-3d' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <span className="hero-welcome">{content.hero_welcome || 'Tradição desde 1989'}</span>
            <h1 className="hero-title">
              {content.hero_title1 || 'Educação que'}
              <br />
              <span className="hero-accent">{content.hero_title2 || 'transforma futuros'}</span>
            </h1>
            <p className="hero-description">
              {content.hero_description || 'Há mais de três décadas formando cidadãos críticos, autônomos e preparados para os desafios do amanhã.'}
            </p>
            <div className="hero-actions">
              <a href={content.btn_primary_href || '#segmentos'} className="btn btn-primary">
                {content.btn_primary_text || 'Conheça Nossos Segmentos'}
              </a>
              <a href={content.btn_outline_href || '#contact'} className="btn btn-outline btn-outline-light">
                {content.btn_outline_text || 'Entre em Contato'}
              </a>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="scroll-indicator"
        >
          <div className="scroll-mouse">
            <div className="scroll-dot" />
          </div>
          <span>{content.scroll_text || 'Role para conhecer'}</span>
        </motion.div>
      </div>

      <style>{`
        .hero-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 0;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(6,36,74,0.85) 0%, rgba(9,52,106,0.65) 50%, rgba(21,61,138,0.4) 100%);
          z-index: 1;
        }
        .hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          padding-top: 80px;
          padding-bottom: 80px;
        }
        .hero-text {
          max-width: 720px;
          position: relative;
        }
        .hero-text-glass {
          padding: 40px 48px;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
          max-width: 100%;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }
        .hero-welcome {
          display: inline-block;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 20px;
          padding: 6px 16px;
          border: 1px solid rgba(244,240,132,0.3);
          border-radius: 100px;
          background: rgba(244,240,132,0.08);
          max-width: 100%;
        }
        .hero-title {
          font-size: clamp(1.8rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          color: white;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
          max-width: 100%;
        }
        .hero-accent {
          color: var(--accent);
        }
        .hero-description {
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          color: rgba(255,255,255,0.85);
          max-width: 100%;
          line-height: 1.6;
          margin-bottom: 32px;
          overflow-wrap: break-word;
        }
        .hero-actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .btn-outline-light {
          border-color: rgba(255,255,255,0.4);
          color: white;
        }
        .btn-outline-light:hover {
          background: white;
          color: var(--primary);
          border-color: white;
        }
        .scroll-indicator {
          position: absolute;
          top: 13%;
          right: 0%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.5);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          z-index: 100;
        }
        .scroll-mouse {
          width: 20px;
          height: 32px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          display: flex;
          justify-content: center;
          padding-top: 5px;
        }
        .scroll-dot {
          width: 3px;
          height: 8px;
          border-radius: 2px;
          background: var(--accent);
          animation: scroll-bounce 2s ease-in-out infinite;
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(6px); opacity: 0.3; }
        }
        @media (max-width: 768px) {
          .hero-text-glass { padding: 28px 20px; }
          .hero-actions { flex-direction: column; }
          .hero-actions .btn { width: 100%; text-align: center; }
          .hero-title { font-size: clamp(1.5rem, 7vw, 2.2rem); }
          .scroll-indicator { display: none; }
        }
      `}</style>
    </section>
  )
}
