import { AdminProps } from '../../cms/types'

export default function NavbarAdmin({ content, onUpdate, onUpdateListItem, onAddListItem, onRemoveListItem, editingItemId, setEditingItemId, openImageLibrary }: AdminProps) {
  let items: Record<string, string>[] = []
  try {
    const raw = content._nav_items
    if (raw) items = JSON.parse(raw)
  } catch {}

  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Logo</label>
        <div className="admin-image-row">
          {content.nav_logo && (
            <img src={content.nav_logo} alt="" className="admin-thumb" />
          )}
          <button className="btn btn-sm" onClick={() => openImageLibrary('nav_logo', 'Navbar')}>
            {content.nav_logo ? 'Trocar' : 'Selecionar'}
          </button>
        </div>
      </div>

      <div className="admin-list-section">
        <h4>Itens do Menu</h4>
        {items.map((item, i) => (
          <div key={item._id || i} className="admin-list-item">
            {editingItemId === item._id ? (
              <div className="admin-list-fields">
                <div className="admin-field">
                  <label>Label</label>
                  <input value={item.label || ''} onChange={(e) => onUpdateListItem('_nav_items', item._id, 'label', e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Link (href)</label>
                  <input value={item.href || ''} onChange={(e) => onUpdateListItem('_nav_items', item._id, 'href', e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Items do Dropdown (JSON array)</label>
                  <textarea rows={3} value={item.dropdown_items || ''} onChange={(e) => onUpdateListItem('_nav_items', item._id, 'dropdown_items', e.target.value)} />
                </div>
                <button className="btn btn-sm" onClick={() => setEditingItemId(null)}>Concluído</button>
              </div>
            ) : (
              <div className="admin-list-summary">
                <span>{item.label || 'Sem label'}</span>
                <div className="admin-list-actions">
                  <button className="btn btn-sm" onClick={() => setEditingItemId(item._id)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => onRemoveListItem('_nav_items', item._id)}>Remover</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button className="btn btn-sm admin-add-btn" onClick={() => onAddListItem('_nav_items')}>+ Adicionar Item</button>
      </div>
    </div>
  )
}
