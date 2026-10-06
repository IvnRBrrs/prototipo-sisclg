import { useEffect, useState } from 'react'
import { fetchContentCached, getCachedContentSync } from '../cms/contentCache'

// Mapeamento: chave do content → variável CSS que ela sobrescreve
const COLOR_MAP: Record<string, string> = {
  color_primary: '--primary',
  color_primary_dark: '--primary-dark',
  color_primary_light: '--primary-light',
  color_accent: '--accent',
  color_text: '--text',
  color_text_light: '--text-light',
  color_bg: '--bg',
  color_bg_white: '--bg-white',
  color_border: '--border',
}

const STYLE_ID = 'org-theme-override'

/**
 * Aplica o esquema de cores da organização ativa como override das variáveis
 * CSS do site público. Se um campo estiver vazio, a variável CSS padrão
 * (definida em index.css :root) permanece.
 */
export default function DynamicTheme() {
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    const apply = (content: Record<string, string>) => {
      let css = ''
      for (const [key, cssVar] of Object.entries(COLOR_MAP)) {
        const val = String(content[key] || '').trim()
        if (val && /^#[0-9a-fA-F]{3,8}$/.test(val)) {
          css += `  ${cssVar}: ${val} !important;\n`
        }
      }
      // Remove o style anterior (se houver)
      document.getElementById(STYLE_ID)?.remove()
      if (css) {
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = `:root {\n${css}}`
        document.head.appendChild(style)
      }
      setApplied(true)
    }

    const cached = getCachedContentSync()
    if (cached) apply(cached)
    fetchContentCached().then(({ data }) => apply(data)).catch(() => {})
  }, [])

  return null
}
