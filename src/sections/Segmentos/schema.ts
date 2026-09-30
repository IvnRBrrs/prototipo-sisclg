import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Segmentos',
  keys: [
    { key: 'seg_label', label: 'Label da Seção', type: 'text', default: 'Segmentos de Ensino' },
    { key: 'seg_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'Nossos' },
    { key: 'seg_title_highlight', label: 'Destaque do Título', type: 'text', default: 'Segmentos' },
    { key: 'seg_subtitle', label: 'Subtítulo', type: 'textarea', default: 'Oferecemos uma formação completa em todas as etapas da educação básica.' },
  ],
  listKey: '_seg_items',
  listFields: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'copy', label: 'Descrição', type: 'textarea' },
    { key: 'icon', label: 'Ícone (número)', type: 'text' },
    { key: 'gradient_from', label: 'Gradiente - Cor 1', type: 'color', default: '#09346A' },
    { key: 'gradient_to', label: 'Gradiente - Cor 2', type: 'color', default: '#153D8A' },
    { key: 'link_text', label: 'Texto do Link', type: 'text', default: 'Saiba mais' },
    { key: 'link_href', label: 'Link', type: 'text', default: '#contact' },
  ],
  defaultItems: [
    { title: 'Anos Iniciais', copy: 'Compreende os primeiros anos da educação básica, com foco no desenvolvimento cognitivo, social e emocional dos alunos.', icon: '1', gradient_from: '#09346A', gradient_to: '#153D8A', link_text: 'Saiba mais', link_href: '#contact' },
    { title: 'Anos Finais', copy: 'Com turmas do 6º ao 9º Ano, a ênfase é dada ao aprofundamento dos conhecimentos adquiridos nos Anos Iniciais.', icon: '2', gradient_from: '#153D8A', gradient_to: '#1a4da8', link_text: 'Saiba mais', link_href: '#contact' },
    { title: 'Ensino Médio', copy: 'Busca desenvolver habilidades como pensamento crítico, capacidade de análise, autonomia e preparação para a vida adulta.', icon: '3', gradient_from: '#06244A', gradient_to: '#09346A', link_text: 'Saiba mais', link_href: '#contact' },
  ],
}

export default schema
