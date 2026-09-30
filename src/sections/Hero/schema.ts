import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Hero',
  keys: [
    { key: 'hero_background', label: 'Imagem de Fundo', type: 'image', default: '/stj/assets/BANNER-1920x793-CSJT-2048x846.png' },
    { key: 'hero_welcome', label: 'Texto de Boas-Vindas', type: 'text', default: 'Tradição desde 1989' },
    { key: 'hero_title1', label: 'Título (linha 1)', type: 'text', default: 'Educação que' },
    { key: 'hero_title2', label: 'Título (linha 2 - destaque)', type: 'text', default: 'transforma futuros' },
    { key: 'hero_description', label: 'Descrição', type: 'textarea', default: 'Há mais de três décadas formando cidadãos críticos, autônomos e preparados para os desafios do amanhã.' },
    { key: 'btn_primary_text', label: 'Texto Botão Primário', type: 'text', default: 'Conheça Nossos Segmentos' },
    { key: 'btn_primary_href', label: 'Link Botão Primário', type: 'text', default: '#segmentos' },
    { key: 'btn_outline_text', label: 'Texto Botão Outline', type: 'text', default: 'Entre em Contato' },
    { key: 'btn_outline_href', label: 'Link Botão Outline', type: 'text', default: '#contact' },
    { key: 'scroll_text', label: 'Texto Scroll Indicator', type: 'text', default: 'Role para conhecer' },
  ],
}

export default schema
