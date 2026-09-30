import { useState, useEffect } from 'react'
import { AdminProps } from '../../cms/types'
import { fetchBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, fetchBlogPost } from '../../cms/api'
import { getCachedBlogPostsSync, invalidateCache } from '../../cms/contentCache'
import ImagePickerModal from '../../admin/ImagePickerModal'

export default function BlogAdmin({ content, onUpdate }: AdminProps) {
  const [showSectionConfig, setShowSectionConfig] = useState(false)
  const [posts, setPosts] = useState<any[]>(() => {
    const cached = getCachedBlogPostsSync()
    return cached || []
  })
  const [total, setTotal] = useState(() => {
    const cached = getCachedBlogPostsSync()
    return cached ? cached.length : 0
  })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({
    title: '', subtitle: '', content: '', author: '', date: new Date().toISOString().split('T')[0],
    tags: '', images: '[]', videos: '[]', published: true,
  })
  const [loading, setLoading] = useState(() => !getCachedBlogPostsSync())
  const [saving, setSaving] = useState(false)
  const [imagePickerTarget, setImagePickerTarget] = useState<'images' | 'videos' | null>(null)

  const loadPosts = async () => {
    try {
      const data = await fetchBlogPosts({ page, limit: 10, search })
      setPosts(data.posts)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadPosts() }, [page, search])

  const resetForm = () => {
    setForm({ title: '', subtitle: '', content: '', author: '', date: new Date().toISOString().split('T')[0], tags: '', images: '[]', videos: '[]', published: true })
    setEditingId(null)
    setShowForm(false)
  }

  const editPost = async (id: string) => {
    try {
      const post = await fetchBlogPost(id)
      setForm({
        title: post.title || '',
        subtitle: post.subtitle || '',
        content: post.content || '',
        author: post.author || '',
        date: post.date || '',
        tags: (() => { try { return JSON.parse(post.tags).join(', ') } catch { return '' } })(),
        images: (() => { try { return JSON.stringify(JSON.parse(post.images), null, 2) } catch { return '[]' } })(),
        videos: (() => { try { return JSON.stringify(JSON.parse(post.videos), null, 2) } catch { return '[]' } })(),
        published: post.published === 1 || post.published === true,
      })
      setEditingId(id)
      setShowForm(true)
    } catch {}
  }

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Título é obrigatório')
    setSaving(true)
    try {
      const tags = form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      let images: any[] = []
      let videos: any[] = []
      try { if (form.images) images = JSON.parse(form.images) } catch { images = form.images ? [{ url: form.images }] : [] }
      try { if (form.videos) videos = JSON.parse(form.videos) } catch { videos = form.videos ? [{ url: form.videos }] : [] }

      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        content: form.content,
        author: form.author,
        date: form.date,
        tags,
        images,
        videos,
        published: form.published,
      }

      if (editingId) {
        await updateBlogPost(editingId, payload)
      } else {
        await createBlogPost(payload)
      }
      resetForm()
      invalidateCache('blog_posts')
      loadPosts()
      alert(editingId ? 'Post atualizado!' : 'Post criado!')
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.error || err.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este post?')) return
    try {
      await deleteBlogPost(id)
      if (editingId === id) resetForm()
      invalidateCache('blog_posts')
      loadPosts()
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleImagePickerSelect = (url: string, filename?: string) => {
    if (!imagePickerTarget) return
    try {
      const current = JSON.parse(form[imagePickerTarget] || '[]')
      if (!Array.isArray(current)) throw new Error('not array')
      const newEntry: any = { url }
      if (imagePickerTarget === 'images') {
        newEntry.alt = filename || ''
      } else {
        newEntry.caption = filename || ''
      }
      current.push(newEntry)
      setForm({ ...form, [imagePickerTarget]: JSON.stringify(current, null, 2) })
    } catch {
      setForm({ ...form, [imagePickerTarget]: JSON.stringify([{ url, alt: filename || '' }], null, 2) })
    }
    setImagePickerTarget(null)
  }

  const removeJsonItem = (target: 'images' | 'videos', index: number) => {
    try {
      const current = JSON.parse(form[target] || '[]')
      if (Array.isArray(current)) {
        current.splice(index, 1)
        setForm({ ...form, [target]: JSON.stringify(current, null, 2) })
      }
    } catch {}
  }

  const renderJsonPreview = (target: 'images' | 'videos') => {
    let items: any[] = []
    try { items = JSON.parse(form[target] || '[]') } catch { return null }
    if (!Array.isArray(items) || items.length === 0) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            position: 'relative', width: 80, height: 80, borderRadius: 6, overflow: 'hidden',
            border: '1px solid var(--border)', background: '#f0f0f0',
          }}>
            {target === 'images' ? (
              <img src={item.url} alt={item.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.7rem', color: 'var(--text-light)', padding: 4, wordBreak: 'break-all' }}>
                {item.url?.substring(0, 30)}...
              </div>
            )}
            <button onClick={() => removeJsonItem(target, i)} style={{
              position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
              border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1, padding: 0,
            }}>✕</button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="admin-fields">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowSectionConfig((v) => !v)}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 600 }}>{showSectionConfig ? '▼' : '▶'}</span>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Configurações da Seção</span>
      </div>
      {showSectionConfig && (
        <>
          <div className="admin-field">
            <label>Label da Seção</label>
            <input value={content.blog_label || ''} onChange={(e) => onUpdate('blog_label', e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Prefixo do Título</label>
            <input value={content.blog_title_prefix || ''} onChange={(e) => onUpdate('blog_title_prefix', e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Destaque do Título</label>
            <input value={content.blog_title_highlight || ''} onChange={(e) => onUpdate('blog_title_highlight', e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Subtítulo</label>
            <textarea rows={2} value={content.blog_subtitle || ''} onChange={(e) => onUpdate('blog_subtitle', e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Posts por Página</label>
            <input value={content.blog_posts_per_page || '10'} onChange={(e) => onUpdate('blog_posts_per_page', e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Mostrar Sidebar (true/false)</label>
            <input value={content.blog_show_sidebar || 'true'} onChange={(e) => onUpdate('blog_show_sidebar', e.target.value)} />
          </div>
        </>
      )}

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

      <div className="admin-list-section">
        <h4>Gerenciar Posts <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-light)' }}>({total} total)</span></h4>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar posts..."
            style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
          />
          {!editingId && !showForm && (
            <button className="btn btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true) }}>+ Novo Post</button>
          )}
        </div>

        {showForm && (
          <div className="admin-list-item" style={{ padding: 16, marginBottom: 16, background: '#f8f9fa', borderRadius: 8 }}>
            <h5 style={{ margin: '0 0 12px', color: 'var(--primary)' }}>{editingId ? 'Editar Post' : 'Novo Post'}</h5>
            <div className="admin-field">
              <label>Título *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do post" />
            </div>
            <div className="admin-field">
              <label>Subtítulo</label>
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtítulo" />
            </div>
            <div className="admin-field">
              <label>Conteúdo (HTML)</label>
              <textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Texto do post com HTML..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12 }}>
              <div className="admin-field">
                <label>Autor</label>
                <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Nome do autor" />
              </div>
              <div className="admin-field">
                <label>Data</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="admin-field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Publicado</label>
                <input type="checkbox" checked={!!form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  style={{ width: 20, height: 20, cursor: 'pointer' }} />
              </div>
            </div>
            <div className="admin-field">
              <label>Tags (separadas por vírgula)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ex: evento, ensino, notícia" />
            </div>
            <div className="admin-field">
              <label>Imagens</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })}
                  placeholder='[{"url": "https://...", "alt": "descrição"}]'
                  style={{ flex: 1 }} />
                <button className="btn btn-sm btn-outline" onClick={() => setImagePickerTarget('images')}
                  style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                  + Biblioteca
                </button>
              </div>
              {renderJsonPreview('images')}
            </div>
            <div className="admin-field">
              <label>Vídeos (JSON array de URLs)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea rows={3} value={form.videos} onChange={(e) => setForm({ ...form, videos: e.target.value })}
                  placeholder='[{"url": "https://youtube.com/embed/...", "caption": "descrição"}]'
                  style={{ flex: 1 }} />
              </div>
              {renderJsonPreview('videos')}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Post'}
              </button>
              <button className="btn btn-sm btn-outline" onClick={resetForm}>Cancelar</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="admin-empty">Carregando...</p>
        ) : posts.length === 0 ? (
          <p className="admin-empty">Nenhum post.{search ? ' Tente outra busca.' : ' Crie o primeiro post!'}</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Autor</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => {
                  let tags: string[] = []
                  try { tags = JSON.parse(p.tags) } catch {}
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td>{p.author || '-'}</td>
                      <td>{p.date || '-'}</td>
                      <td style={{ fontSize: '0.75rem' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                          background: p.published ? 'rgba(46,125,50,0.1)' : 'rgba(200,0,0,0.08)',
                          color: p.published ? '#2e7d32' : '#c62828',
                          fontSize: '0.72rem', fontWeight: 600,
                        }}>{p.published ? 'Publicado' : 'Rascunho'}</span>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => editPost(p.id)}>Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Excluir</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, alignItems: 'center' }}>
              <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Página {page} ({total} posts)</span>
              <button className="btn btn-sm btn-outline" disabled={posts.length < 10} onClick={() => setPage((p) => p + 1)}>Próxima</button>
            </div>
          </>
        )}
      </div>

      {imagePickerTarget && (
        <ImagePickerModal
          onSelect={handleImagePickerSelect}
          onClose={() => setImagePickerTarget(null)}
        />
      )}
    </div>
  )
}
