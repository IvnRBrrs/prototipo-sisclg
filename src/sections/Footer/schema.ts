import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Footer',
  keys: [
    { key: 'footer_logo', label: 'URL da Logo', type: 'image', default: '/stj/assets/logo-sao-judas-tadeu.png' },
    { key: 'footer_description', label: 'Descrição', type: 'textarea', default: 'Educação que transforma futuros há mais de três décadas.' },
    { key: 'social_instagram_url', label: 'URL do Instagram', type: 'text', default: 'https://instagram.com/colegiosjtm' },
    { key: 'social_instagram_handle', label: 'Handle do Instagram', type: 'text', default: '@colegiosjtm' },
    { key: 'footer_phone_fixo', label: 'Telefone Fixo', type: 'text', default: '(82) 3512 2092' },
    { key: 'footer_phone_whatsapp', label: 'WhatsApp', type: 'text', default: '(82) 98182 9620' },
    { key: 'footer_address', label: 'Endereço', type: 'text', default: 'R. Adolfo Gustavo, 435, Serraria, Maceió-AL' },
    { key: 'link1_label', label: 'Link Útil 1 - Label', type: 'text', default: 'Activesoft' },
    { key: 'link1_url', label: 'Link Útil 1 - URL', type: 'text', default: 'https://siga03.activesoft.com.br/login/?instituicao=SAOJUDAS' },
    { key: 'link2_label', label: 'Link Útil 2 - Label', type: 'text', default: 'SAE Digital' },
    { key: 'link2_url', label: 'Link Útil 2 - URL', type: 'text', default: 'https://app.sae.digital/entrar/' },
    { key: 'link3_label', label: 'Link Útil 3 - Label', type: 'text', default: 'Área do Aluno' },
    { key: 'link3_url', label: 'Link Útil 3 - URL', type: 'text', default: 'http://drive.google.com/drive/folders/0AIjBGxYgeUOYUk9PVA' },
    { key: 'footer_copyright', label: 'Texto de Copyright', type: 'text', default: 'Colégio São Judas Tadeu' },
    { key: 'footer_year', label: 'Ano', type: 'text', default: '2026' },
  ],
}

export default schema
