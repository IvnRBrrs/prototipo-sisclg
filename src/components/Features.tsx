import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const segmentos = [
  {
    title: 'Anos Iniciais',
    copy: 'Compreende os primeiros anos da educação básica, com foco no desenvolvimento cognitivo, social e emocional dos alunos.',
    icon: '1',
    gradient: 'linear-gradient(135deg, #09346A, #153D8A)',
  },
  {
    title: 'Anos Finais',
    copy: 'Com turmas do 6º ao 9º Ano, a ênfase é dada ao aprofundamento dos conhecimentos adquiridos nos Anos Iniciais.',
    icon: '2',
    gradient: 'linear-gradient(135deg, #153D8A, #1a4da8)',
  },
  {
    title: 'Ensino Médio',
    copy: 'Busca desenvolver habilidades como pensamento crítico, capacidade de análise, autonomia e preparação para a vida adulta.',
    icon: '3',
    gradient: 'linear-gradient(135deg, #06244A, #09346A)',
  },
]

function SegmentCard({ item, index }: { item: typeof segmentos[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null!)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [40 * (index % 2 === 0 ? 1 : -1), -40 * (index % 2 === 0 ? 1 : -1)])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  return (
    <motion.div ref={ref} style={{ y, opacity }} className="segment-card card">
      <div className="segment-icon" style={{ background: item.gradient }}>
        <span>{item.icon}</span>
      </div>
      <h3 className="segment-title">{item.title}</h3>
      <p className="segment-copy">{item.copy}</p>
      <a href="#contact" className="segment-btn">
        Saiba mais
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    </motion.div>
  )
}

export default function Features() {
  return (
    <section id="segmentos" className="section segmentos-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-label">Segmentos de Ensino</span>
          <h2 className="section-title">
            Nossos <span className="highlight">Segmentos</span>
          </h2>
          <p className="section-subtitle">
            Oferecemos uma formação completa em todas as etapas da educação básica.
          </p>
        </motion.div>

        <div className="segmentos-grid">
          {segmentos.map((s, i) => (
            <SegmentCard key={s.title} item={s} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        .segmentos-section {
          background: var(--bg);
        }
        .segmentos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        .segment-card {
          display: flex;
          flex-direction: column;
          padding: 40px 32px;
        }
        .segment-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          color: white;
          font-size: 1.4rem;
          font-weight: 700;
        }
        .segment-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--primary-dark);
          margin-bottom: 12px;
        }
        .segment-copy {
          color: var(--text-light);
          font-size: 0.9rem;
          line-height: 1.7;
          margin-bottom: 24px;
          flex: 1;
        }
        .segment-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--primary);
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: gap 0.3s;
        }
        .segment-btn:hover {
          gap: 12px;
        }
        @media (max-width: 900px) {
          .segmentos-grid {
            grid-template-columns: 1fr;
            max-width: 480px;
            margin: 0 auto;
          }
        }
      `}</style>
    </section>
  )
}
