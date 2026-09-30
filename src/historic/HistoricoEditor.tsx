import { useState, useRef, useEffect } from 'react'
import { PDFPreview, HistoricoData } from './PDFPreview'
import api from '../cms/api'

const disciplinaFields: { key: string; label: string }[] = [
  { key: 'nome', label: 'Disciplina' },
  { key: 'n1', label: 'N1' }, { key: 'n2', label: 'N2' }, { key: 'n3', label: 'N3' },
  { key: 'n4', label: 'N4' }, { key: 'n5', label: 'N5' }, { key: 'n6', label: 'N6' },
  { key: 'n7', label: 'N7' }, { key: 'n8', label: 'N8' }, { key: 'n9', label: 'N9' },
  { key: 'm1', label: 'M1' }, { key: 'm2', label: 'M2' }, { key: 'm3', label: 'M3' },
  { key: 'ano', label: 'Ano' }, { key: 'serie', label: 'Série' }, { key: 'escola', label: 'Escola' },
  { key: 'cidade', label: 'Cidade' }, { key: 'sit', label: 'Sit.' },
]

const cargaHorariaFields: { key: string; label: string }[] = [
  { key: 'nome', label: 'Descrição' },
  { key: 'n1', label: 'N1' }, { key: 'n2', label: 'N2' }, { key: 'n3', label: 'N3' },
  { key: 'n4', label: 'N4' }, { key: 'n5', label: 'N5' }, { key: 'n6', label: 'N6' },
  { key: 'n7', label: 'N7' }, { key: 'n8', label: 'N8' }, { key: 'n9', label: 'N9' },
  { key: 'm1', label: 'M1' }, { key: 'm2', label: 'M2' }, { key: 'm3', label: 'M3' },
]

function emptyCarga() {
  return {
    nome: '', n1: '', n2: '', n3: '', n4: '', n5: '', n6: '', n7: '', n8: '', n9: '',
    m1: '', m2: '', m3: '', ano: '', serie: '', escola: '', cidade: '', sit: '',
  }
}

function emptyDisciplina() {
  return {
    nome: '', n1: '', n2: '', n3: '', n4: '', n5: '', n6: '', n7: '', n8: '', n9: '',
    m1: '', m2: '', m3: '', ano: '', serie: '', escola: '', cidade: '', sit: '',
  }
}

