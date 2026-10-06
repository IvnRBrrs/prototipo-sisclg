import { useState, useEffect } from 'react'
import { bulkUpdateContent } from '../cms/api'
import { fetchContentCachedAdmin, invalidateCache } from '../cms/contentCache'
import api from '../cms/api'

// Cores padrão do site (index.css :root) — usadas para o botão Reset
const DEFAULTS: Record<string, string> = {
  color_primary: '#09346A',
  color_primary_dark: '#06244A',
  color_primary_light: '#153D8A',
  color_accent: '#F4F084',
  color_text: '#212121',
  color_text_light: '#555555',
  color_bg: '#F5F5F5',
  color_bg_white: '#FFFFFF',
  color_border: '#E0E0E0',
}

interface ColorField {
  key: string
  label: string
  cssVar: string
  description: string
}

const FIELDS: ColorField[] = [
  { key: 'color_primary', label: 'Cor Primária', cssVar: '--primary', description: 'Botões primários, links, títulos em destaque' },
  { key: 'color_primary_dark', label: 'Primária Escura', cssVar: '--primary-dark', description: 'Footer, navbar no topo, hover de títulos' },
  { key: 'color_primary_light', label: 'Primária Clara', cssVar: '--primary-light', description: 'Hover de botões, labels de seção, bordas' },
  { key: 'color_accent', label: 'Cor de Destaque', cssVar: '--accent', description: 'Título manuscrito do Hero, ícones sociais' },
  { key: 'color_text', label: 'Texto', cssVar: '--text', description: 'Cor geral do texto' },
  { key: 'color_text_light', label: 'Texto Secundário', cssVar: '--text-light', description: 'Subtítulos, descrições' },
  { key: 'color_bg', label: 'Fundo Geral', cssVar: '--bg', description: 'Cor de fundo da página' },
  { key: 'color_bg_white', label: 'Fundo Branco', cssVar: '--bg-white', description: 'Cards, navbar scrolled' },
  { key: 'color_border', label: 'Bordas', cssVar: '--border', description: 'Bordas de cards e separadores' },
]

const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim())

