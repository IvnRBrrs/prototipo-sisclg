import { useState, useEffect, Suspense } from 'react'
import { bulkUpdateContent, updatePageContent } from '../cms/api'
import { fetchPagesCached, fetchContentCached, fetchPageContentCached, invalidateCache } from '../cms/contentCache'
import { getModularSection } from '../cms/registry'
import { AdminProps } from '../cms/types'
import ImagePickerModal from './ImagePickerModal'

interface SectionEditorProps {
  sectionTitle: string
  onBack: () => void
}

const STORAGE_KEY = 'cms_selected_page'

export default function SectionEditor({ sectionTitle, onBack }: SectionEditorProps) {
  const mod = getModularSection(sectionTitle)
  const [content, setContent] = useState<Record<string, string>>({})
  const [pages, setPages] = useState<{ slug: string; title: string }[]>([])
  const [selectedPage, setSelectedPage] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [imagePickerField, setImagePickerField] = useState<string | null>(null)

  useEffect(() => {
    fetchPagesCached().then(({ data }) => setPages(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const load = selectedPage
      ? fetchPageContentCached(selectedPage).then(r => r.data)
      : fetchContentCached().then(r => r.data)
    load.then((data) => {
      const merged = { ...data }
      if (mod) {
        // Merge key defaults for missing keys
        mod.schema.keys.forEach((k) => {
          if (!(k.key in merged) && k.default !== undefined) {
            merged[k.key] = k.default
          }
        })
        // Merge list defaults for missing or empty lists
        if (mod.schema.listKey && mod.schema.defaultItems && mod.schema.defaultItems.length > 0) {
          if (!(mod.schema.listKey in merged) || !merged[mod.schema.listKey] || merged[mod.schema.listKey] === '[]') {
            merged[mod.schema.listKey] = JSON.stringify(mod.schema.defaultItems.map((item, i) => ({ _id: String(i + 1), ...item })))
          }
        }
      }
      setContent(merged)
    }).catch(() => setContent({}))
  }, [sectionTitle, selectedPage])

  const handlePageChange = (slug: string) => {
    setSelectedPage(slug)
    localStorage.setItem(STORAGE_KEY, slug)
    setEditingItemId(null)
  }

  const handleUpdate = (key: string, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const handleUpdateListItem = (listKey: string, itemId: string, field: string, value: string) => {
    setContent((prev) => {
      const raw = prev[listKey]
      if (!raw) return prev
      try {
        const items = JSON.parse(raw)
        const updated = items.map((item: any) =>
          item._id === itemId ? { ...item, [field]: value } : item
        )
        return { ...prev, [listKey]: JSON.stringify(updated) }
      } catch { return prev }
    })
  }

  const handleAddListItem = (listKey: string) => {
    const raw = content[listKey]
    const items = raw ? JSON.parse(raw) : []
    const newItem: Record<string, string> = { _id: crypto.randomUUID() }
    if (mod?.schema.listFields) {
      mod.schema.listFields.forEach((f) => {
        newItem[f.key] = f.default || ''
      })
    }
    items.push(newItem)
    setContent((prev) => ({ ...prev, [listKey]: JSON.stringify(items) }))
    setEditingItemId(newItem._id!)
  }

  const handleRemoveListItem = (listKey: string, itemId: string) => {
    setContent((prev) => {
      const raw = prev[listKey]
      if (!raw) return prev
      try {
        const items = JSON.parse(raw).filter((item: any) => item._id !== itemId)
        return { ...prev, [listKey]: JSON.stringify(items) }
      } catch { return prev }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const sectionKeys: Record<string, string> = {}
      if (mod) {
        mod.schema.keys.forEach((k) => {
          if (content[k.key] !== undefined) sectionKeys[k.key] = content[k.key]
        })
        if (mod.schema.listKey && content[mod.schema.listKey] !== undefined) {
          sectionKeys[mod.schema.listKey] = content[mod.schema.listKey]
        }
      }
      if (selectedPage) {
        await updatePageContent(selectedPage, sectionKeys)
        invalidateCache('page_' + selectedPage)
      } else {
        await bulkUpdateContent(sectionKeys)
        invalidateCache('global_content')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const openImageLibrary = (field: string, _componentType: string, ..._args: any[]) => {
    setImagePickerField(field)
  }

  const handleImageSelect = (url: string, filename?: string) => {
    if (!imagePickerField) return
    const listKey = mod?.schema.listKey
    if (listKey && imagePickerField.startsWith(listKey + '_')) {
      const rest = imagePickerField.slice(listKey.length + 1)
      const underscoreIndex = rest.indexOf('_')
      if (underscoreIndex > 0) {
        const itemId = rest.slice(0, underscoreIndex)
        const field = rest.slice(underscoreIndex + 1)
        handleUpdateListItem(listKey, itemId, field, url)
        if (filename) {
          handleUpdateListItem(listKey, itemId, 'filename', filename)
        }
        setImagePickerField(null)
        return
      }
    }
    handleUpdate(imagePickerField, url)
    setImagePickerField(null)
  }

  const adminProps: AdminProps = {
    content,
    onUpdate: handleUpdate,
    onUpdateListItem: handleUpdateListItem,
    onAddListItem: handleAddListItem,
    onRemoveListItem: handleRemoveListItem,
    openImageLibrary,
    editingItemId,
    setEditingItemId,
  }

  if (!mod) {
    return (
      <div className="admin-editor">
        <button className="btn btn-outline" onClick={onBack} style={{ marginBottom: 24 }}>← Voltar</button>
        <p>Seção "{sectionTitle}" não encontrada.</p>
      </div>
    )
  }

  const AdminComponent = mod.Admin

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <button className="btn btn-outline" onClick={onBack}>← Voltar</button>
        <h2 style={{ fontSize: '1rem' }}>Editando: {mod.schema.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', marginRight: 12 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>Página:</label>
          <select
            value={selectedPage}
            onChange={(e) => handlePageChange(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
              fontSize: '0.82rem', background: 'white', maxWidth: 180,
            }}
          >
            <option value="">Global (padrão)</option>
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>{p.title} ({p.slug})</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
        </button>
      </div>
      {selectedPage && (
        <div style={{
          padding: '8px 16px', margin: '0 16px', borderRadius: 6,
          background: 'rgba(9,52,106,0.06)', border: '1px solid rgba(9,52,106,0.12)',
          fontSize: '0.78rem', color: 'var(--primary)',
        }}>
          Editando conteúdo específico da página <strong>{pages.find(p => p.slug === selectedPage)?.title || selectedPage}</strong>.
          As alterações não afetarão outras páginas.
        </div>
      )}
      <div className="admin-editor-content">
        <Suspense fallback={<div>Carregando editor...</div>}>
          <AdminComponent {...adminProps} />
        </Suspense>
      </div>

      {imagePickerField && (
        <ImagePickerModal
          onSelect={handleImageSelect}
          onClose={() => setImagePickerField(null)}
        />
      )}
    </div>
  )
}
