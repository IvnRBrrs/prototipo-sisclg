import { AdminProps } from '../../cms/types'

export default function SegmentosAdmin({ content, onUpdate, onUpdateListItem, onAddListItem, onRemoveListItem, editingItemId, setEditingItemId }: AdminProps) {
  let items: Record<string, string>[] = []
  try {
    const raw = content._seg_items
    if (raw) items = JSON.parse(raw)
  } catch {}

  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.seg_label || ''} onChange={(e) => onUpdate('seg_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Prefixo do Título</label>
        <input value={content.seg_title_prefix || ''} onChange={(e) => onUpdate('seg_title_prefix', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.seg_title_highlight || ''} onChange={(e) => onUpdate('seg_title_highlight', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Subtítulo</label>
        <textarea rows={2} value={content.seg_subtitle || ''} onChange={(e) => onUpdate('seg_subtitle', e.target.value)} />
      </div>

      <div className="admin-list-section">
        <h4>Segmentos</h4>
        {items.map((item, i) => (
          <div key={item._id || i} className="admin-list-item">
            {editingItemId === item._id ? (
              <div className="admin-list-fields">
                <div className="admin-field">
                  <label>Título</label>
                  <input value={item.title || ''} onChange={(e) => onUpdateListItem('_seg_items', item._id, 'title', e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Descrição</label>
                  <textarea rows={2} value={item.copy || ''} onChange={(e) => onUpdateListItem('_seg_items', item._id, 'copy', e.target.value)} />
                </div>
                <div className="admin-row">
                  <div className="admin-field">
                    <label>Ícone (número)</label>
                    <input value={item.icon || ''} onChange={(e) => onUpdateListItem('_seg_items', item._id, 'icon', e.target.value)} />
                  </div>
                  <div className="admin-field">
                    <label>Gradiente Cor 1</label>
                    <input type="color" value={item.gradient_from || '#09346A'} onChange={(e) => onUpdateListItem('_seg_items', item._id, 'gradient_from', e.target.value)} />
                  </div>
                  <div className="admin-field">
                    <label>Gradiente Cor 2</label>
                    <input type="color" value={item.gradient_to || '#153D8A'} onChange={(e) => onUpdateListItem('_seg_items', item._id, 'gradient_to', e.target.value)} />
                  </div>
                </div>
                <div className="admin-row">
                  <div className="admin-field">
                    <label>Texto do Link</label>
                    <input value={item.link_text || ''} onChange={(e) => onUpdateListItem('_seg_items', item._id, 'link_text', e.target.value)} />
                  </div>
                  <div className="admin-field">
                    <label>Link</label>
                    <input value={item.link_href || ''} onChange={(e) => onUpdateListItem('_seg_items', item._id, 'link_href', e.target.value)} />
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => setEditingItemId(null)}>Concluído</button>
              </div>
            ) : (
              <div className="admin-list-summary">
                <span>{item.title || 'Sem título'}</span>
                <div className="admin-list-actions">
                  <button className="btn btn-sm" onClick={() => setEditingItemId(item._id)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => onRemoveListItem('_seg_items', item._id)}>Remover</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button className="btn btn-sm admin-add-btn" onClick={() => onAddListItem('_seg_items')}>+ Adicionar Segmento</button>
      </div>
    </div>
  )
}
