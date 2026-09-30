import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Mapa',
  keys: [
    { key: 'map_label', label: 'Label da Seção', type: 'text', default: 'Localização' },
    { key: 'map_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'Onde' },
    { key: 'map_title_highlight', label: 'Destaque do Título', type: 'text', default: 'Estamos' },
    { key: 'map_address', label: 'Endereço (exibido)', type: 'text', default: 'Rua Adolfo Gustavo, 435, Serraria, Maceió-AL' },
    { key: 'map_iframe_src', label: 'URL do Embed Google Maps', type: 'textarea', default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3933.172065679885!2d-35.7557525!3d-9.6084207!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7014566c2c8b1b9%3A0x5c5c5c5c5c5c5c5c!2sRua%20Adolfo%20Gustavo%2C%20435%20-%20Serraria%2C%20Macei%C3%B3%20-%20AL!5e0!3m2!1spt-BR!2sbr!4v1' },
  ],
}

export default schema
