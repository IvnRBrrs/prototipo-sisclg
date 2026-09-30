import { AdminProps } from '../../cms/types'

export default function PreMatriculaAdmin({ content, onUpdate }: AdminProps) {
  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.premat_label || ''} onChange={(e) => onUpdate('premat_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Prefixo do Título</label>
        <input value={content.premat_title_prefix || ''} onChange={(e) => onUpdate('premat_title_prefix', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.premat_title_highlight || ''} onChange={(e) => onUpdate('premat_title_highlight', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Subtítulo</label>
        <textarea rows={2} value={content.premat_subtitle || ''} onChange={(e) => onUpdate('premat_subtitle', e.target.value)} />
      </div>
      <h4>Formulário</h4>
      <div className="admin-row">
        <div className="admin-field">
          <label>Placeholder Responsável</label>
          <input value={content.form_placeholder_responsavel || ''} onChange={(e) => onUpdate('form_placeholder_responsavel', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Placeholder Nome do Aluno</label>
          <input value={content.form_placeholder_aluno || ''} onChange={(e) => onUpdate('form_placeholder_aluno', e.target.value)} />
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Placeholder Idade</label>
          <input value={content.form_placeholder_idade || ''} onChange={(e) => onUpdate('form_placeholder_idade', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Placeholder Ano Letivo</label>
          <input value={content.form_placeholder_ano || ''} onChange={(e) => onUpdate('form_placeholder_ano', e.target.value)} />
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Placeholder Telefone</label>
          <input value={content.form_placeholder_telefone || ''} onChange={(e) => onUpdate('form_placeholder_telefone', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Placeholder WhatsApp</label>
          <input value={content.form_placeholder_whatsapp || ''} onChange={(e) => onUpdate('form_placeholder_whatsapp', e.target.value)} />
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Placeholder Email</label>
          <input value={content.form_placeholder_email || ''} onChange={(e) => onUpdate('form_placeholder_email', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Placeholder Mensagem</label>
          <input value={content.form_placeholder_mensagem || ''} onChange={(e) => onUpdate('form_placeholder_mensagem', e.target.value)} />
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Texto Botão</label>
          <input value={content.form_btn_text || ''} onChange={(e) => onUpdate('form_btn_text', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Texto Sucesso</label>
          <input value={content.form_success_text || ''} onChange={(e) => onUpdate('form_success_text', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
