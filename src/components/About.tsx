import { motion } from 'framer-motion'

export default function About() {
  return (
    <section id="historia" className="section about-section">
      <div className="container">
        <div className="about-grid">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="about-text"
          >
            <span className="section-label">Nossa História</span>
            <h2 className="display-title about-display">Nossa</h2>
            <h2 className="section-title">
              <span className="highlight">História</span>
            </h2>
            <p className="about-copy">
              Fundado em 1989, o <strong>Colégio São Judas Tadeu</strong> é uma instituição
              com a missão de desempenhar um papel fundamental na formação
              e desenvolvimento dos alunos. A sua história é caracterizada
              pela visão da excelência acadêmica e compromisso em oferecer
              uma educação intelectual, social e emocional de qualidade,
              preparando cidadãos conscientes e preparados para o futuro.
            </p>
            <p className="about-copy">
              Ao longo de mais de três décadas, formamos gerações de
              estudantes que hoje se destacam nas mais diversas áreas,
              levando consigo os valores e o conhecimento adquiridos
              em nossa instituição.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="about-image-wrapper"
          >
            <div className="about-image-frame">
              <div
                className="about-image"
                style={{ backgroundImage: `url(/stj/assets/nossa-historio-banner.jpg)` }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        .about-section {
          background: var(--bg-white);
          overflow: hidden;
        }
        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .about-display {
          margin-bottom: -20px;
        }
        .about-copy {
          color: var(--text-light);
          font-size: 1rem;
          line-height: 1.8;
          margin-bottom: 16px;
        }
        .about-copy strong {
          color: var(--primary);
        }
        .about-image-wrapper {
          display: flex;
          justify-content: center;
        }
        .about-image-frame {
          position: relative;
          width: 100%;
          max-width: 500px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }
        .about-image-frame::before {
          content: '';
          display: block;
          padding-bottom: 75%;
        }
        .about-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transition: transform 0.6s ease;
        }
        .about-image-frame:hover .about-image {
          transform: scale(1.05);
        }
        @media (max-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .about-image-wrapper {
            order: -1;
          }
        }
      `}</style>
    </section>
  )
}
