import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Navbar',
  keys: [
    { key: 'nav_logo', label: 'URL da Logo', type: 'image', default: '/stj/assets/logo-sao-judas-tadeu.png' },
  ],
  listKey: '_nav_items',
  listFields: [
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'href', label: 'Link (href)', type: 'text' },
    { key: 'is_dropdown', label: 'É dropdown? (true/false)', type: 'text' },
    { key: 'dropdown_items', label: 'Itens do dropdown (JSON)', type: 'textarea' },
  ],
  defaultItems: [
    { label: 'Home', href: '#hero', is_dropdown: 'false', dropdown_items: '' },
    { label: 'O Colégio', href: '', is_dropdown: 'true', dropdown_items: JSON.stringify([{ label: 'Nossa História', href: '#historia' }, { label: 'Anos Iniciais', href: '#segmentos' }, { label: 'Anos Finais', href: '#segmentos' }, { label: 'Ensino Médio', href: '#segmentos' }]) },
    { label: 'Links', href: '', is_dropdown: 'true', dropdown_items: JSON.stringify([{ label: 'Activesoft', href: 'https://siga03.activesoft.com.br/login/?instituicao=SAOJUDAS', external: true }, { label: 'Área do Aluno', href: 'http://drive.google.com/drive/folders/0AIjBGxYgeUOYUk9PVA', external: true }, { label: 'Portal SAE', href: 'https://app.sae.digital/entrar/', external: true }]) },
    { label: 'Contato', href: '#contact', is_dropdown: 'false', dropdown_items: '' },
  ],
}

export default schema
