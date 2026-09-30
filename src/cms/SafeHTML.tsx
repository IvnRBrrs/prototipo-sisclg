import { createElement, HTMLAttributes } from 'react'

interface SafeHTMLProps extends HTMLAttributes<HTMLElement> {
  html: string
  tag?: string
  fallback?: string
}

function sanitize(html: string): string {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

export default function SafeHTML({ html, tag = 'div', className, fallback = '', ...rest }: SafeHTMLProps) {
  if (!html) {
    return fallback ? createElement(tag, { className, ...rest }, fallback) : null
  }

  return createElement(tag, {
    className,
    dangerouslySetInnerHTML: { __html: sanitize(html) },
    ...rest,
  })
}
