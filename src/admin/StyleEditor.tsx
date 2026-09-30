import { useState } from 'react'
import { bulkUpdateContent } from '../cms/api'

const THEME_COLORS = [
  { key: 'color_primary', label: 'Primary', default: '#09346A' },
  { key: 'color_primary_dark', label: 'Primary Dark', default: '#06244A' },
  { key: 'color_primary_light', label: 'Primary Light', default: '#153D8A' },
  { key: 'color_accent', label: 'Accent', default: '#F4F084' },
  { key: 'color_text', label: 'Text', default: '#212121' },
  { key: 'color_text_light', label: 'Text Light', default: '#555' },
  { key: 'color_bg', label: 'Background', default: '#F5F5F5' },
  { key: 'color_bg_white', label: 'Background White', default: '#ffffff' },
  { key: 'color_border', label: 'Border', default: '#e0e0e0' },
]

export default function StyleEditor() {
  const [colors, setColors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await bulkUpdateContent(colors)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-style-editor">
      <h2>Editor de Estilos</h2>
      <p>Personalize as cores do tema.</p>

      <div className="admin-color-grid">
        {THEME_COLORS.map((c) => (
          <div key={c.key} className="admin-color-item">
            <label>{c.label}</label>
            <div className="admin-color-input-row">
              <input
                type="color"
                value={colors[c.key] || c.default}
                onChange={(e) => handleChange(c.key, e.target.value)}
              />
              <input
                type="text"
                value={colors[c.key] || c.default}
                onChange={(e) => handleChange(c.key, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar Cores'}
      </button>
    </div>
  )
}
