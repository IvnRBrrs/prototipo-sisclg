import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'CallToAction',
  keys: [
    { key: 'calltoaction_image', label: 'Imagem de Fundo', type: 'image', default: '' },
    { key: 'calltoaction_title', label: 'Título', type: 'text', default: 'Matrículas Abertas 2027' },
    { key: 'calltoaction_text', label: 'Texto', type: 'textarea', default: 'Garanta já a vaga do seu filho e faça parte da nossa história de excelência educacional.' },
    { key: 'calltoaction_link_label', label: 'Texto do Botão', type: 'text', default: 'Matricule-se Agora' },
    { key: 'calltoaction_link', label: 'Link do Botão (slug)', type: 'text', default: '/matricula' },
    { key: 'calltoaction_duration', label: 'Tempo (segundos) para fechar automático', type: 'number', default: '10' },
    { key: 'calltoaction_hidden', label: 'Ocultar modal', type: 'text', default: '' },
  ],
}

export default schema
