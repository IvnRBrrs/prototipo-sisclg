import { AdminProps } from '../../cms/types'

export default function GaleriaAdmin({ content, onUpdate, onUpdateListItem, onAddListItem, onRemoveListItem, editingItemId, setEditingItemId, openImageLibrary }: AdminProps) {
  let items: Record<string, string>[] = []
  try {
    const raw = content._gal_images
    if (raw) items = JSON.parse(raw)
  } catch {}

  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.gal_label || ''} onChange={(e) => onUpdate('gal_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Prefixo do Título</label>
        <input value={content.gal_title_prefix || ''} onChange={(e) => onUpdate('gal_title_prefix', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.gal_title_highlight || ''} onChange={(e) => onUpdate('gal_title_highlight', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Subtítulo</label>
        <textarea rows={2} value={content.gal_subtitle || ''} onChange={(e) => onUpdate('gal_subtitle', e.target.value)} />
      </div>

      <div className="admin-list-section">
        <h4>Imagens do Carrossel</h4>
        {items.map((item, i) => (
          <div key={item._id || i} className="admin-list-item">
            {editingItemId === item._id ? (
              <div className="admin-list-fields">
                <div className="admin-field">
                  <label>Imagem</label>
                  <div className="admin-image-row">
                    {item.url && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <img src={item.url} alt="" style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #e0e0e0' }} />
                        <span style={{ fontSize: '0.7rem', color: '#888', wordBreak: 'break-all' }}>
                          {item.filename || item.url.split('/').pop() || item.alt || `Imagem ${i + 1}`}
                        </span>
                      </div>
                    )}
                    <button className="btn btn-sm" onClick={() => openImageLibrary(`_gal_images_${item._id}_url`, 'Galeria')}>
                      {item.url ? 'Trocar' : 'Selecionar'}
                    </button>
                  </div>
                </div>
                <div className="admin-field">
                  <label>Texto Alternativo</label>
                  <input value={item.alt || ''} onChange={(e) => onUpdateListItem('_gal_images', item._id, 'alt', e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Nome do Arquivo</label>
                  <input value={item.filename || ''} onChange={(e) => onUpdateListItem('_gal_images', item._id, 'filename', e.target.value)} placeholder="ex: carrossel-1.jpg" />
                </div>
                <button className="btn btn-sm" onClick={() => setEditingItemId(null)}>Concluído</button>
              </div>
            ) : (
              <div className="admin-list-summary">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {item.url && <img src={item.url} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #e0e0e0' }} />}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#212121' }}>
                      {item.filename || item.alt || `Imagem ${i + 1}`}
                    </div>
                    {item.url && (
                      <div style={{ fontSize: '0.65rem', color: '#999', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.url.length > 60 ? item.url.slice(0, 60) + '...' : item.url}
                      </div>
                    )}
                  </div>
                </div>
                <div className="admin-list-actions">
                  <button className="btn btn-sm" onClick={() => setEditingItemId(item._id)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => onRemoveListItem('_gal_images', item._id)}>Remover</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button className="btn btn-sm admin-add-btn" onClick={() => onAddListItem('_gal_images')}>+ Adicionar Imagem</button>
      </div>
    </div>
  )
}
