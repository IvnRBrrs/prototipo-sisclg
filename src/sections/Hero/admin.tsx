import { AdminProps } from '../../cms/types'

export default function HeroAdmin({ content, onUpdate, openImageLibrary }: AdminProps) {
  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Imagem de Fundo</label>
        <div className="admin-image-row">
          {content.hero_background && (
            <img src={content.hero_background} alt="" className="admin-thumb" />
          )}
          <button className="btn btn-sm" onClick={() => openImageLibrary('hero_background', 'Hero')}>
            {content.hero_background ? 'Trocar' : 'Selecionar'}
          </button>
        </div>
      </div>
      <div className="admin-field">
        <label>Texto de Boas-Vindas</label>
        <input value={content.hero_welcome || ''} onChange={(e) => onUpdate('hero_welcome', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Título (linha 1)</label>
        <input value={content.hero_title1 || ''} onChange={(e) => onUpdate('hero_title1', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Título (linha 2 - destaque)</label>
        <input value={content.hero_title2 || ''} onChange={(e) => onUpdate('hero_title2', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Descrição</label>
        <textarea rows={3} value={content.hero_description || ''} onChange={(e) => onUpdate('hero_description', e.target.value)} />
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Texto Botão Primário</label>
          <input value={content.btn_primary_text || ''} onChange={(e) => onUpdate('btn_primary_text', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Link</label>
          <input value={content.btn_primary_href || ''} onChange={(e) => onUpdate('btn_primary_href', e.target.value)} />
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Texto Botão Outline</label>
          <input value={content.btn_outline_text || ''} onChange={(e) => onUpdate('btn_outline_text', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Link</label>
          <input value={content.btn_outline_href || ''} onChange={(e) => onUpdate('btn_outline_href', e.target.value)} />
        </div>
      </div>
      <div className="admin-field">
        <label>Texto Scroll Indicator</label>
        <input value={content.scroll_text || ''} onChange={(e) => onUpdate('scroll_text', e.target.value)} />
      </div>
    </div>
  )
}
