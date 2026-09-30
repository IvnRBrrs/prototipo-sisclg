import { lazy } from 'react'
import { ModularSection } from './types'
import HeroComponent from '../sections/Hero/index'

const schemas = import.meta.glob('../sections/*/schema.ts', { eager: true })
const components = import.meta.glob('../sections/*/index.tsx')
const admins = import.meta.glob('../sections/*/admin.tsx')

export const modularSections: Record<string, ModularSection> = {}

Object.keys(schemas).forEach((path) => {
  const schema = (schemas[path] as any)?.default
  const sectionTitle = schema?.title
  if (!schema || !sectionTitle) return

  const componentPath = path.replace('schema.ts', 'index.tsx')
  const adminPath = path.replace('schema.ts', 'admin.tsx')

  const componentLoader = components[componentPath]
  const adminLoader = admins[adminPath]

  if (schema && componentLoader && adminLoader) {
    modularSections[schema.title] = {
      schema,
      Component: schema.title === 'Hero' ? HeroComponent : lazy(componentLoader as any),
      Admin: lazy(adminLoader as any),
    }
  }
})

export function getModularSection(title: string): ModularSection | undefined {
  const baseTitle = title.split('#')[0]
  return modularSections[baseTitle]
}

export function getAllSectionTitles(): string[] {
  return Object.keys(modularSections)
}
