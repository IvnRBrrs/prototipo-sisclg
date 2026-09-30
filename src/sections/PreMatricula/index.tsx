import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../../cms/api'

interface PreMatriculaProps {
  content: Record<string, string>
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)})${digits.slice(2)}`
  return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`
}

export default function PreMatricula({ content }: PreMatriculaProps) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [telValue, setTelValue] = useState('')
  const [whatsValue, setWhatsValue] = useState('')
  const formRef = useRef<HTMLFormElement>(null!)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const form = e.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const payload: Record<string, string> = {}
    data.forEach((v, k) => { payload[k] = v as string })
    payload.source = 'cliente'
    try {
      await api.post('/pre-enrollments', payload)
      setSent(true)
      setTelValue('')
      setWhatsValue('')
      form.reset()
      setTimeout(() => setSent(false), 4000)
    } catch {
      setError('Erro ao enviar solicitação. Tente novamente.')
    }
  }

  return (
    <section id="pre-matricula" className="section premat-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-label">{content.premat_label || 'Pré-Matrícula'}</span>
          <h2 className="section-title">
            {content.premat_title_prefix || 'Faça sua'} <span className="highlight">{content.premat_title_highlight || 'Pré-Matrícula'}</span>
          </h2>
          <p className="section-subtitle">
            {content.premat_subtitle || 'Preencha o formulário abaixo para reservar a vaga do seu filho.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="premat-wrapper"
        >
          <form ref={formRef} onSubmit={handleSubmit} className="premat-form">
            <div className="premat-row">
              <div className="form-group">
                <label htmlFor="responsavel">Responsável</label>
                <input type="text" id="responsavel" name="responsavel" placeholder={content.form_placeholder_responsavel || 'Nome do responsável'} required />
              </div>
              <div className="form-group">
                <label htmlFor="nome_aluno">Nome do Aluno</label>
                <input type="text" id="nome_aluno" name="nome_aluno" placeholder={content.form_placeholder_aluno || 'Nome completo do aluno'} required />
              </div>
            </div>
            <div className="premat-row">
              <div className="form-group">
                <label htmlFor="idade">Idade</label>
                <input type="text" id="idade" name="idade" placeholder={content.form_placeholder_idade || 'Idade do aluno'} />
              </div>
              <div className="form-group">
                <label htmlFor="ano_letivo_atual">Ano Letivo Atual</label>
                <input type="text" id="ano_letivo_atual" name="ano_letivo_atual" placeholder={content.form_placeholder_ano || '2026'} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="serie_desejada">Série Desejada (Ano Letivo Seguinte)</label>
              <select id="serie_desejada" name="serie_desejada" required>
                <option value="">Selecione a série</option>
                <optgroup label="Ensino Fundamental 1">
                  <option value="1º ano">1º ano</option>
                  <option value="2º ano">2º ano</option>
                  <option value="3º ano">3º ano</option>
                  <option value="4º ano">4º ano</option>
                  <option value="5º ano">5º ano</option>
                </optgroup>
                <optgroup label="Ensino Fundamental 2">
                  <option value="6º ano">6º ano</option>
                  <option value="7º ano">7º ano</option>
                  <option value="8º ano">8º ano</option>
                  <option value="9º ano">9º ano</option>
                </optgroup>
                <optgroup label="Ensino Médio">
                  <option value="1ª série">1ª série</option>
                  <option value="2ª série">2ª série</option>
                  <option value="3ª série">3ª série</option>
                </optgroup>
              </select>
            </div>
            <div className="premat-row">
              <div className="form-group">
                <label htmlFor="telefone">Telefone</label>
                <input type="tel" id="telefone" name="telefone" value={telValue} onChange={(e) => setTelValue(formatPhone(e.target.value))} placeholder={content.form_placeholder_telefone || '(82) 99999-9999'} maxLength={14} />
              </div>
              <div className="form-group">
                <label htmlFor="whatsapp">WhatsApp</label>
                <input type="tel" id="whatsapp" name="whatsapp" value={whatsValue} onChange={(e) => setWhatsValue(formatPhone(e.target.value))} placeholder={content.form_placeholder_whatsapp || '(82) 99999-9999'} maxLength={14} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" placeholder={content.form_placeholder_email || 'seu@email.com'} required />
            </div>
            <div className="form-group">
              <label htmlFor="mensagem">Mensagem</label>
              <textarea id="mensagem" name="mensagem" rows={4} placeholder={content.form_placeholder_mensagem || 'Alguma observação?'} />
            </div>
            <motion.button
              type="submit"
              className="btn btn-primary submit-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {sent ? `\u2713 ${content.form_success_text || 'Solicitação enviada!'}` : (content.form_btn_text || 'Solicitar Pré-Matrícula')}
              {!sent && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8H15M15 8L8 1M15 8L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </motion.button>
            {error && <p style={{ color: '#d32f2f', fontSize: '0.9rem', marginTop: -12 }}>{error}</p>}
          </form>
        </motion.div>
      </div>

      <style>{`
        .premat-section {
          background: var(--bg-white);
        }
        .premat-wrapper {
          max-width: 700px;
          margin: 48px auto 0;
        }
        .premat-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .premat-row {
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
        .form-group textarea,
        .form-group select {
          padding: 14px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          transition: border-color 0.3s;
          outline: none;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
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
        @media (max-width: 768px) {
          .premat-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}
