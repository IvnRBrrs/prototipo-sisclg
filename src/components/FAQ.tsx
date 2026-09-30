import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    q: 'Quais são os horários de funcionamento da secretaria?',
    a: 'A secretaria do Colégio São Judas Tadeu funciona de segunda a sexta-feira, das 7h às 18h, e aos sábados das 8h ao meio-dia.',
  },
  {
    q: 'Como faço para matricular meu filho?',
    a: 'As matrículas podem ser realizadas presencialmente em nossa secretaria ou através do nosso site. Entre em contato conosco para agendar uma visita e conhecer nossa estrutura.',
  },
  {
    q: 'O colégio oferece período integral?',
    a: 'Sim! Oferecemos o período integral com atividades complementares, acompanhamento pedagógico, alimentação e recreação monitorada.',
  },
  {
    q: 'Quais materiais didáticos são utilizados?',
    a: 'Utilizamos o Sistema de Ensino SAE, reconhecido nacionalmente pela qualidade e inovação, alinhado à nossa proposta pedagógica.',
  },
  {
    q: 'O colégio possui acessibilidade?',
    a: 'Sim, nossa estrutura é adaptada para receber alunos com necessidades especiais, com rampas, banheiros adaptados e profissionais capacitados.',
  },
  {
    q: 'Como posso entrar em contato com a coordenação pedagógica?',
    a: 'A coordenação pedagógica atende presencialmente mediante agendamento, ou através dos nossos canais de atendimento: telefone e WhatsApp.',
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`faq-item ${open ? 'open' : ''}`}
    >
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{faq.q}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className={`faq-arrow ${open ? 'open' : ''}`}
        >
          <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="faq-answer-wrapper"
          >
            <p className="faq-answer">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  return (
    <section id="faq" className="section faq-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-label">FAQ</span>
          <h2 className="section-title">
            Perguntas <span className="highlight">Frequentes</span>
          </h2>
          <p className="section-subtitle">
            Tire suas principais dúvidas sobre o Colégio São Judas Tadeu.
          </p>
        </motion.div>

        <div className="faq-list">
          {faqs.map((f, i) => (
            <FAQItem key={f.q} faq={f} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        .faq-section {
          background: var(--bg-white);
        }
        .faq-list {
          max-width: 720px;
          margin: 48px auto 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .faq-item {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          transition: border-color 0.3s;
          background: var(--bg);
        }
        .faq-item.open {
          border-color: var(--primary-light);
        }
        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          background: none;
          border: none;
          color: var(--primary-dark);
          font-family: var(--font-sans);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
        }
        .faq-arrow {
          color: var(--text-light);
          transition: transform 0.3s;
          flex-shrink: 0;
        }
        .faq-arrow.open {
          transform: rotate(180deg);
          color: var(--primary);
        }
        .faq-answer-wrapper {
          overflow: hidden;
        }
        .faq-answer {
          padding: 0 24px 20px;
          color: var(--text-light);
          font-size: 0.9rem;
          line-height: 1.7;
        }
      `}</style>
    </section>
  )
}
