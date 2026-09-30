import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'FAQ',
  keys: [
    { key: 'faq_label', label: 'Label da Seção', type: 'text', default: 'FAQ' },
    { key: 'faq_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'Perguntas' },
    { key: 'faq_title_highlight', label: 'Destaque do Título', type: 'text', default: 'Frequentes' },
    { key: 'faq_subtitle', label: 'Subtítulo', type: 'textarea', default: 'Tire suas principais dúvidas sobre o Colégio São Judas Tadeu.' },
  ],
  listKey: '_faq_items',
  listFields: [
    { key: 'q', label: 'Pergunta', type: 'text' },
    { key: 'a', label: 'Resposta', type: 'textarea' },
  ],
  defaultItems: [
    { q: 'Quais são os horários de funcionamento da secretaria?', a: 'A secretaria funciona de segunda a sexta-feira, das 7h às 18h, e aos sábados das 8h ao meio-dia.' },
    { q: 'Como faço para matricular meu filho?', a: 'As matrículas podem ser realizadas presencialmente em nossa secretaria ou através do nosso site.' },
    { q: 'O colégio oferece período integral?', a: 'Sim! Oferecemos o período integral com atividades complementares, acompanhamento pedagógico, alimentação e recreação monitorada.' },
    { q: 'Quais materiais didáticos são utilizados?', a: 'Utilizamos o Sistema de Ensino SAE, reconhecido nacionalmente pela qualidade e inovação.' },
    { q: 'O colégio possui acessibilidade?', a: 'Sim, nossa estrutura é adaptada para receber alunos com necessidades especiais, com rampas, banheiros adaptados e profissionais capacitados.' },
    { q: 'Como posso entrar em contato com a coordenação pedagógica?', a: 'A coordenação pedagógica atende presencialmente mediante agendamento, ou através dos nossos canais de atendimento.' },
  ],
}

export default schema
