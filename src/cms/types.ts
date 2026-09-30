export interface SectionKey {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'number' | 'color'
  default?: string
}

export interface SectionSchema {
  title: string
  keys: SectionKey[]
  listKey?: string
  listFields?: SectionKey[]
  defaultItems?: Record<string, string>[]
  visible?: (content: Record<string, string>) => boolean
}

export interface ModularSection {
  schema: SectionSchema
  Component: React.ComponentType<{ content: Record<string, string>; instanceId?: string }>
  Admin: React.ComponentType<AdminProps>
}

export interface AdminProps {
  content: Record<string, string>
  onUpdate: (key: string, value: string) => void
  onUpdateListItem: (listKey: string, itemId: string, field: string, value: string) => void
  onAddListItem: (listKey: string) => void
  onRemoveListItem: (listKey: string, itemId: string) => void
  openImageLibrary: (field: string, componentType: string, ...args: any[]) => void
  editingItemId: string | null
  setEditingItemId: (id: string | null) => void
}

export interface PageData {
  slug: string
  title: string
  show_in_menu: number
  parent_slug: string | null
  menu_order: number
  sections: string[] // ordered list of section instance IDs
}

export interface BackupEntry {
  id: number
  section_key: string
  value: string
  version: number
  created_at: string
}
