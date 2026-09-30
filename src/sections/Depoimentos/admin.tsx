import { motion } from 'framer-motion'
import { AdminProps } from '../../cms/types'

export default function DepoimentosAdmin({ content, onUpdate, onUpdateListItem, onAddListItem, onRemoveListItem, editingItemId, setEditingItemId }: AdminProps) {
  let items: Record<string, string>[] = []
  try {
    const raw = content._dep_items
    if (raw) items = JSON.parse(raw)
  } catch {}

  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.dep_label || ''} onChange={(e) => onUpdate('dep_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Prefixo do Título</label>
        <input value={content.dep_title_prefix || ''} onChange={(e) => onUpdate('dep_title_prefix', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.dep_title_highlight || ''} onChange={(e) => onUpdate('dep_title_highlight', e.target.value)} />
      </div>

      <div className="admin-list-section">
        <h4>Depoimentos</h4>
        {items.map((item, i) => (
          <div key={item._id || i} className="admin-list-item">
            {editingItemId === item._id ? (
              <div className="admin-list-fields">
                <div className="admin-field">
                  <label>Nome</label>
                  <input value={item.nome || ''} onChange={(e) => onUpdateListItem('_dep_items', item._id, 'nome', e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Relação</label>
                  <input value={item.relacao || ''} onChange={(e) => onUpdateListItem('_dep_items', item._id, 'relacao', e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Depoimento</label>
                  <textarea rows={3} value={item.texto || ''} onChange={(e) => onUpdateListItem('_dep_items', item._id, 'texto', e.target.value)} />
                </div>
                <button className="btn btn-sm" onClick={() => setEditingItemId(null)}>Concluído</button>
              </div>
            ) : (
              <div className="admin-list-summary">
                <span><strong>{item.nome || 'Sem nome'}</strong> — {item.relacao || ''}</span>
                <div className="admin-list-actions">
                  <button className="btn btn-sm" onClick={() => setEditingItemId(item._id)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => onRemoveListItem('_dep_items', item._id)}>Remover</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button className="btn btn-sm admin-add-btn" onClick={() => onAddListItem('_dep_items')}>+ Adicionar Depoimento</button>
      </div>
    </div>
  )
}
