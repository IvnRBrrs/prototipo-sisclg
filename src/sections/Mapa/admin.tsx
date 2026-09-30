import { AdminProps } from '../../cms/types'

export default function MapaAdmin({ content, onUpdate }: AdminProps) {
  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.map_label || ''} onChange={(e) => onUpdate('map_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Prefixo do Título</label>
        <input value={content.map_title_prefix || ''} onChange={(e) => onUpdate('map_title_prefix', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.map_title_highlight || ''} onChange={(e) => onUpdate('map_title_highlight', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Endereço (exibido)</label>
        <input value={content.map_address || ''} onChange={(e) => onUpdate('map_address', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>URL do Embed Google Maps</label>
        <textarea rows={3} value={content.map_iframe_src || ''} onChange={(e) => onUpdate('map_iframe_src', e.target.value)} />
      </div>
    </div>
  )
}
