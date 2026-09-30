import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'ConteudoGenerico',
  keys: [
    { key: 'cg_show_title', label: 'Mostrar Título', type: 'text', default: '1' },
    { key: 'cg_title', label: 'Título', type: 'text', default: '' },
    { key: 'cg_title_align', label: 'Alinhamento do Título', type: 'text', default: 'left' },
    { key: 'cg_title_color', label: 'Cor do Título', type: 'color', default: '' },
    { key: 'cg_show_subtitle', label: 'Mostrar Subtítulo', type: 'text', default: '1' },
    { key: 'cg_subtitle', label: 'Subtítulo', type: 'text', default: '' },
    { key: 'cg_subtitle_align', label: 'Alinhamento do Subtítulo', type: 'text', default: 'left' },
    { key: 'cg_subtitle_color', label: 'Cor do Subtítulo', type: 'color', default: '' },
    { key: 'cg_show_button', label: 'Mostrar Botão', type: 'text', default: '1' },
    { key: 'cg_button_text', label: 'Texto do Botão', type: 'text', default: '' },
    { key: 'cg_button_link', label: 'Link do Botão', type: 'text', default: '' },
    { key: 'cg_show_carousel', label: 'Mostrar Carrossel', type: 'text', default: '1' },
    { key: 'cg_show_video', label: 'Mostrar Vídeo', type: 'text', default: '1' },
    { key: 'cg_video_url', label: 'URL do Vídeo (YouTube/Vimeo)', type: 'text', default: '' },
    { key: 'cg_show_text', label: 'Mostrar Texto HTML', type: 'text', default: '1' },
    { key: 'cg_html', label: 'Conteúdo HTML', type: 'textarea', default: '' },
    { key: 'cg_html_align', label: 'Alinhamento do Texto HTML', type: 'text', default: 'left' },
    { key: 'cg_html_color', label: 'Cor do Texto HTML', type: 'color', default: '' },
    { key: 'cg_bg_color', label: 'Cor de Fundo', type: 'color', default: '#ffffff' },
    { key: 'cg_text_color', label: 'Cor do Texto', type: 'color', default: '#333333' },
  ],
  listKey: '_cg_images',
  listFields: [
    { key: 'src', label: 'URL da Imagem', type: 'image' },
    { key: 'alt', label: 'Texto Alternativo', type: 'text' },
  ],
  defaultItems: [],
}

export default schema