const defaultDisciplinas = [
  { nome: 'LÍNGUA PORTUGUESA', n1: '-', n2: 'A', n3: '9,5', n4: '-', n5: '9,0', n6: '10,0/200', n7: '9,0/200', n8: '7,5/200', n9: '7,5/200', m1: '9,3/100', m2: '', m3: '', ano: '2015', serie: '1º/2º', escola: 'ESCOLA DE ENS. FUND.\nNIKOLAS PANOS', cidade: 'MACEIÓ/AL', sit: 'APC' },
  { nome: 'MATEMÁTICA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'HISTÓRIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'GEOGRAFIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'CIÊNCIAS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'ARTES', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'L.E.M. INGLÊS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'CIDADANIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'EDUCAÇÃO FÍSICA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'FILOSOFIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
]

const defaultCargaHoraria = [
  { nome: 'MENÇÃO FINAL', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'MÉDIA GLOBAL', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'DIAS LETIVOS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
  { nome: 'TOTAL DE HORAS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
]

function formatDataExtenso(val: string): string {
  if (!val) return ''
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-')
    return `${parseInt(d)} DE ${meses[parseInt(m) - 1]} DE ${y}`
  }
  return val
}

function HistoricoEditor({ initialAlunoId }: { initialAlunoId?: string | null }) {
  const [aluno, setAluno] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [pai, setPai] = useState('')
  const [mae, setMae] = useState('')
  const [naturalidade, setNaturalidade] = useState('')
  const [disciplinas, setDisciplinas] = useState<any[]>(defaultDisciplinas.map((d) => ({ ...d })))
  const [cargaHoraria, setCargaHoraria] = useState<any[]>(defaultCargaHoraria.map((c) => ({ ...c })))
  const [showEditor, setShowEditor] = useState(false)
  const [showCargaEditor, setShowCargaEditor] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null)
  const [selectedAlunoNome, setSelectedAlunoNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  // Importar médias do boletim para a coluna do ano
  const [showImportModal, setShowImportModal] = useState(false)
  const [importAno, setImportAno] = useState(String(new Date().getFullYear()))
  const [importColuna, setImportColuna] = useState('n1')
  const [importMsg, setImportMsg] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (initialAlunoId) {
      loadAluno(initialAlunoId)
    }
  }, [initialAlunoId])

  const updateDisciplina = (idx: number, key: string, value: string) => {
    setDisciplinas((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }

  const addRow = () => {
    setDisciplinas((prev) => [...prev, emptyDisciplina()])
  }

  const removeRow = (idx: number) => {
    if (disciplinas.length <= 1) return
    setDisciplinas((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateCargaHoraria = (idx: number, key: string, value: string) => {
    setCargaHoraria((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }

  const addCargaRow = () => {
    if (cargaHoraria.length >= 4) return
    setCargaHoraria((prev) => [...prev, emptyCarga()])
  }

  const removeCargaRow = (idx: number) => {
    if (cargaHoraria.length <= 1) return
    setCargaHoraria((prev) => prev.filter((_, i) => i !== idx))
  }

  const data: HistoricoData = {
    aluno, nascimento, pai, mae, naturalidade,
    disciplinas: disciplinas.filter((d) => d.nome),
    cargaHoraria: cargaHoraria.filter((c) => c.nome),
  }

  const handlePrint = () => {
    window.print()
  }

  const fillSample = () => {
    setDisciplinas(defaultDisciplinas.map((d) => ({ ...d })))
    setCargaHoraria(defaultCargaHoraria.map((c) => ({ ...c })))
  }

  const handleSearchAluno = async () => {
    if (!searchTerm.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const { data } = await api.get(`/historico-alunos?search=${encodeURIComponent(searchTerm.trim())}`)
      setSearchResults(data)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const loadAluno = async (id: string) => {
    try {
      const { data } = await api.get(`/historico-alunos/${id}`)
      const a = data.aluno
      if (!a) return
      setAluno(a.nome || '')
      setNascimento(a.data_nascimento || '')
      setPai(a.nome_pai || '')
      setMae(a.nome_mae || '')
      setNaturalidade(a.naturalidade || '')
      if (a.disciplinas) {
        try {
          const parsed = JSON.parse(a.disciplinas)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDisciplinas(parsed)
          } else {
            setDisciplinas(defaultDisciplinas.map((d) => ({ ...d })))
          }
        } catch { setDisciplinas(defaultDisciplinas.map((d) => ({ ...d }))) }
      } else {
        setDisciplinas(defaultDisciplinas.map((d) => ({ ...d })))
      }
      if (a.carga_horaria) {
        try {
          const parsed = JSON.parse(a.carga_horaria)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCargaHoraria(parsed)
          } else {
            setCargaHoraria(defaultCargaHoraria.map((c) => ({ ...c })))
          }
        } catch { setCargaHoraria(defaultCargaHoraria.map((c) => ({ ...c }))) }
      } else {
        setCargaHoraria(defaultCargaHoraria.map((c) => ({ ...c })))
      }
      setSelectedAlunoId(id)
      setSelectedAlunoNome(a.nome || '')
      setSaveMsg('')
      setSearchResults([])
      setSearchTerm(a.nome || '')
    } catch {
      setSaveMsg('Erro ao carregar aluno')
    }
  }

  const handleSaveAluno = async () => {
    if (!aluno.trim()) return
    setSaving(true)
    setSaveMsg('')
    try {
      const body = {
        nome: aluno,
        data_nascimento: nascimento,
        nome_pai: pai,
        nome_mae: mae,
        naturalidade: naturalidade,
        disciplinas: JSON.stringify(disciplinas.filter((d) => d.nome)),
        carga_horaria: JSON.stringify(cargaHoraria.filter((c) => c.nome)),
      }
      if (selectedAlunoId) {
        await api.put(`/historico-alunos/${selectedAlunoId}`, body)
        setSaveMsg('Dados atualizados com sucesso!')
      } else {
        const res = await api.post('/historico-alunos', body)
        setSelectedAlunoId(res.data.id)
        setSaveMsg('Aluno salvo com sucesso!')
      }
      setSelectedAlunoNome(aluno)
    } catch (err: any) {
      setSaveMsg(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearchAluno()
  }

  const clearSelection = () => {
    setSelectedAlunoId(null)
    setSelectedAlunoNome('')
    setSearchTerm('')
    setSearchResults([])
    setSaveMsg('')
  }

  // Importa as médias anuais do boletim (tabela `notas`, alimentada pelas
  // avaliações do Diário de Classe) para a coluna N1-N9 escolhida do documento.
  const importarDoBoletim = async () => {
    if (!selectedAlunoId) return
    setImporting(true)
    setImportMsg('')
    try {
      const { data } = await api.get(`/notas/boletim/${selectedAlunoId}`, { params: { ano_letivo: importAno } })
      const boletimDisciplinas: any[] = data.disciplinas || []
      if (boletimDisciplinas.length === 0) {
        setImportMsg('Nenhuma nota encontrada para este aluno no ano letivo informado.')
        return
      }
      const normalize = (s: string) => String(s || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toUpperCase().replace(/\s+/g, ' ')
      let casadas = 0
      const next = disciplinas.map((d: any) => {
        const match = boletimDisciplinas.find((b) => normalize(b.disciplina_nome) === normalize(d.nome))
        if (!match || match.media === null || match.media === undefined) return d
        casadas++
        return {
          ...d,
          [importColuna]: String(match.media).replace('.', ','),
          ano: importAno,
        }
      })
      setDisciplinas(next)
      setImportMsg(
        casadas > 0
          ? `${casadas} disciplina(s) preenchida(s) com a média de ${importAno} na coluna ${importColuna.toUpperCase()}. Lembre de "Atualizar Dados" para salvar.`
          : 'Nenhuma disciplina do documento casou com as do boletim (compare os nomes).',
      )
    } catch (err: any) {
      const status = err.response?.status
      setImportMsg(
        status === 403
          ? 'Seu usuário não tem permissão para ver notas/boletim.'
          : err.response?.data?.error || 'Erro ao importar médias do boletim'
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="historico-editor">
      <div className="historico-editor-print-area">
        <div className="history-editor-header">
          <h2>Editor de Histórico Escolar</h2>
          <div className="historico-editor-actions">
            <button className="btn btn-sm btn-primary" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Ocultar Preview' : 'Pré-visualizar'}
            </button>
            <button className="btn btn-sm btn-outline" onClick={handlePrint}>Imprimir (A4)</button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => { setShowImportModal(true); setImportMsg('') }}
              disabled={!selectedAlunoId}
              title={selectedAlunoId ? 'Importar médias do boletim para uma coluna do ano' : 'Selecione um aluno primeiro'}
            >
              📊 Importar do Boletim
            </button>
          </div>
        </div>

      {showImportModal && (
        <div className="admin-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <button className="admin-modal-close" onClick={() => setShowImportModal(false)}>&times;</button>
            <h3>Importar do Boletim</h3>
            <p style={{ margin: '4px 0 12px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Preenche a coluna escolhida com a média anual de cada disciplina do boletim de{' '}
              <strong>{selectedAlunoNome || aluno || 'aluno'}</strong>. As disciplinas são casadas pelo nome.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Ano letivo</label>
                  <input
                    type="number"
                    value={importAno}
                    onChange={(e) => setImportAno(e.target.value)}
                    min="2000"
                    max="2100"
                  />
                </div>
                <div className="admin-field">
                  <label>Coluna destino</label>
                  <select value={importColuna} onChange={(e) => setImportColuna(e.target.value)}>
                    {Array.from({ length: 9 }, (_, i) => `n${i + 1}`).map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              {importMsg && <p style={{ margin: 0, fontSize: '0.82rem' }}>{importMsg}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={importarDoBoletim} disabled={importing || !selectedAlunoId}>
                  {importing ? 'Importando...' : 'Importar Médias'}
                </button>
                <button className="btn btn-outline" onClick={() => setShowImportModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

        <div className="historico-aluno-persist">
          <div className="historico-aluno-search-row">
            <div className="admin-field" style={{ flex: 1, position: 'relative' }} ref={searchRef}>
              <label>Buscar aluno cadastrado</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Digite o nome do aluno..."
                  style={{ flex: 1 }}
                />
                <button className="btn btn-sm btn-primary" onClick={handleSearchAluno} disabled={searching}>
                  {searching ? '...' : 'Buscar'}
                </button>
                {selectedAlunoId && (
                  <button className="btn btn-sm btn-outline" onClick={clearSelection}>Limpar</button>
                )}
              </div>
            </div>
            <div className="admin-field" style={{ alignSelf: 'flex-end' }}>
              <label>&nbsp;</label>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSaveAluno}
                disabled={saving || !aluno.trim()}
                style={{ minWidth: 140 }}
              >
                {saving ? 'Salvando...' : selectedAlunoId ? 'Atualizar Dados' : 'Salvar Novo Aluno'}
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="historico-search-results">
              {searchResults.map((a: any) => (
                <div
                  key={a.id}
                  className="historico-search-item"
                  onClick={() => loadAluno(a.id)}
                >
                  <strong>{a.nome}</strong>
                  {a.data_nascimento && <span className="text-muted"> — {a.data_nascimento}</span>}
                  {a.cpf && <span className="text-muted"> • {a.cpf}</span>}
                </div>
              ))}
            </div>
          )}

          {selectedAlunoNome && (
            <div className="historico-aluno-selected">
              Aluno selecionado: <strong>{selectedAlunoNome}</strong>
              {saveMsg && <span className={saveMsg.includes('sucesso') ? 'text-success' : 'text-danger'}> — {saveMsg}</span>}
            </div>
          )}
          {saveMsg && !selectedAlunoNome && (
            <div className="historico-aluno-selected">
              <span className={saveMsg.includes('sucesso') ? 'text-success' : 'text-danger'}>{saveMsg}</span>
            </div>
          )}
        </div>

        <div className="historico-student-form">
          <div className="historico-form-row">
            <div className="admin-field">
              <label>Aluno</label>
              <span className="historico-display-field">{aluno || '-'}</span>
            </div>
            <div className="admin-field">
              <label>Nascimento</label>
              <span className="historico-display-field">{formatDataExtenso(nascimento) || '-'}</span>
            </div>
          </div>
          <div className="historico-form-row">
            <div className="admin-field">
              <label>Pai</label>
              <span className="historico-display-field">{pai || '-'}</span>
            </div>
            <div className="admin-field">
              <label>Mãe</label>
              <span className="historico-display-field">{mae || '-'}</span>
            </div>
          </div>
          <div className="historico-form-row">
            <div className="admin-field">
              <label>Naturalidade</label>
              <span className="historico-display-field">{naturalidade || '-'}</span>
            </div>
            <div className="admin-field" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-outline" onClick={() => setShowEditor(!showEditor)}>
                  {showEditor ? 'Fechar Disciplinas' : 'Editar Disciplinas'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setShowCargaEditor(!showCargaEditor)}>
                  {showCargaEditor ? 'Fechar Carga Horária' : 'Editar Carga Horária'}
                </button>
                {/* <button className="btn btn-sm btn-outline" onClick={fillSample}>Carregar Exemplo</button> */}
              </div>
            </div>
          </div>
        </div>

        {showEditor && (
          <div className="historico-disciplinas-editor">
            <h3>Disciplinas ({disciplinas.length})</h3>
            <div className="historico-disciplinas-grid">
              {/* <div className="flex gap-2 text-[14px] ml-7 mb-3 " style={{ justifyContent: 'space-between', outline: '1px solid #ccc', outlineOffset: '-1px' }}> */}
              <div className="historico-disciplina-row ml-7 mb-3 font-bold">
                <span className="historico-cell-input">DISCIPLINAS</span>
                <span className="historico-cell-input">1° ANO </span>
                <span className="historico-cell-input">1°/2° </span>
                <span className="historico-cell-input">2°/3°</span>
                <span className="historico-cell-input">3°/4° </span>
                <span className="historico-cell-input">4°/5° </span>
                <span className="historico-cell-input">5°/6°/CH </span>
                <span className="historico-cell-input">6°/7°/CH </span>
                <span className="historico-cell-input">7°/8°/CH </span>
                <span className="historico-cell-input">8°/9°/CH </span>
                <span className="historico-cell-input">1ª SÉRIE </span>
                <span className="historico-cell-input">2ª SÉRIE </span>
                <span className="historico-cell-input">3ª SÉRIE </span>
                <span className="historico-cell-input">ANO </span>
                <span className="historico-cell-input">SÉRIE </span>
                <span className="historico-cell-input">ESCOLA </span>
                <span className="historico-cell-input">CID/UF </span>
                <span className="historico-cell-input">SIT</span>
              </div>
            </div>

            <div className="historico-disciplinas-grid">
              {disciplinas.map((d, idx) => (
                <div key={idx} className="historico-disciplina-row">
                  <span className="historico-row-number">{idx + 1}.</span>
                  {disciplinaFields.map((f) => (
                    <input
                      key={f.key}
                      className="historico-cell-input"
                      placeholder={f.label}
                      value={d[f.key] || ''}
                      onChange={(e) => updateDisciplina(idx, f.key, e.target.value)}
                      title={f.label}
                    />
                  ))}
                  <button className="btn btn-sm btn-danger" onClick={() => removeRow(idx)} disabled={disciplinas.length <= 1}>×</button>
                </div>
              ))}
            </div>
            <button className="btn btn-sm btn-primary" onClick={addRow} style={{ marginTop: 8 }}>+ Adicionar Disciplina</button>
          </div>
        )}

        {showCargaEditor && (
          <div className="historico-disciplinas-editor">
            <h3>Carga Horária ({cargaHoraria.length})</h3>
            <div className="historico-disciplinas-grid">
              <div className="historico-disciplina-row ml-7 mb-3 font-bold">
                <span className="historico-cell-input">DESCRIÇÃO</span>
                <span className="historico-cell-input">1° ANO</span>
                <span className="historico-cell-input">1°/2°</span>
                <span className="historico-cell-input">2°/3°</span>
                <span className="historico-cell-input">3°/4°</span>
                <span className="historico-cell-input">4°/5°</span>
                <span className="historico-cell-input">5°/6°/CH</span>
                <span className="historico-cell-input">6°/7°/CH</span>
                <span className="historico-cell-input">7°/8°/CH</span>
                <span className="historico-cell-input">8°/9°/CH</span>
                <span className="historico-cell-input">1ª SÉRIE</span>
                <span className="historico-cell-input">2ª SÉRIE</span>
                <span className="historico-cell-input">3ª SÉRIE</span>
              </div>
            </div>

            <div className="historico-disciplinas-grid">
              {cargaHoraria.map((c, idx) => (
                <div key={idx} className="historico-disciplina-row">
                  <span className="historico-row-number">{idx + 1}.</span>
                  {cargaHorariaFields.map((f) => (
                    <input
                      key={f.key}
                      className="historico-cell-input"
                      placeholder={f.label}
                      value={c[f.key] || ''}
                      onChange={(e) => updateCargaHoraria(idx, f.key, e.target.value)}
                      title={f.label}
                    />
                  ))}
                  <button className="btn btn-sm btn-danger" onClick={() => removeCargaRow(idx)} disabled={cargaHoraria.length <= 1}>×</button>
                </div>
              ))}
            </div>
            {cargaHoraria.length < 4 && (
              <button className="btn btn-sm btn-primary" onClick={addCargaRow} style={{ marginTop: 8 }}>+ Adicionar Item</button>
            )}
          </div>
        )}

        {showPreview && (
          <div className="historico-preview" id="historico-preview-content">
            <PDFPreview data={data} />
          </div>
        )}

        <style>{`
          .historico-editor {
            padding: 16px;
          }
          .history-editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 8px;
          }
          .history-editor-header h2 {
            margin: 0;
          }
          .historico-editor-actions {
            display: flex;
            gap: 8px;
          }
          .historico-student-form {
            background: white;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .historico-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .historico-form-row:last-child {
            margin-bottom: 0;
          }
          .historico-disciplinas-editor {
            background: white;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            max-height: 600px;
            overflow-y: auto;
          }
          .historico-disciplinas-editor h3 {
            margin: 0 0 12px;
            font-size: 0.95rem;
          }
          .historico-disciplinas-grid {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .historico-disciplina-row {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-wrap: nowrap;
          }
          .historico-row-number {
            font-size: 0.75rem;
            color: #888;
            width: 24px;
            flex-shrink: 0;
            text-align: right;
            padding-right: 4px;
          }
          .historico-cell-input {
            padding: 4px 6px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.75rem;
            width: 70px;
            flex-shrink: 0;
            color: var(--text);
            background: var(--bg);
          }
          .historico-cell-input:first-of-type {
            width: 130px;
          }
          .historico-cell-input:focus {
            outline: none;
            border-color: var(--primary);
          }
          .historico-preview {
            background: white;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: auto;
          }
          .historico-display-field {
            display: block;
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--bg);
            color: var(--text);
            font-size: 0.9rem;
            line-height: 1.4;
            min-height: 20px;
          }

          .historico-aluno-persist {
            background: white;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .historico-aluno-search-row {
            display: flex;
            gap: 12px;
            align-items: flex-end;
            flex-wrap: wrap;
          }
          .historico-aluno-search-row > .admin-field {
            margin-bottom: 0;
          }
          .historico-search-results {
            margin-top: 8px;
            border: 1px solid var(--border);
            border-radius: 6px;
            max-height: 200px;
            overflow-y: auto;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .historico-search-item {
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.85rem;
            border-bottom: 1px solid var(--border);
            transition: background 0.15s;
          }
          .historico-search-item:last-child {
            border-bottom: none;
          }
          .historico-search-item:hover {
            background: var(--primary-light, #ebf5ff);
          }
          .historico-aluno-selected {
            margin-top: 8px;
            font-size: 0.85rem;
            color: var(--text);
            padding: 6px 0;
          }
          .text-success { color: #28a745; }
          .text-danger { color: #dc3545; }
          .text-muted { color: #888; }

          @media print {
            body * {
              visibility: hidden !important;
              max-height: 0 !important;
              overflow: hidden !important;
            }
            #historico-preview-content,
            #historico-preview-content * {
              visibility: visible !important;
              max-height: none !important;
              overflow: visible !important;
            }
            #historico-preview-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              background: white !important;
              z-index: 999999 !important;
            }
            @page {
              size: A4 landscape;
              margin: 0;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default HistoricoEditor
