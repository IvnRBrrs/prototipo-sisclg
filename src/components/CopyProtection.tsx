import { useEffect } from 'react'

/**
 * Dissuasores de cópia — apenas no site público (SiteLayout).
 * Bloqueia: seleção de texto, Ctrl+C/A/S/U/P, F12, PrintScreen, botão direito,
 * arrastar imagens e blur ao trocar de aba.
 * NÃO afeta o painel administrativo (/admin).
 * Nota: nenhum método é 100% eficaz — estes dissuasores bloqueiam usuários
 * comuns; quem realmente quer copiar (DevTools, JS off, foto do celular) consegue.
 */
export default function CopyProtection() {
  useEffect(() => {
    // CSS: bloquear seleção de texto no site público (body apenas)
    // Exceções: inputs, textareas e selects (formulários de contato/pré-matrícula)
    const style = document.createElement('style')
    style.id = 'copy-protection-css'
    style.textContent = `
      body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      body input, body textarea, body select {
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
      }
    `
    document.head.appendChild(style)

    const BLOCKED_KEYS = ['c', 'a', 's', 'u', 'p']

    const onKeyDown = (e: KeyboardEvent) => {
      // Não bloquear dentro de inputs/textareas do site público (formulários de contato)
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return

      // Ctrl+C, Ctrl+A, Ctrl+S, Ctrl+U, Ctrl+P
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.includes(e.key.toLowerCase())) {
        e.preventDefault()
        return false
      }
      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault()
        return false
      }
      // PrintScreen — dissuasor: limpa o clipboard (o print já saiu, mas o Ctrl+V cola vazio)
      if (e.key === 'PrintScreen') {
        try { navigator.clipboard.writeText('') } catch { }
        return
      }
    }

    const onContextMenu = (e: MouseEvent) => {
      // Não bloquear em inputs (permitir colar em formulários)
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      e.preventDefault()
      return false
    }

    const onSelectStart = (e: Event) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      e.preventDefault()
      return false
    }

    const onDragStart = (e: Event) => {
      e.preventDefault()
      return false
    }

    const onCopy = (e: Event) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      e.preventDefault()
      return false
    }

    // Blur ao trocar de aba (dissuasor contra prints de tela)
    const onBlur = () => {
      document.body.style.filter = 'blur(15px)'
      document.body.style.transition = 'filter 0.2s ease'
    }
    const onFocus = () => {
      document.body.style.filter = ''
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('selectstart', onSelectStart)
    document.addEventListener('dragstart', onDragStart)
    document.addEventListener('copy', onCopy)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      document.getElementById('copy-protection-css')?.remove()
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('selectstart', onSelectStart)
      document.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('copy', onCopy)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      // Restaurar o body se estava borrado
      document.body.style.filter = ''
      document.body.style.transition = ''
    }
  }, [])

  return null
}
