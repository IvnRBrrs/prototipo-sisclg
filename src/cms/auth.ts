export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  GESTOR_ADMIN: 'gestor_admin',
  COORDENADOR_PEDAGOGICO: 'coordenador_pedagogico',
  SECRETARIA_ESCOLAR: 'secretaria_escolar',
  FINANCEIRO: 'financeiro',
  PROFESSOR: 'professor',
  EDITOR_ADMIN: 'editor_admin',
  EDITOR_BLOG: 'editor_blog',
}

export const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Super Administrador',
  gestor_admin: 'Gestor de Alunos',
  coordenador_pedagogico: 'Coordenador Pedagógico',
  secretaria_escolar: 'Secretaria Escolar',
  financeiro: 'Tesouraria / Financeiro',
  professor: 'Professor',
  editor_admin: 'Editor do Site',
  editor_blog: 'Editor do Blog',
}

export function getRoleFromToken(): string | null {
  const token = localStorage.getItem('cms_token') || localStorage.getItem('supabase_token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const role = payload.user_metadata?.role || payload.role
    if (role) return role
    console.warn('[auth] Token sem role (token antigo). Assumindo super_admin. Faça logout e login novamente para obter um token atualizado.')
    return ROLES.SUPER_ADMIN
  } catch {
    return null
  }
}

export function getUsernameFromToken(): string | null {
  const token = localStorage.getItem('cms_token') || localStorage.getItem('supabase_token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.username || payload.email || null
  } catch {
    return null
  }
}

export function getCompanyIdFromToken(): string {
  const token = localStorage.getItem('cms_token') || localStorage.getItem('supabase_token')
  if (!token) return 'default'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.company_id || payload.user_metadata?.company_id || 'default'
  } catch {
    return 'default'
  }
}

export function hasRole(...allowed: string[]): boolean {
  const role = getRoleFromToken()
  if (!role) return false
  return allowed.includes(role)
}
