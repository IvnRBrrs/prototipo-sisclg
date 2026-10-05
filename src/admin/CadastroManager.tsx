import { useState, useEffect } from 'react'
import api, { fetchCadastro, updateCadastro, type OrgCadastro } from '../cms/api'

const REGIMES = ['', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Outro']

const EMPTY: OrgCadastro = {
  company_id: '',
  razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '', inscricao_municipal: '',
  regime_tributario: '', endereco_logradouro: '', endereco_numero: '', endereco_complemento: '',
  endereco_bairro: '', endereco_cidade: '', endereco_estado: '', endereco_cep: '',
  telefone_corporativo: '', email_institucional: '', website: '',
  responsavel_nome: '', responsavel_cpf: '', responsavel_cargo: '', responsavel_email: '',
  responsavel_telefone: '',
}

const fmt = (v: string) => {
  const t = String(v || '').trim()
  return t === '' ? '—' : t
}

export default function CadastroManager() {
  const [form, setForm] = useState<OrgCadastro>(EMPTY)
  const [view, setView] = useState<'form' | 'doc'>('form')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [orgName, setOrgName] = useState('')

  const load = async () => {
    setError('')
    try {
      const data = await fetchCadastro()
      setForm({ ...EMPTY, ...data })
      try {
        const { data: theme } = await api.get('/public/theme')
        setOrgName(theme?.nome || data.company_id || '')
      } catch { setOrgName(data.company_id || '') }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar cadastro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const set = (key: keyof OrgCadastro, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setStatus('')
    setError('')
    try {
      await updateCadastro(form)
      setStatus('Cadastro salvo com sucesso.')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar cadastro')
    } finally {
      setSaving(false)
    }
  }

  const temDados = Object.entries(form).some(([k, v]) => k !== 'company_id' && k !== 'updated_at' && String(v || '').trim() !== '')

  const field = (key: keyof OrgCadastro, label: string, opts: { type?: string; placeholder?: string; flex?: number } = {}) => (
    <div className="admin-field" style={opts.flex ? { flex: opts.flex, minWidth: 160 } : undefined}>
      <label>{label}</label>
      <input
        type={opts.type || 'text'}
        value={String(form[key] || '')}
        onChange={(e) => set(key, e.target.value)}
        placeholder={opts.placeholder || ''}
      />
    </div>
  )

  if (loading) return <div className="admin-users"><p>Carregando cadastro…</p></div>

  if (view === 'doc') {
    return (
      <div className="admin-users cadastro-manager">
        <div className="admin-row" style={{ alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Cadastro da Organização</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => setView('form')}>← Editar Dados</button>
            <button className="btn btn-primary" onClick={() => window.print()} disabled={!temDados}>🖨️ Imprimir (A4)</button>
          </div>
        </div>
        {!temDados && <p className="admin-hint">Nenhum dado cadastrado ainda — preencha o formulário para gerar a ficha.</p>}

        {/* Ficha A4 — única área visível na impressão (ver @media print no admin.css) */}
        <div className="cadastro-print-doc">
          <header className="cad-doc-header">
            <h1>Ficha Cadastral da Organização</h1>
            <p className="cad-doc-org">{orgName || form.company_id}</p>
            <p className="cad-doc-meta">
              company_id: <strong>{form.company_id}</strong>
              {form.updated_at ? ` · Atualizado em ${new Date(String(form.updated_at).replace(' ', 'T') + (String(form.updated_at).includes('Z') ? '' : 'Z')).toLocaleDateString('pt-BR')}` : ''}
            </p>
          </header>

          <section className="cad-doc-section">
            <h2>Dados Jurídicos e Fiscais (Faturamento)</h2>
            <div className="cad-doc-grid">
              <div><span>Razão Social</span><strong>{fmt(form.razao_social)}</strong></div>
              <div><span>Nome Fantasia</span><strong>{fmt(form.nome_fantasia)}</strong></div>
              <div><span>CNPJ / Tax ID</span><strong>{fmt(form.cnpj)}</strong></div>
              <div><span>Inscrição Estadual (IE)</span><strong>{fmt(form.inscricao_estadual)}</strong></div>
              <div><span>Inscrição Municipal (IM)</span><strong>{fmt(form.inscricao_municipal)}</strong></div>
              <div><span>Regime Tributário</span><strong>{fmt(form.regime_tributario)}</strong></div>
              <div className="cad-doc-full"><span>Endereço Comercial</span><strong>
                {(() => {
                  const partes = [
                    [form.endereco_logradouro, form.endereco_numero].filter(Boolean).join(', '),
                    form.endereco_complemento,
                    form.endereco_bairro,
                    [form.endereco_cidade, form.endereco_estado].filter(Boolean).join(' — '),
                    form.endereco_cep,
                  ].filter(Boolean).join(' · ')
                  return partes === '' ? '—' : partes
                })()}
              </strong></div>
              <div><span>Telefone Corporativo</span><strong>{fmt(form.telefone_corporativo)}</strong></div>
              <div><span>E-mail Institucional</span><strong>{fmt(form.email_institucional)}</strong></div>
              <div className="cad-doc-full"><span>Website</span><strong>{fmt(form.website)}</strong></div>
            </div>
          </section>

          <section className="cad-doc-section">
            <h2>Responsável Legal / Administrador da Conta</h2>
            <div className="cad-doc-grid">
              <div><span>Nome Completo</span><strong>{fmt(form.responsavel_nome)}</strong></div>
              <div><span>CPF</span><strong>{fmt(form.responsavel_cpf)}</strong></div>
              <div><span>Cargo / Função</span><strong>{fmt(form.responsavel_cargo)}</strong></div>
              <div><span>E-mail Direto</span><strong>{fmt(form.responsavel_email)}</strong></div>
              <div><span>Telefone Direto</span><strong>{fmt(form.responsavel_telefone)}</strong></div>
            </div>
          </section>

          <footer className="cad-doc-footer">
            <div className="cad-doc-sign"><span>_________________________________</span><span>Responsável Legal</span></div>
            <p>Documento gerado pelo painel administrativo — uso interno.</p>
          </footer>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-users cadastro-manager">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Cadastro da Organização</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            🏢 {orgName || form.company_id} — dados jurídicos, fiscais e do responsável legal (vinculados a esta organização).
          </p>
        </div>
        <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={() => setView('doc')}>👁️ Ficha A4</button>
      </div>

      {status && <p style={{ marginBottom: 12, fontSize: '0.85rem', color: '#16a34a' }}>{status}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="cadastro-form">
        <fieldset className="cadastro-fieldset">
          <legend>Dados Jurídicos e Fiscais (Faturamento)</legend>
          <div className="admin-row">
            {field('razao_social', 'Razão Social *', { flex: 2, placeholder: 'O nome jurídico oficial da empresa' })}
            {field('nome_fantasia', 'Nome Fantasia', { flex: 1, placeholder: 'Nome comercial' })}
          </div>
          <div className="admin-row">
            {field('cnpj', 'CNPJ / Tax ID / EIN', { placeholder: '00.000.000/0000-00' })}
            {field('inscricao_estadual', 'Inscrição Estadual (IE)', { placeholder: 'Opcional' })}
            {field('inscricao_municipal', 'Inscrição Municipal (IM)', { placeholder: 'Opcional' })}
          </div>
          <div className="admin-row">
            <div className="admin-field">
              <label>Regime Tributário</label>
              <select value={form.regime_tributario || ''} onChange={(e) => set('regime_tributario', e.target.value)}>
                {REGIMES.map((r) => <option key={r} value={r}>{r === '' ? 'Selecione' : r}</option>)}
              </select>
            </div>
            {field('telefone_corporativo', 'Telefone Corporativo', { placeholder: '(00) 0000-0000' })}
            {field('email_institucional', 'E-mail Institucional', { type: 'email', placeholder: 'contato@empresa.com' })}
          </div>
          <div className="admin-row">
            {field('endereco_logradouro', 'Logradouro', { flex: 2, placeholder: 'Rua / Avenida' })}
            {field('endereco_numero', 'Número')}
            {field('endereco_complemento', 'Complemento')}
          </div>
          <div className="admin-row">
            {field('endereco_bairro', 'Bairro')}
            {field('endereco_cidade', 'Cidade')}
            {field('endereco_estado', 'Estado / UF')}
            {field('endereco_cep', 'CEP', { placeholder: '00000-000' })}
          </div>
          <div className="admin-row">
            {field('website', 'Website', { flex: 2, placeholder: 'https://…' })}
          </div>
        </fieldset>

        <fieldset className="cadastro-fieldset">
          <legend>Responsável Legal / Administrador da Conta</legend>
          <div className="admin-row">
            {field('responsavel_nome', 'Nome Completo', { flex: 2, placeholder: 'Quem responde legalmente pelo contrato/sistema' })}
            {field('responsavel_cpf', 'CPF', { placeholder: '000.000.000-00' })}
          </div>
          <div className="admin-row">
            {field('responsavel_cargo', 'Cargo / Função', { placeholder: 'Ex.: Diretor, CEO, Gerente de TI' })}
            {field('responsavel_email', 'E-mail Direto', { type: 'email' })}
            {field('responsavel_telefone', 'Telefone Direto')}
          </div>
        </fieldset>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving || !String(form.razao_social || '').trim()}>
            {saving ? 'Salvando…' : 'Salvar Cadastro'}
          </button>
          <button className="btn btn-outline" onClick={() => setView('doc')}>Ver Ficha A4</button>
        </div>
        <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-light)' }}>
          Os dados ficam vinculados ao company_id da organização ativa e alimentam faturamento/contratos no futuro.
        </p>
      </div>
    </div>
  )
}
