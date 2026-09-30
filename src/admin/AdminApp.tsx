import { useState, useEffect, useRef } from 'react'
import api from '../cms/api'
import { AdminLogin, AdminDashboard, SectionEditor, PageManager, ImageLibrary, StyleEditor, BackupRestore, UserManager, HistoricoAlunos, HistoricoEditor, SupabaseUserManager, TurmasManager, ProfessoresManager, DisciplinasManager, MatriculasManager, NotasManager, FrequenciaManager, DiarioClasseManager, OcorrenciasManager, ConselhoClasseManager, AnosLetivosManager, GradeHorariaManager, OrganizationsManager } from './index'
import AdminLoginSupabase from './AdminLoginSupabase'
import { getRoleFromToken, getUsernameFromToken, ROLES } from '../cms/auth'
import { fetchAdminPreload, fetchLoginLog, deleteLoginLog } from '../cms/api'
import { seedCache, getCachedMessagesSync, getCachedPreEnrollmentsSync, invalidateCache, invalidateAllCache } from '../cms/contentCache'
import ChangePasswordModal from './ChangePasswordModal'

const VIEW_GROUP: Record<string, string> = {
  organizations: 'organizacoes',
  pages: 'conteudo',
  section: 'conteudo',
  images: 'conteudo',
  messages: 'comunicacao',
  pre_enrollments: 'comunicacao',
  historico_alunos: 'cadastros',
  historico_editor: 'cadastros',
  turmas: 'cadastros',
  professores: 'cadastros',
  disciplinas: 'cadastros',
  anos_letivos: 'cadastros',
  matriculas: 'academico',
  notas: 'academico',
  frequencia: 'academico',
  diario_classe: 'academico',
  ocorrencias: 'academico',
  conselho_classe: 'academico',
  grade_horaria: 'academico',
  users: 'sistema',
  supabase_users: 'sistema',
  backups: 'sistema',
  setup: 'sistema',
  login_log: 'sistema',
}

