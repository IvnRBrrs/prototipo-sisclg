import { SectionSchema } from '../../cms/types'

const schema: SectionSchema = {
  title: 'Blog',
  keys: [
    { key: 'blog_label', label: 'Label da Seção', type: 'text', default: 'Blog' },
    { key: 'blog_title_prefix', label: 'Prefixo do Título', type: 'text', default: 'Últimas do' },
    { key: 'blog_title_highlight', label: 'Destaque do Título', type: 'text', default: 'Blog' },
    { key: 'blog_subtitle', label: 'Subtítulo', type: 'textarea', default: 'Acompanhe as novidades do Colégio São Judas Tadeu.' },
    { key: 'blog_posts_per_page', label: 'Posts por Página', type: 'text', default: '10' },
    { key: 'blog_show_sidebar', label: 'Mostrar Sidebar (true/false)', type: 'text', default: 'true' },
  ],
}

export default schema
