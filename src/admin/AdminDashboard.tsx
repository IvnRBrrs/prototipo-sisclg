import { useState, useEffect } from 'react'
import { getModularSection, getAllSectionTitles } from '../cms/registry'
import { ROLES } from '../cms/auth'

interface AdminDashboardProps {
  onNavigate: (view: string, section?: string) => void
  unreadMessages: number
  unreadPreEnrollments: number
  role: string | null
  activeCompanyId?: string | null
  activeCompanyName?: string | null
  onEnterCompany: (companyId: string) => void
  onLeaveCompany: () => void
}

interface DashItem {
  view: string
  icon: string
  label: string
  desc: string
  badge?: number
}

export default function AdminDashboard({ onNavigate, unreadMessages, unreadPreEnrollments, role, activeCompanyId = null, activeCompanyName = null, onEnterCompany, onLeaveCompany }: AdminDashboardProps) {
  const [openGroup, setOpenGroup] = useState('conteudo')

  // Supabase SUSPENSO por enquanto — reativar (true) quando o uso voltar.
  const SUPABASE_UI_ATIVO = false

  const sectionTitles = getAllSectionTitles()

  const frontendSectionTitles = [
    'Hero', 'Sobre', 'Segmentos', 'Galeria', 'Depoimentos',
    'FAQ', 'Contato', 'Mapa', 'Blog', 'Footer', 'Navbar',
    'CallToAction', 'ConteudoGenerico',
  ]

  const isSuperAdmin = role === ROLES.SUPER_ADMIN
  const isEditorAdmin = role === ROLES.EDITOR_ADMIN
  const isEditorBlog = role === ROLES.EDITOR_BLOG
  const isGestorAdmin = role === ROLES.GESTOR_ADMIN
  const isCoordenador = role === ROLES.COORDENADOR_PEDAGOGICO
  const isSecretaria = role === ROLES.SECRETARIA_ESCOLAR
  const isFinanceiro = role === ROLES.FINANCEIRO
  const isProfessor = role === ROLES.PROFESSOR
  const canManageUsers = isSuperAdmin || isGestorAdmin

  const visibleSections = sectionTitles.filter((title) => {
    if (isSuperAdmin) return true
    if (isEditorAdmin) return frontendSectionTitles.includes(title)
    if (isEditorBlog) return title === 'Blog'
    return false
  })

  const commBadge = unreadMessages + unreadPreEnrollments

  const item = (view: string, icon: string, label: string, desc: string, show: boolean, badge?: number): DashItem | null =>
    show ? { view, icon, label, desc, badge } : null

  const groups: { key: string; title: string; show: boolean; badge?: number }[] = [
    { key: 'organizacoes', title: 'Organizações', show: isSuperAdmin },
    { key: 'conteudo', title: 'Conteúdo do Site', show: isSuperAdmin || isEditorAdmin || isEditorBlog || isGestorAdmin },
    { key: 'comunicacao', title: 'Comunicação', show: isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria, badge: commBadge },
    { key: 'cadastros', title: 'Cadastros', show: isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria },
    { key: 'academico', title: 'Acadêmico', show: isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria || isFinanceiro || isProfessor },
    { key: 'configuracoes', title: 'Configurações', show: isSuperAdmin || isGestorAdmin },
    { key: 'sistema', title: 'Sistema', show: canManageUsers },
  ]

  const groupItems: Record<string, (DashItem | null)[]> = {
    organizacoes: [
      item('organizations', '🏢', 'Organizações', 'Criar, editar e acessar organizações', isSuperAdmin),
    ],
    conteudo: [
      item('pages', '📄', 'Páginas', 'Gerenciar páginas e suas seções', isSuperAdmin || isEditorAdmin),
      item('blog', '✍️', 'Blog', 'Gerenciar posts do blog', isSuperAdmin || isEditorAdmin || isEditorBlog || isGestorAdmin),
      item('images', '🖼️', 'Biblioteca de Imagens', 'Gerenciar imagens enviadas', isSuperAdmin || isEditorAdmin || isGestorAdmin),
      item('theme', '🎨', 'Cores do Site', 'Personalizar o esquema de cores do site público', isSuperAdmin || isEditorAdmin || isGestorAdmin),
    ],
    comunicacao: [
      item('messages', '✉️', 'Mensagens', 'Visualizar mensagens do formulário de contato', isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria, unreadMessages),
      item('pre_enrollments', '📝', 'Pré-Matrícula', 'Gerenciar solicitações de pré-matrícula', isSuperAdmin || isGestorAdmin || isSecretaria, unreadPreEnrollments),
    ],
    cadastros: [
      item('historico_alunos', '📋', 'Cadastro de Alunos', 'Gerenciar registros de alunos', isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria),
      item('historico_editor', '🎓', 'Histórico Escolar', 'Documentos de histórico dos alunos', isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria),
      item('turmas', '🏫', 'Turmas', 'Gerenciar turmas e enturmação', isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria),
      item('professores', '👨‍🏫', 'Professores', 'Cadastro de professores', isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria),
      item('disciplinas', '📚', 'Disciplinas', 'Cadastro de disciplinas', isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria),
      item('anos_letivos', '📅', 'Anos Letivos', 'Definir o ano letivo ativo', isSuperAdmin || isGestorAdmin || isCoordenador),
    ],
    academico: [
      item('matriculas', '📑', 'Matrículas', 'Matrículas e rematrículas', isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria || isFinanceiro),
      item('notas', '📊', 'Notas e Boletim', 'Lançar notas e gerar boletim', isSuperAdmin || isGestorAdmin || isCoordenador || isProfessor),
      item('frequencia', '✅', 'Frequência', 'Chamadas e resumo de presença', isSuperAdmin || isGestorAdmin || isCoordenador || isProfessor),
      item('diario_classe', '📖', 'Diário de Classe', 'Aulas diárias, conteúdo e chamada por turma', isSuperAdmin || isGestorAdmin || isCoordenador || isProfessor),
      item('ocorrencias', '⚠️', 'Ocorrências', 'Registro de ocorrências dos alunos', isSuperAdmin || isGestorAdmin || isCoordenador || isProfessor),
      item('conselho_classe', '🏛️', 'Conselho de Classe', 'Pareceres e consolidação de resultados', isSuperAdmin || isGestorAdmin || isCoordenador),
    ],
    configuracoes: [
      item('cadastro', '🗂️', 'Cadastro', 'Dados jurídicos, fiscais e do responsável legal da organização', isSuperAdmin || isGestorAdmin),
    ],
    sistema: [
      item('users', '👥', 'Usuários (T.)', 'Criar e gerenciar usuários', canManageUsers),
      item('supabase_users', '🔐', 'Usuários (Server S.)', 'Gerenciar usuários do Server S.', SUPABASE_UI_ATIVO && (isSuperAdmin || isGestorAdmin)),
      item('backups', '💾', 'Backups', 'Gerenciar backups do conteúdo', isSuperAdmin),
      item('setup', '⚙️', 'Configuração Inicial', 'Criar usuário admin (primeiro acesso)', isSuperAdmin),
      item('login_log', '🕵️', 'Log de Acesso', 'Histórico de logins', isSuperAdmin),
    ],
  }

  const renderItems = (items: (DashItem | null)[]) => {
    const visible = items.filter(Boolean) as DashItem[]
    if (visible.length === 0) return null
    return (
      <div className="admin-cards">
        {visible.map((it) => (
          <div key={it.view} className="admin-card" onClick={() => onNavigate(it.view)}>
            <div className="admin-card-icon">{it.icon}</div>
            <div className="admin-card-info">
              <h3>
                {it.label}
                {it.badge !== undefined && it.badge > 0 ? <span className="admin-badge">{it.badge > 99 ? '99+' : it.badge}</span> : null}
              </h3>
              <p>{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      {activeCompanyId && (
        <div className="admin-org-banner">
          <span>
            🏢 Organização ativa: <strong>{activeCompanyName || activeCompanyId}</strong> — o painel abaixo está operando nos dados desta organização.
          </span>
          <button className="btn btn-sm btn-outline" onClick={onLeaveCompany}>Sair da organização</button>
        </div>
      )}
      <div className="admin-dashboard-header">
        <h2>Painel de Controle</h2>
        <p>Bem-vindo. Escolha uma categoria para acessar os módulos.</p>
      </div>

      <div className="admin-dashboard-tabs">
        {groups.filter((g) => g.show).map((g) => (
          <button
            key={g.key}
            type="button"
            className={`admin-dashboard-tab${openGroup === g.key ? ' active' : ''}`}
            onClick={() => setOpenGroup((prev) => (prev === g.key ? '' : g.key))}
            aria-expanded={openGroup === g.key}
          >
            {g.badge !== undefined && g.badge > 0 ? (
              <span className="dashboard-tab-badge">{g.badge > 99 ? '99+' : g.badge}</span>
            ) : null}
            <span>{g.title}</span>
            <span className="dashboard-tab-chevron">▸</span>
          </button>
        ))}
      </div>

      {groups.filter((g) => g.show).map((g) =>
        openGroup === g.key ? (
          <div key={g.key} className="admin-dashboard-group">
            {renderItems(groupItems[g.key])}
            {g.key === 'conteudo' && visibleSections.length > 0 && (
              <div className="admin-section-list">
                <h3>Seções do Site</h3>
                <div className="admin-section-grid">
                  {visibleSections.map((title) => {
                    const section = getModularSection(title)
                    if (!section) return null
                    return (
                      <div key={title} className="admin-section-card" onClick={() => onNavigate('section', title)}>
                        <h4>{section.schema.title}</h4>
                        <p>{section.schema.keys.length} campos</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null
      )}
    </div>
  )
}
