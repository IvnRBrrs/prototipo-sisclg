import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const imagens = [
  '/stj/assets/carrossel-1.jpg',
  '/stj/assets/carrossel-2.jpg',
  '/stj/assets/carrossel-3.jpg',
  '/stj/assets/carrossel-4.jpg',
  '/stj/assets/carrossel-5.jpg',
  '/stj/assets/carrossel-6.jpg',
]

export default function Portfolio() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const next = useCallback(() => {
    setDirection(1)
    setCurrent((c) => (c + 1) % imagens.length)
  }, [])

  const prev = useCallback(() => {
    setDirection(-1)
    setCurrent((c) => (c - 1 + imagens.length) % imagens.length)
  }, [])

  useEffect(() => {
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [next])

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  }

  return (
    <section id="galeria" className="section carrossel-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-label">Galeria</span>
          <h2 className="section-title">
            Nossa <span className="highlight">Estrutura</span>
          </h2>
          <p className="section-subtitle">
            Conhe&ccedil;a um pouco do nosso ambiente e das atividades que fazem parte do dia a dia do col&eacute;gio.
          </p>
        </motion.div>

        <div className="carrossel-wrapper">
          <div className="carrossel-viewport">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="carrossel-slide"
              >
                <div
                  className="carrossel-image"
                  style={{ backgroundImage: `url(${imagens[current]})` }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <button className="carrossel-btn carrossel-prev" onClick={prev} aria-label="Anterior">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 17L7 10L13 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="carrossel-btn carrossel-next" onClick={next} aria-label="Próximo">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 3L13 10L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="carrossel-dots">
            {imagens.map((_, i) => (
              <button
                key={i}
                className={`carrossel-dot ${i === current ? 'active' : ''}`}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
                aria-label={`Ir para imagem ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .carrossel-section {
          background: var(--bg-white);
        }
        .carrossel-wrapper {
          position: relative;
          max-width: 900px;
          margin: 0 auto;
        }
        .carrossel-viewport {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          aspect-ratio: 16 / 9;
          background: var(--border);
        }
        .carrossel-slide {
          position: absolute;
          inset: 0;
        }
        .carrossel-image {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .carrossel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.9);
          color: var(--primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        .carrossel-btn:hover {
          background: white;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .carrossel-prev { left: -22px; }
        .carrossel-next { right: -22px; }
        .carrossel-dots {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
        }
        .carrossel-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--primary-light);
          background: transparent;
          cursor: pointer;
          transition: all 0.3s;
          padding: 0;
        }
        .carrossel-dot.active {
          background: var(--primary);
          border-color: var(--primary);
          transform: scale(1.2);
        }
        @media (max-width: 768px) {
          .carrossel-btn { display: none; }
        }
      `}</style>
    </section>
  )
}
