import { useEffect, useState } from 'react'
import { fetchContentCached, fetchPagesCached, getCachedContentSync, getCachedPagesSync } from '../cms/contentCache'
import NavbarSection from '../sections/Navbar/index'

function buildNavContent(contentData: Record<string, string>, pages: any[]): Record<string, string> {
  const filtered: Record<string, string> = {}
  Object.entries(contentData).forEach(([k, v]) => {
    if (k.startsWith('nav_') || k.startsWith('_nav_')) filtered[k] = v
  })

  let items: Record<string, any>[] = []
  try { if (filtered._nav_items) items = JSON.parse(filtered._nav_items) } catch {}

  items.forEach((item) => { if (item.label === 'Home') item.href = '/' })

  // Find or create "O Colégio" dropdown
  let colegioItem = items.find((item: any) => item.label === 'O Colégio')
  if (!colegioItem) {
    colegioItem = { _id: 'nav_colegio_' + Date.now(), label: 'O Colégio', href: '', dropdown_items: '[]' }
    const homeIdx = items.findIndex((i: any) => i.label === 'Home')
    items.splice(homeIdx >= 0 ? homeIdx + 1 : items.length, 0, colegioItem)
  }
  if (colegioItem.is_dropdown !== 'true') colegioItem.is_dropdown = 'true'

  const visiblePages = pages.filter((p: any) => p.show_in_menu && p.slug !== 'home')
  let subItems: { label: string; href: string; external?: boolean }[] = []
  try { if (colegioItem.dropdown_items) subItems = JSON.parse(colegioItem.dropdown_items) } catch {}
  visiblePages.forEach((p: any) => {
    const slug = p.slug.replace(/^\/+|\/+$/g, '')
    if (!subItems.some((d: any) => d.href === '/' + slug)) subItems.push({ label: p.title, href: '/' + slug })
  })
  colegioItem.dropdown_items = JSON.stringify(subItems)

  filtered._nav_items = JSON.stringify(items)
  return filtered
}

export default function GlobalNavbar() {
  const [content, setContent] = useState<Record<string, string>>(() => {
    const contentData = getCachedContentSync()
    const pages = getCachedPagesSync()
    if (contentData && pages) {
      return buildNavContent(contentData, pages)
    }
    return {}
  })

  useEffect(() => {
    Promise.all([fetchContentCached(), fetchPagesCached()]).then(([{ data: contentData }, { data: pages }]) => {
      setContent(buildNavContent(contentData, pages))
    }).catch(() => {})
  }, [])

  return <NavbarSection content={content} />
}