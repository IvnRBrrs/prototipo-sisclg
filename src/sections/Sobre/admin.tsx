import { AdminProps } from '../../cms/types'

export default function SobreAdmin({ content, onUpdate, openImageLibrary }: AdminProps) {
  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.sobre_label || ''} onChange={(e) => onUpdate('sobre_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Título Display</label>
        <input value={content.sobre_display_title || ''} onChange={(e) => onUpdate('sobre_display_title', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.sobre_highlight || ''} onChange={(e) => onUpdate('sobre_highlight', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Parágrafo 1 (HTML permitido)</label>
        <textarea rows={4} value={content.sobre_paragraph1 || ''} onChange={(e) => onUpdate('sobre_paragraph1', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Parágrafo 2</label>
        <textarea rows={4} value={content.sobre_paragraph2 || ''} onChange={(e) => onUpdate('sobre_paragraph2', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Imagem</label>
        <div className="admin-image-row">
          {content.sobre_image && (
            <img src={content.sobre_image} alt="" className="admin-thumb" />
          )}
          <button className="btn btn-sm" onClick={() => openImageLibrary('sobre_image', 'Sobre')}>
            {content.sobre_image ? 'Trocar' : 'Selecionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
