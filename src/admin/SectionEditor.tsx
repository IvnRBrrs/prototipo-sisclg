import { useState, useEffect, Suspense } from 'react'
import { bulkUpdateContent, updatePageContent, fetchCadastro, type OrgCadastro } from '../cms/api'
import { fetchPagesCachedAdmin, fetchContentCachedAdmin, fetchPageContentCachedAdmin, invalidateCache } from '../cms/contentCache'
import { getModularSection } from '../cms/registry'
import { AdminProps } from '../cms/types'
import ImagePickerModal from './ImagePickerModal'

// Mapeamento: content key → campo do Cadastro da organização (org_cadastro).
// O botão "Importar do Cadastro" aparece quando a seção atual tem pelo menos
// 1 key com mapeamento. Ao clicar, busca o cadastro e preenche via onUpdate.
const CADASTRO_MAP: Record<string, (cad: OrgCadastro) => string> = {
  address: (cad) => [cad.endereco_logradouro, cad.endereco_numero, cad.endereco_complemento, cad.endereco_bairro, cad.endereco_cidade, cad.endereco_estado, cad.endereco_cep].filter(Boolean).join(', '),
  footer_address: (cad) => [cad.endereco_logradouro, cad.endereco_numero, cad.endereco_complemento, cad.endereco_bairro, cad.endereco_cidade, cad.endereco_estado, cad.endereco_cep].filter(Boolean).join(', '),
  map_address: (cad) => [cad.endereco_logradouro, cad.endereco_numero, cad.endereco_bairro, cad.endereco_cidade, cad.endereco_estado, cad.endereco_cep].filter(Boolean).join(', '),
  phone_fixo: (cad) => cad.telefone_corporativo,
  footer_phone_fixo: (cad) => cad.telefone_corporativo,
  phone_whatsapp: (cad) => cad.responsavel_telefone,
  footer_phone_whatsapp: (cad) => cad.responsavel_telefone,
  footer_copyright: (cad) => cad.nome_fantasia || cad.razao_social,
  footer_description: (cad) => cad.nome_fantasia ? `${cad.nome_fantasia} — ${cad.razao_social}` : cad.razao_social,
  hero_welcome: (cad) => cad.nome_fantasia ? `Bem-vindo ao ${cad.nome_fantasia}` : '',
  website: (cad) => cad.website,
  social_instagram_url: (cad) => cad.website ? `https://instagram.com/${cad.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\..*$/, '')}` : '',
  social_instagram_handle: (cad) => cad.website ? `@${cad.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\..*$/, '')}` : '',
}

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
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  useEffect(() => {
    fetchPagesCachedAdmin().then(({ data }) => setPages(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const load = selectedPage
      ? fetchPageContentCachedAdmin(selectedPage).then(r => r.data)
      : fetchContentCachedAdmin().then(r => r.data)
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

  // ===== Importar do Cadastro =====
  const sectionKeys = mod ? mod.schema.keys.map((k) => k.key) : []
  const mappableKeys = sectionKeys.filter((key) => CADASTRO_MAP[key])
  const hasMappable = mappableKeys.length > 0

  const importFromCadastro = async () => {
    setImporting(true)
    setImportMsg('')
    try {
      const cad = await fetchCadastro()
      let filled = 0
      let skipped = 0
      for (const key of mappableKeys) {
        const val = CADASTRO_MAP[key](cad)
        if (val && val.trim()) {
          handleUpdate(key, val)
          filled++
        } else {
          skipped++
        }
      }
      setImportMsg(filled > 0
        ? `✓ ${filled} campo(s) importado(s) do cadastro${skipped > 0 ? ` (${skipped} sem dados no cadastro)` : ''}. Revise e salve.`
        : 'Nenhum dado encontrado no cadastro para esta seção. Preencha o Cadastro da organização primeiro (Configurações > Cadastro).')
    } catch (err: any) {
      setImportMsg(err.response?.data?.error || 'Erro ao importar do cadastro')
    } finally {
      setImporting(false)
      setTimeout(() => setImportMsg(''), 6000)
    }
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
        {hasMappable && (
          <button
            className="btn btn-outline"
            onClick={importFromCadastro}
            disabled={importing}
            title="Preenche os campos desta seção com os dados salvos em Configurações > Cadastro"
            style={{ whiteSpace: 'nowrap' }}
          >
            {importing ? 'Importando...' : '📋 Cadastro'}
          </button>
        )}
      </div>
      {importMsg && (
        <div style={{
          padding: '8px 16px', margin: '0 16px 4px', borderRadius: 6,
          background: importMsg.startsWith('✓') ? 'rgba(22,163,74,0.08)' : 'rgba(180,83,9,0.08)',
          border: `1px solid ${importMsg.startsWith('✓') ? 'rgba(22,163,74,0.2)' : 'rgba(180,83,9,0.2)'}`,
          fontSize: '0.78rem',
          color: importMsg.startsWith('✓') ? '#16a34a' : '#b45309',
        }}>
          {importMsg}
        </div>
      )}
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
