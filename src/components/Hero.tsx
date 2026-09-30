import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null!)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const textOpacity = useTransform(scrollYProgress, [0.3, 0.55], [1, 0])
  const textY = useTransform(scrollYProgress, [0.3, 0.55], [0, -60])
  const blurAmount = useTransform(scrollYProgress, [0.3, 0.55], [0, 6])
  const textBlur = useTransform(blurAmount, (v) => `blur(${v}px)`)

  return (
    <section id="hero" ref={sectionRef} className="hero-section">
      <div className="hero-overlay" />
      <div
        className="hero-bg"
        style={{ backgroundImage: `url(/stj/assets/BANNER-1920x793-CSJT-2048x846.png)` }}
      />

      <div className="container hero-content">
        <motion.div
          style={{ opacity: textOpacity, y: textY, filter: textBlur }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="hero-text"
        >
          <div className="hero-text-glass">
            <span className="hero-welcome">Tradi&ccedil;&atilde;o desde 1989</span>
            <h1 className="hero-title">
              Educa&ccedil;&atilde;o que
              <br />
              <span className="hero-accent">transforma futuros</span>
            </h1>
            <p className="hero-description">
              H&aacute; mais de tr&ecirc;s d&eacute;cadas formando cidad&atilde;os cr&iacute;ticos,
              aut&ocirc;nomos e preparados para os desafios do amanh&atilde;.
            </p>
            <div className="hero-actions">
              <a href="#segmentos" className="btn btn-primary">
                Conhe&ccedil;a Nossos Segmentos
              </a>
              <a href="#contact" className="btn btn-outline btn-outline-light">
                Entre em Contato
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="scroll-indicator"
        >
          <div className="scroll-mouse">
            <div className="scroll-dot" />
          </div>
          <span>Role para conhecer</span>
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
        }
        .hero-title {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 800;
          line-height: 1.05;
          color: white;
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .hero-accent {
          color: var(--accent);
        }
        .hero-description {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.8);
          max-width: 520px;
          line-height: 1.7;
          margin-bottom: 36px;
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
          top: 120px;
          right: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.5);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
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
          .hero-actions { flex-direction: column; }
          .hero-text-glass { padding: 28px 20px; }
        }
      `}</style>
    </section>
  )
}
