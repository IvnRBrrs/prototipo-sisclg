import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FAQProps {
  content: Record<string, string>
}

function FAQItem({ item, index }: { item: Record<string, string>; index: number }) {
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
        <span>{item.q}</span>
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
            <p className="faq-answer">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ({ content }: FAQProps) {
  let items: Record<string, string>[] = []
  try {
    const raw = content._faq_items
    if (raw) items = JSON.parse(raw)
  } catch {}

  if (items.length === 0) return null

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
          <span className="section-label">{content.faq_label || 'FAQ'}</span>
          <h2 className="section-title">
            {content.faq_title_prefix || 'Perguntas'} <span className="highlight">{content.faq_title_highlight || 'Frequentes'}</span>
          </h2>
          <p className="section-subtitle">
            {content.faq_subtitle || 'Tire suas principais dúvidas sobre o Colégio São Judas Tadeu.'}
          </p>
        </motion.div>

        <div className="faq-list">
          {items.map((f, i) => (
            <FAQItem key={f._id || i} item={f} index={i} />
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
