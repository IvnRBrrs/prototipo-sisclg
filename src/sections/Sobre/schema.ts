import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Sobre',
  keys: [
    { key: 'sobre_label', label: 'Label da Seção', type: 'text', default: 'Nossa História' },
    { key: 'sobre_display_title', label: 'Título Display', type: 'text', default: 'Nossa' },
    { key: 'sobre_highlight', label: 'Destaque do Título', type: 'text', default: 'História' },
    { key: 'sobre_paragraph1', label: 'Parágrafo 1', type: 'textarea', default: 'Fundado em 1989, o <strong>Colégio São Judas Tadeu</strong> é uma instituição com a missão de desempenhar um papel fundamental na formação e desenvolvimento dos alunos.' },
    { key: 'sobre_paragraph2', label: 'Parágrafo 2', type: 'textarea', default: 'Ao longo de mais de três décadas, formamos gerações de estudantes que hoje se destacam nas mais diversas áreas.' },
    { key: 'sobre_image', label: 'Imagem', type: 'image', default: '/stj/assets/nossa-historio-banner.jpg' },
  ],
}

export default schema
