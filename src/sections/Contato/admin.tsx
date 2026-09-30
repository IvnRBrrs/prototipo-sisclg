import { AdminProps } from '../../cms/types'

export default function ContatoAdmin({ content, onUpdate }: AdminProps) {
  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label>Label da Seção</label>
        <input value={content.cont_label || ''} onChange={(e) => onUpdate('cont_label', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Prefixo do Título</label>
        <input value={content.cont_title_prefix || ''} onChange={(e) => onUpdate('cont_title_prefix', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Destaque do Título</label>
        <input value={content.cont_title_highlight || ''} onChange={(e) => onUpdate('cont_title_highlight', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Subtítulo</label>
        <textarea rows={2} value={content.cont_subtitle || ''} onChange={(e) => onUpdate('cont_subtitle', e.target.value)} />
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Telefone Fixo</label>
          <input value={content.phone_fixo || ''} onChange={(e) => onUpdate('phone_fixo', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>WhatsApp</label>
          <input value={content.phone_whatsapp || ''} onChange={(e) => onUpdate('phone_whatsapp', e.target.value)} />
        </div>
      </div>
      <div className="admin-field">
        <label>Endereço</label>
        <input value={content.address || ''} onChange={(e) => onUpdate('address', e.target.value)} />
      </div>
      <div className="admin-field">
        <label>Horário de Atendimento</label>
        <input value={content.atendimento || ''} onChange={(e) => onUpdate('atendimento', e.target.value)} />
      </div>
      <h4>Formulário</h4>
      <div className="admin-row">
        <div className="admin-field">
          <label>Placeholder Nome</label>
          <input value={content.form_placeholder_name || ''} onChange={(e) => onUpdate('form_placeholder_name', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Placeholder Email</label>
          <input value={content.form_placeholder_email || ''} onChange={(e) => onUpdate('form_placeholder_email', e.target.value)} />
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-field">
          <label>Placeholder Telefone</label>
          <input value={content.form_placeholder_phone || ''} onChange={(e) => onUpdate('form_placeholder_phone', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Placeholder Mensagem</label>
          <input value={content.form_placeholder_message || ''} onChange={(e) => onUpdate('form_placeholder_message', e.target.value)} />
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
