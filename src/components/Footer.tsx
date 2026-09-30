export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/stj/assets/logo-sao-judas-tadeu.png" alt="Colégio São Judas Tadeu" className="footer-logo" />
            <p className="footer-desc">
              Educa&ccedil;&atilde;o que transforma futuros h&aacute; mais de tr&ecirc;s d&eacute;cadas.
            </p>
            <div className="footer-social">
              <a href="https://instagram.com/colegiosjtm" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <span className="social-handle">@colegiosjtm</span>
            </div>
          </div>

          <div className="footer-contact">
            <h4>Contato</h4>
            <div className="footer-contact-item">
              <span className="footer-contact-label">Fixo</span>
              <span className="footer-contact-value">(82) 3512 2092</span>
            </div>
            <div className="footer-contact-item">
              <span className="footer-contact-label">WhatsApp</span>
              <span className="footer-contact-value">(82) 98182 9620</span>
            </div>
            <div className="footer-contact-item">
              <span className="footer-contact-label">Endereço</span>
              <span className="footer-contact-value">R. Adolfo Gustavo, 435, Serraria, Maceió-AL</span>
            </div>
          </div>

          <div className="footer-links">
            <h4>Links Úteis</h4>
            <a href="https://siga03.activesoft.com.br/login/?instituicao=SAOJUDAS" target="_blank" rel="noopener noreferrer">
              Activesoft
            </a>
            <a href="https://app.sae.digital/entrar/" target="_blank" rel="noopener noreferrer">
              SAE Digital
            </a>
            <a href="http://drive.google.com/drive/folders/0AIjBGxYgeUOYUk9PVA" target="_blank" rel="noopener noreferrer">
              Área do Aluno
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>Colégio São Judas Tadeu — 2026</span>
        </div>
      </div>

      <style>{`
        .footer {
          background: var(--primary-dark);
          color: rgba(255,255,255,0.85);
          padding: 60px 0 32px;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
        }
        .footer-logo {
          height: 48px;
          width: auto;
          margin-bottom: 16px;
          filter: brightness(0) invert(1);
        }
        .footer-desc {
          font-size: 0.9rem;
          line-height: 1.6;
          opacity: 0.7;
          margin-bottom: 20px;
        }
        .footer-social {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          color: white;
          transition: all 0.3s;
        }
        .social-link:hover {
          background: var(--accent);
          color: var(--primary-dark);
        }
        .social-handle {
          font-size: 0.85rem;
          opacity: 0.7;
        }
        .footer-contact h4,
        .footer-links h4 {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent);
          margin-bottom: 20px;
          font-weight: 600;
        }
        .footer-contact-item {
          margin-bottom: 14px;
        }
        .footer-contact-label {
          display: block;
          font-size: 0.75rem;
          opacity: 0.5;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .footer-contact-value {
          font-size: 0.9rem;
        }
        .footer-links a {
          display: block;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 0.9rem;
          margin-bottom: 12px;
          transition: color 0.3s;
        }
        .footer-links a:hover {
          color: var(--accent);
        }
        .footer-bottom {
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.1);
          text-align: center;
          font-size: 0.85rem;
          opacity: 0.5;
        }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
      `}</style>
    </footer>
  )
}
