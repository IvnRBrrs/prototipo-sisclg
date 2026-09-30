import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Depoimentos',
  keys: [
    { key: 'dep_label', label: 'Label da Seção', type: 'text', default: 'Depoimentos' },
    { key: 'dep_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'O que dizem sobre' },
    { key: 'dep_title_highlight', label: 'Destaque do Título', type: 'text', default: 'nós' },
  ],
  listKey: '_dep_items',
  listFields: [
    { key: 'nome', label: 'Nome', type: 'text' },
    { key: 'relacao', label: 'Relação', type: 'text' },
    { key: 'texto', label: 'Depoimento', type: 'textarea' },
  ],
  defaultItems: [
    { nome: 'Maria Clara Silva', relacao: 'Mãe de aluno — Anos Iniciais', texto: 'O Colégio São Judas Tadeu foi a melhor escolha para a educação dos meus filhos.' },
    { nome: 'Carlos Eduardo Mendes', relacao: 'Ex-aluno — Ensino Médio', texto: 'Levo comigo os valores e a base sólida que adquiri no São Judas.' },
    { nome: 'Ana Beatriz Oliveira', relacao: 'Professora', texto: 'Trabalhar no São Judas é gratificante. Aqui temos liberdade pedagógica e uma equipe engajada.' },
  ],
}

export default schema
