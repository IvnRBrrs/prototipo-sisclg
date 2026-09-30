import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const formRef = useRef<HTMLFormElement>(null!)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <section id="contact" className="section contact-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-label">Contato</span>
          <h2 className="section-title">
            Entre em <span className="highlight">Contato</span>
          </h2>
          <p className="section-subtitle">
            Estamos prontos para atender voc&ecirc;. Envie sua mensagem ou utilize nossos canais de atendimento.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="contact-wrapper"
        >
          <form ref={formRef} onSubmit={handleSubmit} className="contact-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nome</label>
                <input type="text" id="name" placeholder="Seu nome" required />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" placeholder="seu@email.com" required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="phone">Telefone</label>
              <input type="tel" id="phone" placeholder="(82) 99999-9999" />
            </div>
            <div className="form-group">
              <label htmlFor="message">Mensagem</label>
              <textarea id="message" rows={5} placeholder="Como podemos ajudar?" required />
            </div>
            <motion.button
              type="submit"
              className="btn btn-primary submit-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {sent ? '✓ Mensagem enviada!' : 'Enviar Mensagem'}
              {!sent && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8H15M15 8L8 1M15 8L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </motion.button>
          </form>

          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div>
                <div className="contact-label">Fixo</div>
                <div className="contact-value">(82) 3512 2092</div>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div>
                <div className="contact-label">WhatsApp</div>
                <div className="contact-value">(82) 98182 9620</div>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <div className="contact-label">Endereço</div>
                <div className="contact-value">R. Adolfo Gustavo, 435, Serraria, Maceió-AL</div>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <div className="contact-label">Atendimento</div>
                <div className="contact-value">Seg-Sex, 7h às 18h</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .contact-section {
          background: var(--bg);
        }
        .contact-wrapper {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 48px;
          margin-top: 48px;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group label {
          font-size: 0.85rem;
          color: var(--text-light);
          font-weight: 600;
        }
        .form-group input,
        .form-group textarea {
          padding: 14px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-white);
          color: var(--text);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          transition: border-color 0.3s;
          outline: none;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(9,52,106,0.1);
        }
        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #aaa;
        }
        .submit-btn {
          align-self: flex-start;
        }
        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding-top: 8px;
        }
        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .contact-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: rgba(9,52,106,0.08);
          border: 1px solid rgba(9,52,106,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          flex-shrink: 0;
        }
        .contact-label {
          font-size: 0.8rem;
          color: var(--text-light);
          margin-bottom: 2px;
        }
        .contact-value {
          font-size: 0.9rem;
          color: var(--text);
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .contact-wrapper {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}
