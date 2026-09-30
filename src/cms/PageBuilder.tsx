import { useMemo, Suspense } from 'react'
import { getModularSection } from './registry'

function createContentProxy(
  rawContent: Record<string, string>,
  instanceId?: string
): Record<string, string> {
  return new Proxy(rawContent, {
    get(target, prop) {
      if (typeof prop !== 'string') return (target as any)[prop]
      const prefixedKey = instanceId ? `${instanceId}_${prop}` : prop
      return target[prefixedKey] !== undefined ? target[prefixedKey] : target[prop]
    },
  })
}

interface PageBuilderProps {
  sections: { title: string; instanceId?: string; content: Record<string, string> }[]
}

function SectionRenderer({ section }: { section: { title: string; instanceId?: string; content: Record<string, string> } }) {
  const mod = getModularSection(section.title)
  const content = useMemo(
    () => createContentProxy(section.content, section.instanceId),
    [section.content, section.instanceId]
  )
  if (!mod) {
    console.warn('[PageBuilder] Section not found in registry:', section.title)
    return null
  }
  const SectionComponent = mod.Component
  return (
    <Suspense fallback={null}>
      <SectionComponent content={content} instanceId={section.instanceId} />
    </Suspense>
  )
}

export default function PageBuilder({ sections }: PageBuilderProps) {
  return (
    <div className="page-sections">
      {sections.map((section, i) => (
        <SectionRenderer key={section.instanceId || section.title + i} section={section} />
      ))}
    </div>
  )
}
