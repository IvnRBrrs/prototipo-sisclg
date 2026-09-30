import { AdminProps } from '../../cms/types'

export default function FAQAdmin({ content, onUpdate, onUpdateListItem, onAddListItem, onRemoveListItem, editingItemId, setEditingItemId }: AdminProps) {
  let items: Record<string, string>[] = []
  try {
    const raw = content._faq_items
    if (raw) items = JSON.parse(raw)
  } catch {}

  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.faq_label || ''} onChange={(e) => onUpdate('faq_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Prefixo do Título</label>
        <input value={content.faq_title_prefix || ''} onChange={(e) => onUpdate('faq_title_prefix', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.faq_title_highlight || ''} onChange={(e) => onUpdate('faq_title_highlight', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Subtítulo</label>
        <textarea rows={2} value={content.faq_subtitle || ''} onChange={(e) => onUpdate('faq_subtitle', e.target.value)} />
      </div>

      <div className="admin-list-section">
        <h4>Perguntas Frequentes</h4>
        {items.map((item, i) => (
          <div key={item._id || i} className="admin-list-item">
            {editingItemId === item._id ? (
              <div className="admin-list-fields">
                <div className="admin-field">
                  <label>Pergunta</label>
                  <input value={item.q || ''} onChange={(e) => onUpdateListItem('_faq_items', item._id, 'q', e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Resposta</label>
                  <textarea rows={3} value={item.a || ''} onChange={(e) => onUpdateListItem('_faq_items', item._id, 'a', e.target.value)} />
                </div>
                <button className="btn btn-sm" onClick={() => setEditingItemId(null)}>Concluído</button>
              </div>
            ) : (
              <div className="admin-list-summary">
                <span>{item.q || 'Sem pergunta'}</span>
                <div className="admin-list-actions">
                  <button className="btn btn-sm" onClick={() => setEditingItemId(item._id)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => onRemoveListItem('_faq_items', item._id)}>Remover</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button className="btn btn-sm admin-add-btn" onClick={() => onAddListItem('_faq_items')}>+ Adicionar Pergunta</button>
      </div>
    </div>
  )
}
