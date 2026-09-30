import { useEffect } from 'react'

interface DynamicStylesProps {
  content: Record<string, string>
}

const STYLE_KEYS: Record<string, string> = {
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

export default function DynamicStyles({ content }: DynamicStylesProps) {
  useEffect(() => {
    const root = document.documentElement
    for (const [key, cssVar] of Object.entries(STYLE_KEYS)) {
      if (content[key]) {
        root.style.setProperty(cssVar, content[key])
      }
    }
  }, [content])

  return null
}
