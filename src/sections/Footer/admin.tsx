import { AdminProps } from '../../cms/types'

export default function FooterAdmin({ content, onUpdate, openImageLibrary }: AdminProps) {
  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>URL da Logo</label>
        <div className="admin-image-row">
          {content.footer_logo && (
            <img src={content.footer_logo} alt="" className="admin-thumb" />
          )}
          <button className="btn btn-sm" onClick={() => openImageLibrary('footer_logo', 'Footer')}>
            {content.footer_logo ? 'Trocar' : 'Selecionar'}
          </button>
        </div>
      </div>
      <div className="admin-field">
        <label>Descrição</label>
        <textarea rows={2} value={content.footer_description || ''} onChange={(e) => onUpdate('footer_description', e.target.value)} />
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>URL do Instagram</label>
          <input value={content.social_instagram_url || ''} onChange={(e) => onUpdate('social_instagram_url', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Handle do Instagram</label>
          <input value={content.social_instagram_handle || ''} onChange={(e) => onUpdate('social_instagram_handle', e.target.value)} />
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Telefone Fixo</label>
          <input value={content.footer_phone_fixo || ''} onChange={(e) => onUpdate('footer_phone_fixo', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>WhatsApp</label>
          <input value={content.footer_phone_whatsapp || ''} onChange={(e) => onUpdate('footer_phone_whatsapp', e.target.value)} />
        </div>
      </div>
      <div className="admin-field">
        <label>Endereço</label>
        <input value={content.footer_address || ''} onChange={(e) => onUpdate('footer_address', e.target.value)} />
      </div>
      <h4>Links Úteis</h4>
      {[1, 2, 3].map((n) => (
        <div key={n} className="admin-row">
          <div className="admin-field">
            <label>Link {n} - Label</label>
            <input value={content[`link${n}_label`] || ''} onChange={(e) => onUpdate(`link${n}_label`, e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Link {n} - URL</label>
            <input value={content[`link${n}_url`] || ''} onChange={(e) => onUpdate(`link${n}_url`, e.target.value)} />
          </div>
        </div>
      ))}
      <div className="admin-row">
        <div className="admin-field">
          <label>Texto Copyright</label>
          <input value={content.footer_copyright || ''} onChange={(e) => onUpdate('footer_copyright', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Ano</label>
          <input value={content.footer_year || ''} onChange={(e) => onUpdate('footer_year', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
