import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Galeria',
  keys: [
    { key: 'gal_label', label: 'Label da Seção', type: 'text', default: 'Galeria' },
    { key: 'gal_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'Nossa' },
    { key: 'gal_title_highlight', label: 'Destaque do Título', type: 'text', default: 'Estrutura' },
    { key: 'gal_subtitle', label: 'Subtítulo', type: 'textarea', default: 'Conheça um pouco do nosso ambiente e das atividades que fazem parte do dia a dia do colégio.' },
  ],
  listKey: '_gal_images',
  listFields: [
    { key: 'url', label: 'URL da Imagem', type: 'image' },
    { key: 'alt', label: 'Texto Alternativo', type: 'text' },
    { key: 'filename', label: 'Nome do Arquivo', type: 'text' },
  ],
  defaultItems: [
    { url: '/stj/assets/carrossel-1.jpg', alt: 'Imagem 1' },
    { url: '/stj/assets/carrossel-2.jpg', alt: 'Imagem 2' },
    { url: '/stj/assets/carrossel-3.jpg', alt: 'Imagem 3' },
    { url: '/stj/assets/carrossel-4.jpg', alt: 'Imagem 4' },
    { url: '/stj/assets/carrossel-5.jpg', alt: 'Imagem 5' },
    { url: '/stj/assets/carrossel-6.jpg', alt: 'Imagem 6' },
  ],
}

export default schema
