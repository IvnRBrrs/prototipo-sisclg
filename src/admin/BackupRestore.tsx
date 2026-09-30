import { useState, useEffect } from 'react'
import api, { fetchBackups, createBackup } from '../cms/api'
import { fetchContentCached } from '../cms/contentCache'

interface Backup {
  id: number
  section_key: string
  value: string
  version: number
  created_at: string
}

const SECTION_KEYS = [
  'global',
  'Hero',
  'Sobre',
  'Segmentos',
  'Galeria',
  'Depoimentos',
  'FAQ',
  'Contato',
  'Mapa',
  'Footer',
  'Navbar',
]

export default function BackupRestore() {
  const [selectedKey, setSelectedKey] = useState('global')
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    if (selectedKey) loadBackups()
  }, [selectedKey])

  const loadBackups = async () => {
    setLoading(true)
    try {
      const data = await fetchBackups(selectedKey)
      setBackups(data)
    } catch {
      setBackups([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      const { data: content } = await fetchContentCached()
      await createBackup(selectedKey, content)
      loadBackups()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRestore = async (backup: Backup) => {
    if (!confirm(`Restaurar backup #${backup.id} (v${backup.version}) de ${backup.created_at}?`)) return
    setRestoring(true)
    try {
      await api.post('/backups/restore', {
        section_key: backup.section_key,
        value: backup.value,
      })
      alert('Backup restaurado!')
    } catch (err) {
      console.error(err)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="admin-backups">
      <h2>Backup e Restauração</h2>
      <p>Crie e gerencie backups do conteúdo do site.</p>

      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
        <div className="admin-field">
          <label>Seção</label>
          <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {SECTION_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleCreateBackup}>Criar Backup</button>
      </div>

      <h3>Backups de "{selectedKey}"</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : backups.length === 0 ? (
        <p className="admin-empty">Nenhum backup encontrado.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Versão</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.version}</td>
                <td>{new Date(b.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => handleRestore(b)} disabled={restoring}>
                    Restaurar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
