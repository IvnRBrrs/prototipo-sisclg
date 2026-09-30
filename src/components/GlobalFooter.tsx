import { useEffect, useState } from 'react'
import { fetchContentCached, getCachedContentSync } from '../cms/contentCache'
import FooterSection from '../sections/Footer/index'

function buildFooterContent(data: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {}
  Object.entries(data).forEach(([k, v]) => {
    if (k.startsWith('footer_') || k.startsWith('social_') || k.startsWith('link')) filtered[k] = v
  })
  return filtered
}

export default function GlobalFooter() {
  const [content, setContent] = useState<Record<string, string>>(() => {
    const data = getCachedContentSync()
    return data ? buildFooterContent(data) : {}
  })

  useEffect(() => {
    fetchContentCached().then(({ data }) => setContent(buildFooterContent(data))).catch(() => {})
  }, [])

  return <FooterSection content={content} />
}