import { useState, useEffect, useCallback } from 'react'
import LazyImage from '../../components/LazyImage'

interface GaleriaProps {
  content: Record<string, string>
}

export default function Galeria({ content }: GaleriaProps) {
  const [current, setCurrent] = useState(0)

  let imagens: string[] = []
  try {
    const raw = content._gal_images
    if (raw) {
      const parsed = JSON.parse(raw)
      imagens = parsed.map((i: any) => i.url).filter(Boolean)
    }
  } catch {}

  const next = useCallback(() => {
    if (imagens.length === 0) return
    setCurrent((c) => (c + 1) % imagens.length)
  }, [imagens.length])

  const prev = useCallback(() => {
    if (imagens.length === 0) return
    setCurrent((c) => (c - 1 + imagens.length) % imagens.length)
  }, [imagens.length])

  useEffect(() => {
    if (imagens.length <= 1) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [next, imagens.length])

  if (imagens.length === 0) return null

  return (
    <section id="galeria" className="section carrossel-section">
      <div className="container">
        <div className="section-header">
          <span className="section-label">{content.gal_label || 'Galeria'}</span>
          <h2 className="section-title">
            {content.gal_title_prefix || 'Nossa'} <span className="highlight">{content.gal_title_highlight || 'Estrutura'}</span>
          </h2>
          <p className="section-subtitle">
            {content.gal_subtitle || 'Conheça um pouco do nosso ambiente e das atividades que fazem parte do dia a dia do colégio.'}
          </p>
        </div>

        <div className="carrossel-wrapper">
          <div className="carrossel-viewport">
            {imagens.map((url, i) => (
              <div
                key={i}
                className={`carrossel-slide ${i === current ? 'active' : ''}`}
              >
                <LazyImage
                  src={url}
                  alt={`Imagem ${i + 1}`}
                  className="carrossel-image"
                />
              </div>
            ))}
          </div>

          {imagens.length > 1 && (
            <>
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
                    onClick={() => setCurrent(i)}
                    aria-label={`Ir para imagem ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
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
          background: #e8e8e8;
        }
        .carrossel-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .carrossel-slide.active {
          opacity: 1;
        }
        .carrossel-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
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
        .carrossel-prev { left: 16px; }
        .carrossel-next { right: 16px; }
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
