interface FooterProps {
  content: Record<string, string>
}

export default function Footer({ content }: FooterProps) {
  const schoolName = content.footer_copyright || ''
  const hasInstagram = !!(content.social_instagram_url || '').trim()
  const hasLogo = !!(content.footer_logo || '').trim()
  const hasDescription = !!(content.footer_description || '').trim()
  const hasPhoneFixo = !!(content.footer_phone_fixo || '').trim()
  const hasPhoneWhats = !!(content.footer_phone_whatsapp || '').trim()
  const hasAddress = !!(content.footer_address || '').trim()
  const hasContact = hasPhoneFixo || hasPhoneWhats || hasAddress
  const hasLinks = !!(content.link1_url || '').trim() || !!(content.link2_url || '').trim() || !!(content.link3_url || '').trim()
  const year = (content.footer_year || '').trim() || new Date().getFullYear().toString()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            {hasLogo && (
              <img src={content.footer_logo} alt={schoolName} className="footer-logo" />
            )}
            {hasDescription && (
              <p className="footer-desc">{content.footer_description}</p>
            )}
            {hasInstagram && (
              <div className="footer-social">
                <a href={content.social_instagram_url} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                {(content.social_instagram_handle || '').trim() && (
                  <span className="social-handle">{content.social_instagram_handle}</span>
                )}
              </div>
            )}
          </div>

          {hasContact && (
            <div className="footer-contact">
              <h4>Contato</h4>
              {hasPhoneFixo && (
                <div className="footer-contact-item">
                  <span className="footer-contact-label">Fixo</span>
                  <span className="footer-contact-value">{content.footer_phone_fixo}</span>
                </div>
              )}
              {hasPhoneWhats && (
                <div className="footer-contact-item">
                  <span className="footer-contact-label">WhatsApp</span>
                  <span className="footer-contact-value">{content.footer_phone_whatsapp}</span>
                </div>
              )}
              {hasAddress && (
                <div className="footer-contact-item">
                  <span className="footer-contact-label">Endereço</span>
                  <span className="footer-contact-value">{content.footer_address}</span>
                </div>
              )}
            </div>
          )}

          {hasLinks && (
            <div className="footer-links">
              <h4>Links Úteis</h4>
              {(content.link1_url || '').trim() && (
                <a href={content.link1_url} target="_blank" rel="noopener noreferrer">
                  {content.link1_label || 'Link'}
                </a>
              )}
              {(content.link2_url || '').trim() && (
                <a href={content.link2_url} target="_blank" rel="noopener noreferrer">
                  {content.link2_label || 'Link'}
                </a>
              )}
              {(content.link3_url || '').trim() && (
                <a href={content.link3_url} target="_blank" rel="noopener noreferrer">
                  {content.link3_label || 'Link'}
                </a>
              )}
            </div>
          )}
        </div>

        <div className="footer-bottom">
          <span>{schoolName ? `${schoolName} — ${year}` : `© ${year}`}</span>
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
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
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