export default function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem('cms_token') || localStorage.getItem('supabase_token'))
  const [role, setRole] = useState(() => getRoleFromToken())
  const [view, setView] = useState('dashboard')
  const [loginView, setLoginView] = useState<'turso' | 'supabase'>('turso')
  const [sectionTitle, setSectionTitle] = useState('')
  const [historicoAlunoId, setHistoricoAlunoId] = useState<string | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadPreEnrollments, setUnreadPreEnrollments] = useState(0)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(() => {
    try { return localStorage.getItem('cms_company_id') } catch { return null }
  })
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === '1' } catch { return false }
  })
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches)

  const hydratePreload = (data: any) => {
    if (data.content) seedCache('global_content', data.content)
    if (data.pages) seedCache('pages', data.pages)
    if (data.blogPosts) seedCache('blog_posts', data.blogPosts)
    if (data.tags) seedCache('blog_tags', data.tags)
    if (data.messages) seedCache('messages', data.messages)
    if (data.preEnrollments) seedCache('pre_enrollments', data.preEnrollments)
    if (data.images) seedCache('images', data.images)
    const unread = (data.messages || []).filter((m: any) => !m.read && !m.archived).length
    setUnreadMessages(unread)
    const preUnread = (data.preEnrollments || []).filter((m: any) => !m.read && !m.archived).length
    setUnreadPreEnrollments(preUnread)
  }

  useEffect(() => {
    if (token) {
      fetchAdminPreload().then(hydratePreload).catch(() => { })
    }
  }, [token, companyId])

  useEffect(() => {
    const g = VIEW_GROUP[view]
    if (g && !openGroups.includes(g)) setOpenGroups((prev) => [...prev, g])
  }, [view, openGroups])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const handleLogin = (newToken: string, needChangePassword?: boolean) => {
    const hasTurso = !!localStorage.getItem('cms_token')
    const hasSupabase = !!localStorage.getItem('supabase_token')
    if (hasSupabase) console.log('[Auth] Login realizado via Supabase')
    if (hasTurso) console.log('[Auth] Login realizado via Turso (custom JWT)')
    if (hasTurso && hasSupabase) console.log('[Auth] Ambos os tokens estao presentes')
    setToken(newToken)
    setRole(getRoleFromToken())
    setMustChangePassword(!!needChangePassword)
    setView('dashboard')
  }

  const handlePasswordChanged = (newToken: string) => {
    localStorage.setItem('cms_token', newToken)
    setToken(newToken)
    setRole(getRoleFromToken())
    setMustChangePassword(false)
    setView('dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('cms_token')
    localStorage.removeItem('supabase_token')
    localStorage.removeItem('cms_company_id')
    invalidateCache('users')
    setToken(null)
    setRole(null)
    setMustChangePassword(false)
    setCompanyId(null)
    setLoginView('turso')
    setView('dashboard')
  }

  const handleEnterCompany = (targetCompanyId: string) => {
    try { localStorage.setItem('cms_company_id', targetCompanyId) } catch { }
    setCompanyId(targetCompanyId)
    invalidateAllCache()
    setView('dashboard')
  }

  const handleLeaveCompany = () => {
    try { localStorage.removeItem('cms_company_id') } catch { }
    setCompanyId(null)
    invalidateAllCache()
    setView('dashboard')
  }

  const handleNavigate = (v: string, section?: string, alunoId?: string) => {
    if (v === 'section' && section) {
      setSectionTitle(section)
      setView('section')
    } else {
      setHistoricoAlunoId(v === 'historico_editor' && alunoId ? alunoId : null)
      setView(v)
    }
  }

  const toggleGroup = (g: string) => {
    setOpenGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  const isSuperAdmin = role === ROLES.SUPER_ADMIN
  const isEditorAdmin = role === ROLES.EDITOR_ADMIN
  const isEditorBlog = role === ROLES.EDITOR_BLOG
  const isGestorAdmin = role === ROLES.GESTOR_ADMIN
  const isCoordenador = role === ROLES.COORDENADOR_PEDAGOGICO
  const isSecretaria = role === ROLES.SECRETARIA_ESCOLAR
  const isFinanceiro = role === ROLES.FINANCEIRO
  const isProfessor = role === ROLES.PROFESSOR
  const canManageUsers = isSuperAdmin || isGestorAdmin
  const commBadge = unreadMessages + unreadPreEnrollments

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem('admin_sidebar_collapsed', next ? '1' : '0') } catch { }
      return next
    })
  }

  const expandGroup = (g: string) => {
    setOpenGroups((prev) => (prev.includes(g) ? prev : [...prev, g]))
    setCollapsed(false)
  }

  const SidebarGroup = ({ title, group, badge, children }: { title: string; group: string; badge?: number; children: React.ReactNode }) => {
    const open = openGroups.includes(group)
    return (
      <div className="sidebar-group">
        <button
          type="button"
          className="sidebar-group-header"
          onClick={() => toggleGroup(group)}
          aria-expanded={open}
        >
          <span>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="sidebar-group-badge-wrap">
              <span className="sidebar-badge">{badge > 99 ? '99+' : badge}</span>
            </span>
          )}
          <span className={`sidebar-chevron${open ? ' open' : ''}`}>▸</span>
        </button>
        {open && <div className="sidebar-group-items">{children}</div>}
      </div>
    )
  }

  // Auto-logout por inatividade (10 min)
  const lastActivityRef = useRef(Date.now())
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000
  const CHECK_INTERVAL = 10 * 1000

  useEffect(() => {
    if (!token) return

    const update = () => { lastActivityRef.current = Date.now() }

    window.addEventListener('mousedown', update)
    window.addEventListener('keydown', update)
    window.addEventListener('click', update)
    window.addEventListener('touchstart', update)
    window.addEventListener('mousemove', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('wheel', update, { passive: true })

    const id = setInterval(() => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) {
        handleLogout()
      }
    }, CHECK_INTERVAL)

    return () => {
      window.removeEventListener('mousedown', update)
      window.removeEventListener('keydown', update)
      window.removeEventListener('click', update)
      window.removeEventListener('touchstart', update)
      window.removeEventListener('mousemove', update)
      window.removeEventListener('scroll', update)
      window.removeEventListener('wheel', update)
      clearInterval(id)
    }
  }, [token])

  if (!token) {
    if (loginView === 'supabase') {
      return (
        <div className="admin-wrapper">
          <AdminLoginSupabase onLogin={handleLogin} onBack={() => setLoginView('turso')} />
        </div>
      )
    }
    return (
      <div className="admin-wrapper">
        <AdminLogin onLogin={handleLogin} />
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={() => setLoginView('supabase')}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '8px 16px',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
            }}
          >
            Login via Server S. (experimental)
          </button>
        </div>
      </div>
    )
  }

  function LoginLog() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      fetchLoginLog().then((data) => { setLogs(data); setLoading(false) }).catch(() => setLoading(false))
    }, [])

    const handleDelete = async (id: number) => {
      if (!confirm('Excluir este registro de log?')) return
      try {
        await deleteLoginLog(id)
        setLogs((prev) => prev.filter((l) => l.id !== id))
      } catch {
        alert('Erro ao excluir log.')
      }
    }

    if (loading) return <div className="admin-messages"><h2>Log de Acesso</h2><p>Carregando...</p></div>

    return (
      <div className="admin-messages">
        <div className="admin-messages-header">
          <h2>Log de Acesso</h2>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Registro de logins — super_admin</p>
        </div>
        {logs.length === 0 ? (
          <p className="admin-empty">Nenhum registro de login encontrado.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Data/Hora</th>
                <th>IP</th>
                <th>Duração</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td>{log.username}</td>
                  <td>{new Date(log.login_time.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</td>
                  <td>{log.ip || '-'}</td>
                  <td>{log.duration || 'Em andamento'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(log.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const dashProps = {
    onNavigate: handleNavigate,
    unreadMessages,
    unreadPreEnrollments,
    role,
    activeCompanyId: companyId,
    onEnterCompany: handleEnterCompany,
    onLeaveCompany: handleLeaveCompany,
  }

  const renderView = () => {
    if ((view === 'users' || view === 'supabase_users') && !canManageUsers) {
      return <AdminDashboard {...dashProps} />
    }
    switch (view) {
      case 'dashboard':
        return <AdminDashboard {...dashProps} />

      case 'organizations':
        return isSuperAdmin
          ? <OrganizationsManager onEnterCompany={handleEnterCompany} />
          : <AdminDashboard {...dashProps} />
      case 'pages':
        return <PageManager />
      case 'section':
        return <SectionEditor sectionTitle={sectionTitle} onBack={() => setView('dashboard')} />
      case 'alunos':
        return <div className="admin-messages"><h2>Alunos</h2></div>
      case 'messages':
        return <MessagesList onUnreadChange={setUnreadMessages} />
      case 'pre_enrollments':
        return <PreEnrollmentsList onUnreadChange={setUnreadPreEnrollments} />
      case 'images':
        return <ImageLibrary />
      case 'users':
        return <UserManager currentUsername={getUsernameFromToken() || ''} />
      case 'supabase_users':
        return <SupabaseUserManager />
      case 'backups':
        return <BackupRestore />
      case 'setup':
        return <SetupForm />
      case 'historico_alunos':
        return <HistoricoAlunos onNavigate={handleNavigate} />
      case 'historico_editor':
        return <HistoricoEditor initialAlunoId={historicoAlunoId} />
      case 'turmas':
        return <TurmasManager />
      case 'professores':
        return <ProfessoresManager />
      case 'disciplinas':
        return <DisciplinasManager />
      case 'matriculas':
        return <MatriculasManager />
      case 'notas':
        return <NotasManager />
      case 'frequencia':
        return <FrequenciaManager />
      case 'diario_classe':
        return <DiarioClasseManager />
      case 'ocorrencias':
        return <OcorrenciasManager />
      case 'conselho_classe':
        return <ConselhoClasseManager />
      case 'anos_letivos':
        return <AnosLetivosManager />
      case 'grade_horaria':
        return <GradeHorariaManager />
      case 'login_log':
        return <LoginLog />
      default:
        return <AdminDashboard {...dashProps} />
    }
  }

  return (
    <div className="admin-wrapper">
      <aside className={`admin-sidebar${collapsed && isDesktop ? ' collapsed' : ''}`}>
        <h2>Olá {getUsernameFromToken() || 'Usuário'}</h2>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={collapsed && isDesktop ? 'Expandir menu' : 'Encolher menu'}
          aria-label={collapsed && isDesktop ? 'Expandir menu' : 'Encolher menu'}
        >
          {collapsed && isDesktop ? '»' : '«'}
        </button>
        {collapsed && isDesktop ? (
          <nav>
            {isSuperAdmin ? (
              <button type="button" className={`sidebar-rail-btn${view === 'organizations' ? ' active' : ''}`} title="Organizações" aria-label="Organizações" onClick={() => setView('organizations')}>🏢</button>
            ) : null}
            {isSuperAdmin || isEditorAdmin || isEditorBlog || isGestorAdmin ? (
              <button type="button" className={`sidebar-rail-btn${VIEW_GROUP[view] === 'conteudo' ? ' active' : ''}`} title="Conteúdo do Site" aria-label="Conteúdo do Site" onClick={() => expandGroup('conteudo')}>📄</button>
            ) : null}
            {isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria ? (
              <button type="button" className={`sidebar-rail-btn${VIEW_GROUP[view] === 'comunicacao' ? ' active' : ''}`} title="Comunicação" aria-label="Comunicação" onClick={() => expandGroup('comunicacao')}>
                <span className="sidebar-btn-icon">
                  ✉️
                  {commBadge > 0 && <span className="sidebar-badge">{commBadge > 99 ? '99+' : commBadge}</span>}
                </span>
              </button>
            ) : null}
            {isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria ? (
              <button type="button" className={`sidebar-rail-btn${VIEW_GROUP[view] === 'cadastros' ? ' active' : ''}`} title="Cadastros" aria-label="Cadastros" onClick={() => expandGroup('cadastros')}>🏫</button>
            ) : null}
            {isSuperAdmin || isGestorAdmin || isCoordenador || isSecretaria || isFinanceiro || isProfessor ? (
              <button type="button" className={`sidebar-rail-btn${VIEW_GROUP[view] === 'academico' ? ' active' : ''}`} title="Acadêmico" aria-label="Acadêmico" onClick={() => expandGroup('academico')}>🎓</button>
            ) : null}
            {canManageUsers ? (
              <button type="button" className={`sidebar-rail-btn${VIEW_GROUP[view] === 'sistema' ? ' active' : ''}`} title="Sistema" aria-label="Sistema" onClick={() => expandGroup('sistema')}>⚙️</button>
            ) : null}
          </nav>
        ) : (
          <nav>
            <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>Dashboard</button>
            {isSuperAdmin ? (
              <button className={view === 'organizations' ? 'active' : ''} onClick={() => setView('organizations')}>Organizações</button>
            ) : null}

          {role === ROLES.SUPER_ADMIN || role === ROLES.EDITOR_ADMIN || role === ROLES.EDITOR_BLOG || role === ROLES.GESTOR_ADMIN ? (
            <SidebarGroup title="Conteúdo do Site" group="conteudo">
              {role === ROLES.SUPER_ADMIN || role === ROLES.EDITOR_ADMIN ? (
                <button className={view === 'pages' ? 'active' : ''} onClick={() => setView('pages')}>Páginas</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.EDITOR_ADMIN || role === ROLES.EDITOR_BLOG || role === ROLES.GESTOR_ADMIN ? (
                <button className={view === 'section' && sectionTitle === 'Blog' ? 'active' : ''} onClick={() => handleNavigate('section', 'Blog')}>Blog</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.EDITOR_ADMIN || role === ROLES.GESTOR_ADMIN ? (
                <button className={view === 'images' ? 'active' : ''} onClick={() => setView('images')}>Imagens</button>
              ) : null}
            </SidebarGroup>
          ) : null}

          {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.SECRETARIA_ESCOLAR ? (
            <SidebarGroup title="Comunicação" group="comunicacao" badge={unreadMessages + unreadPreEnrollments}>
              <button className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')}>
                <span className="sidebar-btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadMessages > 0 && <span className="sidebar-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
                </span>
                Mensagens
              </button>
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.SECRETARIA_ESCOLAR ? (
                <button className={view === 'pre_enrollments' ? 'active' : ''} onClick={() => setView('pre_enrollments')}>
                  <span className="sidebar-btn-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadPreEnrollments > 0 && <span className="sidebar-badge">{unreadPreEnrollments > 99 ? '99+' : unreadPreEnrollments}</span>}
                  </span>
                  Pré-Matrícula
                </button>
              ) : null}
            </SidebarGroup>
          ) : null}

          {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.SECRETARIA_ESCOLAR ? (
            <SidebarGroup title="Cadastros" group="cadastros">
              <button className={view === 'historico_alunos' ? 'active' : ''} onClick={() => setView('historico_alunos')}>Cadastro de Alunos</button>
              <button className={view === 'historico_editor' ? 'active' : ''} onClick={() => setView('historico_editor')}>Histórico Escolar</button>
              <button className={view === 'turmas' ? 'active' : ''} onClick={() => setView('turmas')}>Turmas</button>
              <button className={view === 'professores' ? 'active' : ''} onClick={() => setView('professores')}>Professores</button>
              <button className={view === 'disciplinas' ? 'active' : ''} onClick={() => setView('disciplinas')}>Disciplinas</button>
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO ? (
                <button className={view === 'anos_letivos' ? 'active' : ''} onClick={() => setView('anos_letivos')}>Anos Letivos</button>
              ) : null}
            </SidebarGroup>
          ) : null}

          {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.SECRETARIA_ESCOLAR || role === ROLES.FINANCEIRO || role === ROLES.PROFESSOR ? (
            <SidebarGroup title="Acadêmico" group="academico">
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.SECRETARIA_ESCOLAR || role === ROLES.FINANCEIRO ? (
                <button className={view === 'matriculas' ? 'active' : ''} onClick={() => setView('matriculas')}>Matrículas</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.PROFESSOR ? (
                <button className={view === 'notas' ? 'active' : ''} onClick={() => setView('notas')}>Notas e Boletim</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.PROFESSOR ? (
                <button className={view === 'frequencia' ? 'active' : ''} onClick={() => setView('frequencia')}>Frequência</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.PROFESSOR ? (
                <button className={view === 'diario_classe' ? 'active' : ''} onClick={() => setView('diario_classe')}>Diário de Classe</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.PROFESSOR ? (
                <button className={view === 'ocorrencias' ? 'active' : ''} onClick={() => setView('ocorrencias')}>Ocorrências</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO ? (
                <button className={view === 'conselho_classe' ? 'active' : ''} onClick={() => setView('conselho_classe')}>Conselho de Classe</button>
              ) : null}
              {role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN || role === ROLES.COORDENADOR_PEDAGOGICO || role === ROLES.SECRETARIA_ESCOLAR || role === ROLES.PROFESSOR ? (
                <button className={view === 'grade_horaria' ? 'active' : ''} onClick={() => setView('grade_horaria')}>Grade Horária</button>
              ) : null}
            </SidebarGroup>
          ) : null}

          {canManageUsers ? (
            <SidebarGroup title="Sistema" group="sistema">
              <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>Usuários (T.)</button>
              <button className={view === 'supabase_users' ? 'active' : ''} onClick={() => setView('supabase_users')}>Usuários (Server S.)</button>
              {isSuperAdmin ? (
                <>
                  <button className={view === 'backups' ? 'active' : ''} onClick={() => setView('backups')}>Backups</button>
                  <button className={view === 'setup' ? 'active' : ''} onClick={() => setView('setup')}>Setup</button>
                  <button className={view === 'login_log' ? 'active' : ''} onClick={() => setView('login_log')}>Log de Acesso</button>
                </>
              ) : null}
            </SidebarGroup>
          ) : null}
          </nav>
        )}
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noopener noreferrer">Ver Site</a>
          <button onClick={handleLogout}>Sair</button>
        </div>
      </aside>
      <main className="admin-main">
        {renderView()}
      </main>

      {mustChangePassword && (
        <ChangePasswordModal
          onSuccess={handlePasswordChanged}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}

function MessagesList({ onUnreadChange }: { onUnreadChange?: (n: number) => void }) {
  const canDeleteMessages = getRoleFromToken() === ROLES.SUPER_ADMIN || getRoleFromToken() === ROLES.GESTOR_ADMIN
  const [messages, setMessages] = useState<any[]>(() => {
    const cached = getCachedMessagesSync()
    return cached || []
  })
  const [tab, setTab] = useState<'inbox' | 'archived'>('inbox')
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
  const [msgPage, setMsgPage] = useState(1)
  const MSG_PAGE_SIZE = 15

  useEffect(() => {
    api.get('/messages').then(({ data }) => {
      setMessages(data)
      const unread = data.filter((m: any) => !m.read && !m.archived).length
      onUnreadChange?.(unread)
    }).catch(() => { })
  }, [])

  const updateUnread = (msgs: any[]) => {
    const unread = msgs.filter((m) => !m.read && !m.archived).length
    onUnreadChange?.(unread)
  }

  const markRead = async (id: number) => {
    await api.put(`/messages/${id}/read`)
    setMessages((prev) => {
      const next = prev.map((m) => m.id === id ? { ...m, read: 1 } : m)
      updateUnread(next)
      return next
    })
    if (selectedMessage?.id === id) setSelectedMessage((prev: any) => prev ? { ...prev, read: 1 } : null)
  }

  const archiveMessage = async (id: number) => {
    await api.put(`/messages/${id}/archive`)
    setMessages((prev) => {
      const next = prev.map((m) => m.id === id ? { ...m, archived: 1 } : m)
      updateUnread(next)
      return next
    })
    setSelectedMessage(null)
  }

  const deleteMessage = async (id: number) => {
    if (!confirm('Excluir mensagem?')) return
    await api.delete(`/messages/${id}`)
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== id)
      updateUnread(next)
      return next
    })
    setSelectedMessage(null)
  }

  const openMessage = (m: any) => {
    if (!m.read && !m.archived) {
      setSelectedMessage({ ...m, read: 1 })
      setMessages((prev) => {
        const next = prev.map((msg) => msg.id === m.id ? { ...msg, read: 1 } : msg)
        updateUnread(next)
        return next
      })
      api.put(`/messages/${m.id}/read`).catch(() => { })
    } else {
      setSelectedMessage(m)
    }
  }

  const filtered = messages.filter((m) => tab === 'inbox' ? !m.archived : m.archived)
  const msgTotalPages = Math.ceil(filtered.length / MSG_PAGE_SIZE) || 1
  const msgSafePage = Math.min(msgPage, msgTotalPages)
  const pagedMessages = filtered.slice((msgSafePage - 1) * MSG_PAGE_SIZE, msgSafePage * MSG_PAGE_SIZE)

  return (
    <div className="admin-messages">
      <div className="admin-messages-header">
        <h2>Mensagens</h2>
        <div className="admin-messages-tabs">
          <button className={tab === 'inbox' ? 'active' : ''} onClick={() => { setTab('inbox'); setMsgPage(1) }}>Caixa de Entrada</button>
          <button className={tab === 'archived' ? 'active' : ''} onClick={() => { setTab('archived'); setMsgPage(1) }}>Arquivadas</button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="admin-empty">{tab === 'inbox' ? 'Nenhuma mensagem na caixa de entrada.' : 'Nenhuma mensagem arquivada.'}</p>
      ) : (<>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Mensagem</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagedMessages.map((m) => (
              <tr key={m.id} className={`${!m.read && !m.archived ? 'unread' : ''} msg-row`} onClick={() => openMessage(m)}>
                <td>{new Date(m.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</td>
                <td>
                  {!m.read && !m.archived && <span className="unread-dot" title="Não lida" />}
                  {m.name}
                </td>
                <td>{m.email}</td>
                <td>{m.phone || '-'}</td>
                <td>{m.message}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {tab === 'inbox' && <button className="btn btn-sm" onClick={() => archiveMessage(m.id)}>Arquivar</button>}
                  {canDeleteMessages && <button className="btn btn-sm btn-danger" onClick={() => deleteMessage(m.id)}>Excluir</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {msgTotalPages > 1 && (
          <div className="admin-pagination">
            <button disabled={msgSafePage <= 1} onClick={() => setMsgPage(msgSafePage - 1)}>Anterior</button>
            <span>Página {msgSafePage} de {msgTotalPages}</span>
            <button disabled={msgSafePage >= msgTotalPages} onClick={() => setMsgPage(msgSafePage + 1)}>Próximo</button>
          </div>
        )}
      </>)}

      {selectedMessage && (
        <div className="admin-modal-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setSelectedMessage(null)}>&times;</button>
            <h3>{selectedMessage.name}</h3>
            <div className="msg-modal-details">
              <div className="msg-modal-row">
                <span className="msg-modal-label">Email</span>
                <span>{selectedMessage.email}</span>
              </div>
              {selectedMessage.phone && (
                <div className="msg-modal-row">
                  <span className="msg-modal-label">Telefone</span>
                  <span>{selectedMessage.phone}</span>
                </div>
              )}
              <div className="msg-modal-row">
                <span className="msg-modal-label">Data</span>
                <span>{new Date(selectedMessage.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</span>
              </div>
              <div className="msg-modal-row">
                <span className="msg-modal-label">Status</span>
                <span>{selectedMessage.archived ? 'Arquivada' : selectedMessage.read ? 'Lida' : 'Não lida'}</span>
              </div>
            </div>
            <div className="msg-modal-message">
              <span className="msg-modal-label">Mensagem</span>
              <p>{selectedMessage.message}</p>
            </div>
            <div className="msg-modal-actions">
              {!selectedMessage.read && !selectedMessage.archived && (
                <button className="btn btn-sm" onClick={() => markRead(selectedMessage.id)}>Marcar como lida</button>
              )}
              {!selectedMessage.archived && (
                <button className="btn btn-sm" onClick={() => archiveMessage(selectedMessage.id)}>Arquivar</button>
              )}
              {canDeleteMessages && (
                <button className="btn btn-sm btn-danger" onClick={() => deleteMessage(selectedMessage.id)}>Excluir</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreEnrollmentsList({ onUnreadChange }: { onUnreadChange?: (n: number) => void }) {
  const canDeletePreEnrollments = getRoleFromToken() === ROLES.SUPER_ADMIN || getRoleFromToken() === ROLES.GESTOR_ADMIN
  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0, 2)})${digits.slice(2)}`
    return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  const [items, setItems] = useState<any[]>(() => {
    const cached = getCachedPreEnrollmentsSync()
    return cached || []
  })
  const [tab, setTab] = useState<'inbox' | 'archived'>('inbox')
  const [selected, setSelected] = useState<any | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [prePage, setPrePage] = useState(1)
  const [serieFilter, setSerieFilter] = useState('')
  const PRE_PAGE_SIZE = 15
  const [createForm, setCreateForm] = useState({
    responsavel: '', nome_aluno: '', idade: '', ano_letivo_atual: '',
    serie_desejada: '', telefone: '', whatsapp: '', email: '', mensagem: '',
  })

  useEffect(() => {
    api.get('/pre-enrollments').then(({ data }) => {
      setItems(data)
      const unread = data.filter((m: any) => !m.read && !m.archived).length
      onUnreadChange?.(unread)
    }).catch(() => { })
  }, [])

  const updateUnread = (items: any[]) => {
    const unread = items.filter((m) => !m.read && !m.archived).length
    onUnreadChange?.(unread)
  }

  const markRead = async (id: number) => {
    await api.put(`/pre-enrollments/${id}/read`)
    setItems((prev) => {
      const next = prev.map((m) => m.id === id ? { ...m, read: 1 } : m)
      updateUnread(next)
      return next
    })
    if (selected?.id === id) setSelected((prev: any) => prev ? { ...prev, read: 1 } : null)
  }

  const archiveItem = async (id: number) => {
    await api.put(`/pre-enrollments/${id}/archive`)
    setItems((prev) => {
      const next = prev.map((m) => m.id === id ? { ...m, archived: 1 } : m)
      updateUnread(next)
      return next
    })
    setSelected(null)
  }

  const deleteItem = async (id: number) => {
    if (!confirm('Excluir pré-matrícula?')) return
    await api.delete(`/pre-enrollments/${id}`)
    setItems((prev) => {
      const next = prev.filter((m) => m.id !== id)
      updateUnread(next)
      return next
    })
    setSelected(null)
  }

  const openItem = (m: any) => {
    if (!m.read && !m.archived) {
      setSelected({ ...m, read: 1 })
      setItems((prev) => {
        const next = prev.map((msg) => msg.id === m.id ? { ...msg, read: 1 } : msg)
        updateUnread(next)
        return next
      })
      api.put(`/pre-enrollments/${m.id}/read`).catch(() => { })
    } else {
      setSelected(m)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/pre-enrollments', { ...createForm, source: 'admin' })
      setShowCreateForm(false)
      setCreateForm({ responsavel: '', nome_aluno: '', idade: '', ano_letivo_atual: '', serie_desejada: '', telefone: '', whatsapp: '', email: '', mensagem: '' })
      const { data } = await api.get('/pre-enrollments')
      setItems(data)
      const unread = data.filter((m: any) => !m.read && !m.archived).length
      onUnreadChange?.(unread)
    } catch {
      alert('Erro ao criar pré-matrícula.')
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      const { data } = await api.get('/pre-enrollments')
      setItems(data)
      const unread = data.filter((m: any) => !m.read && !m.archived).length
      onUnreadChange?.(unread)
    } catch {
      alert('Erro ao atualizar dados.')
    } finally {
      setRefreshing(false)
    }
  }

  const handlePrint = () => {
    const rows = pagedPreEnrollments.map((m) => `
      <tr>
        <td>${new Date(m.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</td>
        <td>${m.responsavel || ''}</td>
        <td>${m.nome_aluno || ''}</td>
        <td>${m.serie_desejada || ''}</td>
        <td>${m.email || ''}</td>
        <td>${m.whatsapp || '-'}</td>
        <td>${m.source === 'admin' ? 'Admin' : 'Cliente'}</td>
      </tr>
    `).join('')
    const win = window.open('', '', 'width=900,height=600')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pré-Matrículas</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
  h2 { margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
  th { background: #eee; }
  .footer { margin-top: 12px; font-size: 11px; color: #666; }
</style></head>
<body>
  <h2>Pré-Matrículas</h2>
  <table>
    <thead><tr>
      <th>Data</th><th>Responsável</th><th>Aluno</th><th>Série Desejada</th><th>Email</th><th>WhatsApp</th><th>Origem</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Página ${preSafePage} de ${preTotalPages} — ${new Date().toLocaleString('pt-BR')}</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const sourceLabel = (s: string) => {
    if (s === 'admin') return { text: 'Admin', cls: 'source-admin' }
    return { text: 'Cliente', cls: 'source-cliente' }
  }

  const filtered = items.filter((m) => tab === 'inbox' ? !m.archived : m.archived)
  const filteredBySerie = serieFilter ? filtered.filter((m) => m.serie_desejada === serieFilter) : filtered
  const preTotalPages = Math.ceil(filteredBySerie.length / PRE_PAGE_SIZE) || 1
  const preSafePage = Math.min(prePage, preTotalPages)
  const pagedPreEnrollments = filteredBySerie.slice((preSafePage - 1) * PRE_PAGE_SIZE, preSafePage * PRE_PAGE_SIZE)

  return (
    <div className="admin-messages">
      <div className="admin-messages-header">
        <h2>Pré-Matrícula</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="admin-messages-tabs">
            <button className={tab === 'inbox' ? 'active' : ''} onClick={() => { setTab('inbox'); setPrePage(1) }}>Caixa de Entrada</button>
            <button className={tab === 'archived' ? 'active' : ''} onClick={() => { setTab('archived'); setPrePage(1) }}>Arquivadas</button>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setShowCreateForm(true)}>+ Nova</button>
          <button className="btn btn-sm btn-outline" onClick={refreshData} disabled={refreshing}>{refreshing ? 'Atualizando...' : 'Atualizar'}</button>
          <button className="btn btn-sm btn-outline" onClick={handlePrint}>Imprimir</button>
        </div>
      </div>

      {showCreateForm && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <button className="admin-modal-close" onClick={() => setShowCreateForm(false)}>&times;</button>
            <h3>Nova Pré-Matrícula (Admin)</h3>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Responsável *</label>
                  <input value={createForm.responsavel} onChange={(e) => setCreateForm({ ...createForm, responsavel: e.target.value })} required />
                </div>
                <div className="admin-field">
                  <label>Nome do Aluno *</label>
                  <input value={createForm.nome_aluno} onChange={(e) => setCreateForm({ ...createForm, nome_aluno: e.target.value })} required />
                </div>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Idade</label>
                  <input value={createForm.idade} onChange={(e) => setCreateForm({ ...createForm, idade: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Ano Letivo Atual</label>
                  <input value={createForm.ano_letivo_atual} onChange={(e) => setCreateForm({ ...createForm, ano_letivo_atual: e.target.value })} />
                </div>
              </div>
              <div className="admin-field">
                <label>Série Desejada (Ano Letivo Seguinte) *</label>
                <select value={createForm.serie_desejada} onChange={(e) => setCreateForm({ ...createForm, serie_desejada: e.target.value })} required>
                  <option value="">Selecione a série</option>
                  <optgroup label="Ensino Fundamental 1">
                    <option value="1º ano">1º ano</option>
                    <option value="2º ano">2º ano</option>
                    <option value="3º ano">3º ano</option>
                    <option value="4º ano">4º ano</option>
                    <option value="5º ano">5º ano</option>
                  </optgroup>
                  <optgroup label="Ensino Fundamental 2">
                    <option value="6º ano">6º ano</option>
                    <option value="7º ano">7º ano</option>
                    <option value="8º ano">8º ano</option>
                    <option value="9º ano">9º ano</option>
                  </optgroup>
                  <optgroup label="Ensino Médio">
                    <option value="1ª série">1ª série</option>
                    <option value="2ª série">2ª série</option>
                    <option value="3ª série">3ª série</option>
                  </optgroup>
                </select>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Telefone</label>
                  <input type="tel" value={createForm.telefone} onChange={(e) => setCreateForm({ ...createForm, telefone: formatPhone(e.target.value) })} maxLength={14} />
                </div>
                <div className="admin-field">
                  <label>WhatsApp</label>
                  <input type="tel" value={createForm.whatsapp} onChange={(e) => setCreateForm({ ...createForm, whatsapp: formatPhone(e.target.value) })} maxLength={14} />
                </div>
              </div>
              <div className="admin-field">
                <label>Email *</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
              </div>
              <div className="admin-field">
                <label>Mensagem</label>
                <textarea rows={3} value={createForm.mensagem} onChange={(e) => setCreateForm({ ...createForm, mensagem: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-sm btn-primary">Salvar</button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowCreateForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-filter-bar">
        <label>Filtrar por Série:</label>
        <select value={serieFilter} onChange={(e) => { setSerieFilter(e.target.value); setPrePage(1) }}>
          <option value="">Todas</option>
          <optgroup label="Ensino Fundamental 1">
            <option value="1º ano">1º ano</option>
            <option value="2º ano">2º ano</option>
            <option value="3º ano">3º ano</option>
            <option value="4º ano">4º ano</option>
            <option value="5º ano">5º ano</option>
          </optgroup>
          <optgroup label="Ensino Fundamental 2">
            <option value="6º ano">6º ano</option>
            <option value="7º ano">7º ano</option>
            <option value="8º ano">8º ano</option>
            <option value="9º ano">9º ano</option>
          </optgroup>
          <optgroup label="Ensino Médio">
            <option value="1ª série">1ª série</option>
            <option value="2ª série">2ª série</option>
            <option value="3ª série">3ª série</option>
          </optgroup>
        </select>
      </div>

      {filteredBySerie.length === 0 ? (
        <p className="admin-empty">{serieFilter && filtered.length > 0 ? `Nenhuma pré-matrícula para "${serieFilter}".` : (tab === 'inbox' ? 'Nenhuma pré-matrícula recebida.' : 'Nenhuma pré-matrícula arquivada.')}</p>
      ) : (<>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Responsável</th>
              <th>Aluno</th>
              <th>Série Desejada</th>
              <th>Email</th>
              <th>WhatsApp</th>
              <th>Origem</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagedPreEnrollments.map((m) => {
              const src = sourceLabel(m.source)
              return (
                <tr key={m.id} className={`${!m.read && !m.archived ? 'unread' : ''} msg-row`} onClick={() => openItem(m)}>
                  <td>{new Date(m.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</td>
                  <td>
                    {!m.read && !m.archived && <span className="unread-dot" title="Não lida" />}
                    {m.responsavel}
                  </td>
                  <td>{m.nome_aluno}</td>
                  <td>{m.serie_desejada || '-'}</td>
                  <td>{m.email}</td>
                  <td>{m.whatsapp || '-'}</td>
                  <td><span className={`source-badge ${src.cls}`}>{src.text}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {tab === 'inbox' && <button className="btn btn-sm" onClick={() => archiveItem(m.id)}>Arquivar</button>}
                    {canDeletePreEnrollments && <button className="btn btn-sm btn-danger" onClick={() => deleteItem(m.id)}>Excluir</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {preTotalPages > 1 && (
          <div className="admin-pagination">
            <button disabled={preSafePage <= 1} onClick={() => setPrePage(preSafePage - 1)}>Anterior</button>
            <span>Página {preSafePage} de {preTotalPages}</span>
            <button disabled={preSafePage >= preTotalPages} onClick={() => setPrePage(preSafePage + 1)}>Próximo</button>
          </div>
        )}
      </>)}

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setSelected(null)}>&times;</button>
            <h3>{selected.responsavel}</h3>
            <div className="msg-modal-details">
              <div className="msg-modal-row">
                <span className="msg-modal-label">Aluno</span>
                <span>{selected.nome_aluno}</span>
              </div>
              {selected.idade && (
                <div className="msg-modal-row">
                  <span className="msg-modal-label">Idade</span>
                  <span>{selected.idade}</span>
                </div>
              )}
              {selected.ano_letivo_atual && (
                <div className="msg-modal-row">
                  <span className="msg-modal-label">Ano Letivo</span>
                  <span>{selected.ano_letivo_atual}</span>
                </div>
              )}
              {selected.serie_desejada && (
                <div className="msg-modal-row">
                  <span className="msg-modal-label">Série Desejada</span>
                  <span>{selected.serie_desejada}</span>
                </div>
              )}
              <div className="msg-modal-row">
                <span className="msg-modal-label">Email</span>
                <span>{selected.email}</span>
              </div>
              {selected.telefone && (
                <div className="msg-modal-row">
                  <span className="msg-modal-label">Telefone</span>
                  <span>{selected.telefone}</span>
                </div>
              )}
              {selected.whatsapp && (
                <div className="msg-modal-row">
                  <span className="msg-modal-label">WhatsApp</span>
                  <span>{selected.whatsapp}</span>
                </div>
              )}
              <div className="msg-modal-row">
                <span className="msg-modal-label">Origem</span>
                <span><span className={`source-badge ${sourceLabel(selected.source).cls}`}>{sourceLabel(selected.source).text}</span></span>
              </div>
              <div className="msg-modal-row">
                <span className="msg-modal-label">Data</span>
                <span>{new Date(selected.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</span>
              </div>
              <div className="msg-modal-row">
                <span className="msg-modal-label">Status</span>
                <span>{selected.archived ? 'Arquivada' : selected.read ? 'Lida' : 'Não lida'}</span>
              </div>
            </div>
            {selected.mensagem && (
              <div className="msg-modal-message">
                <span className="msg-modal-label">Mensagem</span>
                <p>{selected.mensagem}</p>
              </div>
            )}
            <div className="msg-modal-actions">
              {!selected.read && !selected.archived && (
                <button className="btn btn-sm" onClick={() => markRead(selected.id)}>Marcar como lida</button>
              )}
              {!selected.archived && (
                <button className="btn btn-sm" onClick={() => archiveItem(selected.id)}>Arquivar</button>
              )}
              {canDeletePreEnrollments && (
                <button className="btn btn-sm btn-danger" onClick={() => deleteItem(selected.id)}>Excluir</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SetupForm() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')

  const handleSetup = async () => {
    if (!password) return
    setStatus('Criando...')
    try {
      await api.post('/auth/setup', { username, password })
      setStatus('Usuário criado com sucesso!')
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Erro ao criar usuário')
    }
  }

  return (
    <div className="admin-setup">
      <h2>Configuração Inicial</h2>
      <p>Crie o usuário administrador (apenas no primeiro acesso).</p>
      <div className="admin-field">
        <label>Usuário</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn btn-primary" onClick={handleSetup}>Criar Usuário</button>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  )
}
