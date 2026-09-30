import { useState, useEffect, useCallback, Suspense } from 'react'
import { fetchPagesCached, invalidateCache, getCachedPagesSync } from '../cms/contentCache'
import api from '../cms/api'
import { getModularSection, getAllSectionTitles } from '../cms/registry'
import { AdminProps } from '../cms/types'
import ImagePickerModal from './ImagePickerModal'

interface Page {
  slug: string
  title: string
  show_in_menu: number
  parent_slug: string | null
  menu_order: number
}

export default function PageManager() {
  const [pages, setPages] = useState<Page[]>(() => getCachedPagesSync() || [])
  const [loading, setLoading] = useState(() => !getCachedPagesSync())
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')

  useEffect(() => { loadPages() }, [])

  const loadPages = async () => {
    try {
      const { data } = await fetchPagesCached()
      setPages(Array.isArray(data) ? data : [])
    } catch {} finally { setLoading(false) }
  }

  const createPage = async () => {
    if (!newTitle || !newSlug) return
    try {
      await api.post('/pages', { title: newTitle, slug: newSlug.replace(/^\/+|\/+$/g, '') })
      setNewTitle('')
      setNewSlug('')
      invalidateCache('pages')
      loadPages()
    } catch (err) { console.error(err) }
  }

  const deletePage = async (slug: string) => {
    if (!confirm(`Deletar página "${slug}"?`)) return
    try {
      await api.delete(`/pages/${slug.replace(/^\/+|\/+$/g, '')}`)
      invalidateCache('pages')
      invalidateCache('page_' + slug)
      loadPages()
      if (editingSlug === slug) setEditingSlug(null)
    } catch (err) { console.error(err) }
  }

  const toggleMenuVisibility = async (page: Page) => {
    try {
      await api.put(`/pages/${page.slug.replace(/^\/+|\/+$/g, '')}`, { show_in_menu: page.show_in_menu ? 0 : 1 })
      invalidateCache('pages')
      loadPages()
    } catch (err) { console.error(err) }
  }

  if (editingSlug) {
    return <PageEditor slug={editingSlug} onBack={() => setEditingSlug(null)} onSaved={loadPages} />
  }

  return (
    <div className="admin-page-manager">
      <h2>Gerenciar Páginas</h2>

      <div className="admin-page-create">
        <h3>Criar Nova Página</h3>
        <div className="admin-row">
          <div className="admin-field">
            <label>Título</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título da página" />
          </div>
          <div className="admin-field">
            <label>Slug</label>
            <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="slug-da-pagina" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={createPage}>Criar Página</button>
      </div>

      <h3>Páginas Existentes</h3>
      {loading ? (
        <div className="admin-loading">Carregando páginas...</div>
      ) : (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Slug</th>
            <th>Título</th>
            <th>Menu</th>
            <th>Ordem</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.slug}>
              <td>{p.slug}</td>
              <td>{p.title}</td>
              <td>
                <button className={`btn btn-sm ${p.show_in_menu ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => toggleMenuVisibility(p)}>
                  {p.show_in_menu ? 'Visível' : 'Oculto'}
                </button>
              </td>
              <td>{p.menu_order}</td>
              <td>
                <button className="btn btn-sm" onClick={() => setEditingSlug(p.slug)}>Editar Seções</button>
                <button className="btn btn-sm btn-danger" onClick={() => deletePage(p.slug)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  )
}

function PageEditor({ slug, onBack, onSaved }: { slug: string; onBack: () => void; onSaved: () => void }) {
  const [pageContent, setPageContent] = useState<Record<string, string>>({})
  const [sections, setSections] = useState<{ title: string; instanceId: string }[]>([])
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [imagePickerField, setImagePickerField] = useState<string | null>(null)
  const allSectionTitles = getAllSectionTitles()

  useEffect(() => {
    api.get(`/pages/${slug.replace(/^\/+|\/+$/g, '')}/content`).then(({ data }) => {
      setPageContent(data)
      try {
        if (data._sections) {
          setSections(JSON.parse(data._sections))
        } else {
          setSections([])
        }
      } catch { setSections([]) }
    }).catch(() => { setSections([]) })
  }, [slug])

  const handleContentUpdate = useCallback((key: string, value: string) => {
    setPageContent((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleUpdateListItem = useCallback((listKey: string, itemId: string, field: string, value: string) => {
    setPageContent((prev) => {
      const raw = prev[listKey]
      if (!raw) return prev
      try {
        const items = JSON.parse(raw).map((item: any) =>
          item._id === itemId ? { ...item, [field]: value } : item
        )
        return { ...prev, [listKey]: JSON.stringify(items) }
      } catch { return prev }
    })
  }, [])

  const handleAddListItem = useCallback((listKey: string) => {
    const newId = crypto.randomUUID()
    setPageContent((prev) => {
      const raw = prev[listKey]
      const items = raw ? JSON.parse(raw) : []
      const section = sections.find((s) => {
        const mod = getModularSection(s.title)
        return mod?.schema.listKey === listKey
      })
      const newItem: Record<string, string> = { _id: newId }
      if (section) {
        const mod = getModularSection(section.title)
        mod?.schema.listFields?.forEach((f) => { newItem[f.key] = f.default || '' })
      }
      items.push(newItem)
      return { ...prev, [listKey]: JSON.stringify(items) }
    })
    setEditingItemId(newId)
  }, [sections])

  const handleRemoveListItem = useCallback((listKey: string, itemId: string) => {
    setPageContent((prev) => {
      const raw = prev[listKey]
      if (!raw) return prev
      try {
        const items = JSON.parse(raw).filter((item: any) => item._id !== itemId)
        return { ...prev, [listKey]: JSON.stringify(items) }
      } catch { return prev }
    })
  }, [])

  const saveAll = async () => {
    setSaving(true)
    try {
      const sectionKeys: Record<string, string> = {}
      sections.forEach((sec) => {
        const mod = getModularSection(sec.title)
        if (mod) {
          mod.schema.keys.forEach((k) => {
            if (pageContent[k.key] !== undefined) sectionKeys[k.key] = pageContent[k.key]
          })
          if (mod.schema.listKey && pageContent[mod.schema.listKey] !== undefined) {
            sectionKeys[mod.schema.listKey] = pageContent[mod.schema.listKey]
          }
        }
      })
      sectionKeys._sections = JSON.stringify(sections)
      await api.put(`/pages/${slug.replace(/^\/+|\/+$/g, '')}/content/bulk`, { entries: sectionKeys })
      invalidateCache('pages')
      invalidateCache('page_' + slug)
      onSaved()
      alert('Página salva!')
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar: ' + (err.response?.data?.error || err.message || 'desconhecido'))
    } finally { setSaving(false) }
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sections.length) return
    const updated = [...sections]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setSections(updated)
  }

  const removeSection = (instanceId: string) => {
    if (!confirm('Remover esta seção da página?')) return
    setSections((prev) => prev.filter((s) => s.instanceId !== instanceId))
    if (selectedSection === instanceId) setSelectedSection(null)
  }

  const addSection = (title: string) => {
    const instanceId = `${title.toLowerCase()}_${Date.now()}`
    setSections((prev) => [...prev, { title, instanceId }])
  }

  const openImageLibrary = (field: string, _componentType: string, ..._args: any[]) => {
    setImagePickerField(field)
  }

  const handleImageSelect = (url: string, filename?: string) => {
    if (!imagePickerField) return
    const editedSection = sections.find((sec) => {
      const mod = getModularSection(sec.title)
      return mod?.schema.listKey && imagePickerField.startsWith(mod.schema.listKey + '_')
    })
    if (editedSection) {
      const mod = getModularSection(editedSection.title)
      const listKey = mod!.schema.listKey!
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
    handleContentUpdate(imagePickerField, url)
    setImagePickerField(null)
  }

  return (
    <div className="admin-page-editor">
      <div className="admin-editor-header">
        <button className="btn btn-outline" onClick={onBack}>← Voltar</button>
        <h2>Editando: {slug}</h2>
        <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Página'}
        </button>
      </div>

      <div className="admin-page-sections-list">
        <div className="admin-page-sections-header">
          <h3>Seções da Página</h3>
          <select onChange={(e) => { if (e.target.value) { addSection(e.target.value); e.target.value = '' } }}
            className="admin-add-section-select">
            <option value="">+ Adicionar Seção</option>
            {allSectionTitles.filter((t) => !sections.find((s) => s.title === t)).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {sections.map((sec, index) => {
          const mod = getModularSection(sec.title)
          const isSelected = selectedSection === sec.instanceId
          return (
            <div key={sec.instanceId} className={`admin-page-section ${isSelected ? 'expanded' : ''}`}>
              <div className="admin-page-section-header" onClick={() => setSelectedSection(isSelected ? null : sec.instanceId)}>
                <span className="admin-section-order">{index + 1}</span>
                <span className="admin-section-title">{mod?.schema.title || sec.title}</span>
                <div className="admin-section-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => moveSection(index, -1)} disabled={index === 0} title="Mover para cima">↑</button>
                  <button className="btn btn-sm" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} title="Mover para baixo">↓</button>
                  <button className="btn btn-sm btn-danger" onClick={() => removeSection(sec.instanceId)} title="Remover">✕</button>
                </div>
              </div>

              {isSelected && mod && (
                <div className="admin-page-section-body">
                  <Suspense fallback={<div>Carregando editor...</div>}>
                    <mod.Admin
                      content={pageContent}
                      onUpdate={handleContentUpdate}
                      onUpdateListItem={handleUpdateListItem}
                      onAddListItem={handleAddListItem}
                      onRemoveListItem={handleRemoveListItem}
                      openImageLibrary={openImageLibrary}
                      editingItemId={editingItemId}
                      setEditingItemId={setEditingItemId}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )
        })}

        {sections.length === 0 && (
          <p className="admin-empty">Nenhuma seção. Adicione uma usando o botão acima.</p>
        )}
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
