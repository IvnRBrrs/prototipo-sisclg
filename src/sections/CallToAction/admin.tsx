import { AdminProps } from '../../cms/types'

export default function CallToActionAdmin({ content, onUpdate, openImageLibrary }: AdminProps) {
  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Imagem de Fundo</label>
        <div className="admin-image-row">
          {content.calltoaction_image && (
            <img src={content.calltoaction_image} alt="" className="admin-thumb" />
          )}
          <button className="btn btn-sm" onClick={() => openImageLibrary('calltoaction_image', 'CallToAction')}>
            {content.calltoaction_image ? 'Trocar' : 'Selecionar'}
          </button>
        </div>
      </div>
      <div className="admin-field">
        <label>Título</label>
        <input value={content.calltoaction_title || ''} onChange={(e) => onUpdate('calltoaction_title', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Texto</label>
        <textarea rows={3} value={content.calltoaction_text || ''} onChange={(e) => onUpdate('calltoaction_text', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Texto do Botão</label>
        <input value={content.calltoaction_link_label || ''} onChange={(e) => onUpdate('calltoaction_link_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Link do Botão (slug)</label>
        <input value={content.calltoaction_link || ''} onChange={(e) => onUpdate('calltoaction_link', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Tempo (segundos) para fechar automático</label>
        <input type="number" min="1" value={content.calltoaction_duration || '10'} onChange={(e) => onUpdate('calltoaction_duration', e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={content.calltoaction_hidden === '1'} onChange={(e) => onUpdate('calltoaction_hidden', e.target.checked ? '1' : '')} />
          Ocultar modal de carregamento
        </label>
      </div>
    </div>
  )
}
