import { Router } from 'express'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const router = Router()

let __dirname = ''
try { __dirname = dirname(fileURLToPath(import.meta.url)) } catch { }
const ASSETS_DIR = join(__dirname, '..', '..', 'public', 'stj', 'assets')

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

router.post('/images', async (req, res) => {
  try {
    const company_id = req.company_id || 'default'
    const existing = await req.db.execute({
      sql: 'SELECT COUNT(*) as count FROM images WHERE company_id = ?',
      args: [company_id],
    })
    if (existing.rows[0].count > 0) {
      return res.json({ message: 'Images already seeded', count: existing.rows[0].count })
    }

    let files
    try {
      files = readdirSync(ASSETS_DIR).filter((f) =>
        IMAGE_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext))
      )
    } catch {
      return res.status(500).json({ error: 'Assets directory not found' })
    }

    let inserted = 0
    for (const file of files) {
      const filePath = join(ASSETS_DIR, file)
      const buffer = readFileSync(filePath)
      const base64 = buffer.toString('base64')
      const ext = file.split('.').pop().toLowerCase()
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`

      const id = crypto.randomUUID()
      await req.db.execute({
        sql: 'INSERT OR IGNORE INTO images (id, filename, data, type, component_type, company_id) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, file, base64, mime, 'seed', company_id],
      })
      inserted++
    }

    res.json({ message: 'Images seeded successfully', count: inserted })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/content', async (req, res) => {
  try {
    const company_id = req.company_id || 'default'
    const existing = await req.db.execute({
      sql: 'SELECT COUNT(*) as count FROM content WHERE company_id = ?',
      args: [company_id],
    })
    if (existing.rows[0].count > 0) {
      return res.json({ message: 'Content already seeded' })
    }

    const defaults = {
      hero_background: '/stj/assets/BANNER-1920x793-CSJT-2048x846.png',
      hero_welcome: 'Tradição desde 1989',
      hero_title1: 'Educação que',
      hero_title2: 'transforma futuros',
      hero_description: 'Há mais de três décadas formando cidadãos críticos, autônomos e preparados para os desafios do amanhã.',
      btn_primary_text: 'Conheça Nossos Segmentos',
      btn_primary_href: '#segmentos',
      btn_outline_text: 'Entre em Contato',
      btn_outline_href: '#contact',
      scroll_text: 'Role para conhecer',
      sobre_label: 'Nossa História',
      sobre_display_title: 'Nossa',
      sobre_highlight: 'História',
      sobre_paragraph1: 'Fundado em 1989, a <strong>Escola Pequenos Brilhantes</strong> é uma instituição com a missão de desempenhar um papel fundamental na formação e desenvolvimento dos alunos.',
      sobre_paragraph2: 'Ao longo de mais de três décadas, formamos gerações de estudantes que hoje se destacam nas mais diversas áreas.',
      sobre_image: '/stj/assets/nossa-historio-banner.jpg',
      seg_label: 'Segmentos de Ensino',
      seg_title_prefix: 'Nossos',
      seg_title_highlight: 'Segmentos',
      seg_subtitle: 'Oferecemos uma formação completa em todas as etapas da educação básica.',
      _seg_items: JSON.stringify([
        { _id: '1', title: 'Anos Iniciais', copy: 'Compreende os primeiros anos da educação básica, com foco no desenvolvimento cognitivo, social e emocional dos alunos.', icon: '1', gradient_from: '#09346A', gradient_to: '#153D8A', link_text: 'Saiba mais', link_href: '#contact' },
        { _id: '2', title: 'Anos Finais', copy: 'Com turmas do 6º ao 9º Ano, a ênfase é dada ao aprofundamento dos conhecimentos adquiridos nos Anos Iniciais.', icon: '2', gradient_from: '#153D8A', gradient_to: '#1a4da8', link_text: 'Saiba mais', link_href: '#contact' },
        { _id: '3', title: 'Ensino Médio', copy: 'Busca desenvolver habilidades como pensamento crítico, capacidade de análise, autonomia e preparação para a vida adulta.', icon: '3', gradient_from: '#06244A', gradient_to: '#09346A', link_text: 'Saiba mais', link_href: '#contact' },
      ]),
      gal_label: 'Galeria',
      gal_title_prefix: 'Nossa',
      gal_title_highlight: 'Estrutura',
      gal_subtitle: 'Conheça um pouco do nosso ambiente e das atividades que fazem parte do dia a dia do colégio.',
      _gal_images: JSON.stringify([
        { _id: '1', url: '/stj/assets/carrossel-1.jpg', alt: 'Imagem 1' },
        { _id: '2', url: '/stj/assets/carrossel-2.jpg', alt: 'Imagem 2' },
        { _id: '3', url: '/stj/assets/carrossel-3.jpg', alt: 'Imagem 3' },
        { _id: '4', url: '/stj/assets/carrossel-4.jpg', alt: 'Imagem 4' },
        { _id: '5', url: '/stj/assets/carrossel-5.jpg', alt: 'Imagem 5' },
        { _id: '6', url: '/stj/assets/carrossel-6.jpg', alt: 'Imagem 6' },
      ]),
      dep_label: 'Depoimentos',
      dep_title_prefix: 'O que dizem sobre',
      dep_title_highlight: 'nós',
      _dep_items: JSON.stringify([
        { _id: '1', nome: 'Maria Clara Silva', relacao: 'Mãe de aluno — Anos Iniciais', texto: 'A Escola Pequenos Brilhantes foi a melhor escolha para a educação dos meus filhos. A dedicação dos professores e o ambiente acolhedor fazem toda a diferença.' },
        { _id: '2', nome: 'Carlos Eduardo Mendes', relacao: 'Ex-aluno — Ensino Médio', texto: 'Levo comigo os valores e a base sólida que adquiri na Escola Pequenos Brilhantes. A formação que recebi foi essencial para minha trajetória acadêmica e profissional.' },
        { _id: '3', nome: 'Ana Beatriz Oliveira', relacao: 'Professora', texto: 'Trabalhar na Escola Pequenos Brilhantes é gratificante. Aqui temos liberdade pedagógica e uma equipe engajada em oferecer o melhor para cada aluno.' },
      ]),
      faq_label: 'FAQ',
      faq_title_prefix: 'Perguntas',
      faq_title_highlight: 'Frequentes',
      faq_subtitle: 'Tire suas principais dúvidas sobre o Escola Pequenos Brilhantes.',
      _faq_items: JSON.stringify([
        { _id: '1', q: 'Quais são os horários de funcionamento da secretaria?', a: 'A secretaria funciona de segunda a sexta-feira, das 7h às 18h, e aos sábados das 8h ao meio-dia.' },
        { _id: '2', q: 'Como faço para matricular meu filho?', a: 'As matrículas podem ser realizadas presencialmente em nossa secretaria ou através do nosso site.' },
        { _id: '3', q: 'O colégio oferece período integral?', a: 'Sim! Oferecemos o período integral com atividades complementares, acompanhamento pedagógico, alimentação e recreação monitorada.' },
        { _id: '4', q: 'Quais materiais didáticos são utilizados?', a: 'Utilizamos o Sistema de Ensino SAE, reconhecido nacionalmente pela qualidade e inovação.' },
        { _id: '5', q: 'O colégio possui acessibilidade?', a: 'Sim, nossa estrutura é adaptada para receber alunos com necessidades especiais.' },
        { _id: '6', q: 'Como posso entrar em contato com a coordenação pedagógica?', a: 'A coordenação pedagógica atende presencialmente mediante agendamento.' },
      ]),
      map_label: 'Localização',
      map_title_prefix: 'Onde',
      map_title_highlight: 'Estamos',
      map_address: 'R. Firmo Correia de Araújo, 035 - Clima Bom II, Maceió - AL, CEP 57071-012',
      map_iframe_src: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3933.172065679885!2d-35.7557525!3d-9.6084207!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7014566c2c8b1b9%3A0x5c5c5c5c5c5c5c5c!2sRua%20Adolfo%20Gustavo%2C%20435%20-%20Serraria%2C%20Macei%C3%B3%20-%20AL!5e0!3m2!1spt-BR!2sbr!4v1',
      blog_label: 'Blog',
      blog_title_prefix: 'Últimas do',
      blog_title_highlight: 'Blog',
      blog_subtitle: 'Acompanhe as novidades do Escola Pequenos Brilhantes.',
      blog_posts_per_page: '10',
      blog_show_sidebar: 'true',
      cont_label: 'Contato',
      cont_title_prefix: 'Entre em',
      cont_title_highlight: 'Contato',
      cont_subtitle: 'Estamos prontos para atender você. Envie sua mensagem ou utilize nossos canais de atendimento.',
      phone_fixo: '(82) 4141-0988',
      phone_whatsapp: '(82) 99972-4341',
      address: 'R. Firmo Correia de Araújo, 035 - Clima Bom II, Maceió - AL, CEP 57071-012',
      atendimento: 'Seg-Sex, 7h às 18h',
      form_placeholder_name: 'Seu nome',
      form_placeholder_email: 'seu@email.com',
      form_placeholder_phone: '(82) 99999-9999',
      form_placeholder_message: 'Como podemos ajudar?',
      form_btn_text: 'Enviar Mensagem',
      form_success_text: 'Mensagem enviada!',
      footer_logo: '/stj/assets/logo-sao-judas-tadeu.png',
      footer_description: 'Educação que transforma futuros há mais de três décadas.',
      social_instagram_url: 'https://instagram.com/escolapequenosbrilhan',
      social_instagram_handle: '@escolapequenosbrilhan',
      footer_phone_fixo: '(82) 4141-0988',
      footer_phone_whatsapp: '(82) 99972-4341',
      footer_address: 'R. Firmo Correia de Araújo, 035 - Clima Bom II, Maceió - AL, CEP 57071-012',
      // link1_label: 'Activesoft',
      // link1_url: 'https://siga03.activesoft.com.br/login/?instituicao=SAOJUDAS',
      // link2_label: 'SAE Digital',
      // link2_url: 'https://app.sae.digital/entrar/',
      link3_label: 'Área do Aluno',
      link3_url: 'http://drive.google.com/drive/folders/',
      footer_copyright: 'Escola Pequenos Brilhantes',
      footer_year: '2026',
      nav_logo: '/stj/assets/logo-sao-judas-tadeu.png',
      _nav_items: JSON.stringify([
        { _id: '1', label: 'Home', href: '#hero' },
        { _id: '2', label: 'O Colégio', dropdown_items: JSON.stringify([{ label: 'Nossa História', href: '#historia' }, { label: 'Anos Iniciais', href: '#segmentos' }, { label: 'Anos Finais', href: '#segmentos' }, { label: 'Ensino Médio', href: '#segmentos' }]) },
        { _id: '3', label: 'Links', dropdown_items: JSON.stringify([{ label: 'Área do Aluno', href: 'http://drive.google.com/drive/folders/', external: true }]) },
        { _id: '4', label: 'Login', href: '/admin/login' },
      ]),
      color_primary: '#09346A',
      color_primary_dark: '#06244A',
      color_primary_light: '#153D8A',
      color_accent: '#F4F084',
      color_text: '#212121',
      color_text_light: '#555',
      color_bg: '#F5F5F5',
      color_bg_white: '#ffffff',
      color_border: '#e0e0e0',
    }

    for (const [key, value] of Object.entries(defaults)) {
      await req.db.execute({
        sql: 'INSERT OR REPLACE INTO content (key, value, company_id) VALUES (?, ?, ?)',
        args: [key, value, company_id],
      })
    }

    await req.db.execute({
      sql: 'INSERT OR IGNORE INTO pages (slug, title, show_in_menu, company_id) VALUES (?, ?, ?, ?)',
      args: ['home', 'Home', 1, company_id],
    })

    await req.db.execute({
      sql: 'INSERT OR REPLACE INTO page_content (page_slug, key, value, company_id) VALUES (?, ?, ?, ?)',
      args: ['home', '_sections', JSON.stringify([
        { title: 'Hero', instanceId: 'hero' },
        { title: 'Sobre', instanceId: 'sobre' },
        { title: 'Segmentos', instanceId: 'segmentos' },
        { title: 'Galeria', instanceId: 'galeria' },
        { title: 'Depoimentos', instanceId: 'depoimentos' },
        { title: 'FAQ', instanceId: 'faq' },
        { title: 'Contato', instanceId: 'contato' },
        { title: 'Mapa', instanceId: 'mapa' },
        { title: 'Blog', instanceId: 'blog' },
      ]), company_id],
    })

    res.json({ message: 'Content seeded successfully' })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