export default function ThemeEditor() {
  const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULTS })
  const [originais, setOriginais] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')

  const load = async () => {
    setError('')
    try {
      const { data } = await fetchContentCachedAdmin()
      const loaded = { ...DEFAULTS }
      for (const f of FIELDS) {
        const val = String(data[f.key] || '').trim()
        if (isValidHex(val)) loaded[f.key] = val.toUpperCase()
      }
      setColors(loaded)
      setOriginais({ ...loaded })
      try {
        const { data: theme } = await api.get('/public/theme')
        setOrgName(theme?.nome || '')
      } catch { }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar cores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const set = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setStatus('')
    setError('')
    try {
      const entries: Record<string, string> = {}
      for (const f of FIELDS) {
        entries[f.key] = colors[f.key]
      }
      await bulkUpdateContent(entries)
      invalidateCache('global_content')
      setStatus('Esquema de cores salvo! O site público já reflete as novas cores.')
      setOriginais({ ...colors })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar cores')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (!confirm('Restaurar o esquema de cores padrão do site?')) return
    setColors({ ...DEFAULTS })
    setStatus('Esquema padrão restaurado (clique Salvar para aplicar).')
  }

  const hasChanges = FIELDS.some(f => colors[f.key] !== originais[f.key])
  const isCustom = FIELDS.some(f => colors[f.key] !== DEFAULTS[f.key])

  if (loading) return <div className="admin-users"><p>Carregando cores…</p></div>

  return (
    <div className="admin-users theme-editor">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Cores do Site</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
          🎨 {orgName ? `${orgName} — ` : ''}esquema de cores do site público, vinculado ao company_id desta organização.
          {isCustom ? ' Esquema personalizado ativo.' : ' Usando o esquema padrão.'}
        </p>
      </div>

      {status && <p style={{ marginBottom: 12, fontSize: '0.85rem', color: '#16a34a' }}>{status}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}

      {/* Preview ao vivo */}
      <div className="theme-preview" style={{
        display: 'flex', gap: 12, alignItems: 'center', padding: 16,
        borderRadius: 10, marginBottom: 20, border: '1px solid var(--primary-light)',
        background: colors.color_bg,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: colors.color_bg_white, padding: '12px 20px', borderRadius: 8,
          border: `1px solid ${colors.color_border}`,
        }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: colors.color_primary }} />
          <span style={{ color: colors.color_text, fontWeight: 600, fontSize: '0.9rem' }}>Título</span>
          <span style={{ color: colors.color_text_light, fontSize: '0.8rem' }}>texto</span>
          <div style={{
            padding: '6px 14px', borderRadius: 6, background: colors.color_primary,
            color: '#fff', fontSize: '0.75rem', fontWeight: 600,
          }}>Botão</div>
          <div style={{
            padding: '6px 14px', borderRadius: 6, background: 'transparent',
            border: `2px solid ${colors.color_primary}`, color: colors.color_primary, fontSize: '0.75rem', fontWeight: 600,
          }}>Outline</div>
          <span style={{
            fontFamily: 'cursive', fontSize: '1.4rem', color: colors.color_accent, fontWeight: 500,
          }}>Aa</span>
        </div>
      </div>

      <div className="theme-grid">
        {FIELDS.map((f) => {
          const val = colors[f.key]
          const isDefault = val === DEFAULTS[f.key]
          return (
            <div key={f.key} className="theme-field">
              <div className="theme-field-info">
                <div className="theme-field-label">{f.label}</div>
                <div className="theme-field-desc">{f.description}</div>
                <div className="theme-field-source">
                  {isDefault ? 'ⓓ Padrão do site' : 'ⓒ Personalizada'} · <code>{f.cssVar}</code>
                </div>
              </div>
              <div className="theme-field-controls">
                <button
                  type="button"
                  className="theme-swatch"
                  style={{ background: val }}
                  onClick={() => setOpenPicker(openPicker === f.key ? null : f.key)}
                  title="Abrir paleta de cores"
                  aria-label={`Paleta para ${f.label}`}
                />
                <input
                  type="text"
                  className="theme-hex-input"
                  value={val}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder="#09346A"
                  maxLength={7}
                  spellCheck={false}
                />
                <input
                  type="color"
                  className="theme-native-picker"
                  value={val}
                  onChange={(e) => set(f.key, e.target.value.toUpperCase())}
                  title="Seletor nativo de cores"
                />
              </div>
              {openPicker === f.key && (
                <div className="theme-palette">
                  <div className="theme-palette-row">
                    {['#09346A', '#06244A', '#153D8A', '#F4F084', '#E53935', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100', '#00695C', '#37474F', '#8D6E63', '#C62828', '#AD1457', '#4527A0', '#00838F'].map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`theme-palette-color${val === c ? ' selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => { set(f.key, c); setOpenPicker(null) }}
                        title={c}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => { set(f.key, DEFAULTS[f.key]); setOpenPicker(null) }}
                    style={{ marginTop: 8 }}
                  >
                    Restaurar padrão ({DEFAULTS[f.key]})
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving || !hasChanges || FIELDS.some(f => !isValidHex(colors[f.key]))}
        >
          {saving ? 'Salvando…' : hasChanges ? 'Salvar Cores' : 'Sem alterações'}
        </button>
        <button
          className="btn btn-outline"
          onClick={reset}
          disabled={saving || !isCustom}
          title="Restaurar o esquema padrão do site"
        >
          ↺ Resetar para o Padrão
        </button>
      </div>
      {FIELDS.some(f => !isValidHex(colors[f.key])) && (
        <p style={{ marginTop: 8, fontSize: '0.78rem', color: '#b45309' }}>
          ⚠ Algum valor de cor está inválido — use o formato #RRGGBB (ex.: #09346A).
        </p>
      )}
      <p style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-light)' }}>
        As cores são gravadas na tabela <code>content</code> com o <code>company_id</code> da organização ativa
        e aplicadas no site público como override das variáveis CSS.
      </p>
    </div>
  )
}
