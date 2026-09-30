import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'PreMatricula',
  keys: [
    { key: 'premat_label', label: 'Label da Seção', type: 'text', default: 'Pré-Matrícula' },
    { key: 'premat_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'Faça sua' },
    { key: 'premat_title_highlight', label: 'Destaque do Título', type: 'text', default: 'Pré-Matrícula' },
    { key: 'premat_subtitle', label: 'Subtítulo', type: 'textarea', default: 'Preencha o formulário abaixo para reservar a vaga do seu filho.' },
    { key: 'form_placeholder_responsavel', label: 'Placeholder - Responsável', type: 'text', default: 'Nome do responsável' },
    { key: 'form_placeholder_aluno', label: 'Placeholder - Nome do Aluno', type: 'text', default: 'Nome completo do aluno' },
    { key: 'form_placeholder_idade', label: 'Placeholder - Idade', type: 'text', default: 'Idade do aluno' },
    { key: 'form_placeholder_ano', label: 'Placeholder - Ano Letivo', type: 'text', default: '2026' },
    { key: 'form_placeholder_telefone', label: 'Placeholder - Telefone', type: 'text', default: '(82) 99999-9999' },
    { key: 'form_placeholder_whatsapp', label: 'Placeholder - WhatsApp', type: 'text', default: '(82) 99999-9999' },
    { key: 'form_placeholder_email', label: 'Placeholder - Email', type: 'text', default: 'seu@email.com' },
    { key: 'form_placeholder_mensagem', label: 'Placeholder - Mensagem', type: 'text', default: 'Alguma observação?' },
    { key: 'form_btn_text', label: 'Texto do Botão', type: 'text', default: 'Solicitar Pré-Matrícula' },
    { key: 'form_success_text', label: 'Texto de Sucesso', type: 'text', default: 'Solicitação enviada!' },
  ],
}

export default schema
