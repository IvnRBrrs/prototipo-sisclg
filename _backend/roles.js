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

export const ROLE_NAMES = {
  super_admin: 'Super Administrador',
  gestor_admin: 'Gestor de Alunos',
  coordenador_pedagogico: 'Coordenador Pedagógico',
  secretaria_escolar: 'Secretaria Escolar',
  financeiro: 'Tesouraria / Financeiro',
  professor: 'Professor',
  editor_admin: 'Editor do Site',
  editor_blog: 'Editor do Blog',
}

export const ROLE_WEIGHT = {
  super_admin: 8,
  gestor_admin: 7,
  coordenador_pedagogico: 6,
  secretaria_escolar: 5,
  financeiro: 4,
  professor: 3,
  editor_admin: 2,
  editor_blog: 1,
}

export function canManageRole(managerRole, targetRole) {
  const mw = ROLE_WEIGHT[managerRole] || 0
  const tw = ROLE_WEIGHT[targetRole] || 0
  return mw >= tw
}

export function canCreateRole(managerRole, targetRole) {
  const mw = ROLE_WEIGHT[managerRole] || 0
  const tw = ROLE_WEIGHT[targetRole] || 0
  return mw > tw
}
