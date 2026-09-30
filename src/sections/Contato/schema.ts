import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Contato',
  keys: [
    { key: 'cont_label', label: 'Label da Seção', type: 'text', default: 'Contato' },
    { key: 'cont_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'Entre em' },
    { key: 'cont_title_highlight', label: 'Destaque do Título', type: 'text', default: 'Contato' },
    { key: 'cont_subtitle', label: 'Subtítulo', type: 'textarea', default: 'Estamos prontos para atender você. Envie sua mensagem ou utilize nossos canais de atendimento.' },
    { key: 'phone_fixo', label: 'Telefone Fixo', type: 'text', default: '(82) 3512 2092' },
    { key: 'phone_whatsapp', label: 'WhatsApp', type: 'text', default: '(82) 98182 9620' },
    { key: 'address', label: 'Endereço', type: 'text', default: 'R. Adolfo Gustavo, 435, Serraria, Maceió-AL' },
    { key: 'atendimento', label: 'Horário de Atendimento', type: 'text', default: 'Seg-Sex, 7h às 18h' },
    { key: 'form_placeholder_name', label: 'Placeholder - Nome', type: 'text', default: 'Seu nome' },
    { key: 'form_placeholder_email', label: 'Placeholder - Email', type: 'text', default: 'seu@email.com' },
    { key: 'form_placeholder_phone', label: 'Placeholder - Telefone', type: 'text', default: '(82) 99999-9999' },
    { key: 'form_placeholder_message', label: 'Placeholder - Mensagem', type: 'text', default: 'Como podemos ajudar?' },
    { key: 'form_btn_text', label: 'Texto do Botão', type: 'text', default: 'Enviar Mensagem' },
    { key: 'form_success_text', label: 'Texto de Sucesso', type: 'text', default: 'Mensagem enviada!' },
  ],
}

export default schema
