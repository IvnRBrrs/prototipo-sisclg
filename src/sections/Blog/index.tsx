import { useState, useEffect, useCallback } from 'react'
import { fetchBlogPosts, fetchBlogTags, fetchBlogAuthors, fetchBlogArchive } from '../../cms/api'
import LazyImage from '../../components/LazyImage'

function lazyImages(html: string) {
  return html.replace(/<img\s/gi, '<img loading="lazy" ')
}

interface BlogProps {
  content: Record<string, string>
}

export default function Blog({ content }: BlogProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [authors, setAuthors] = useState<string[]>([])
  const [archive, setArchive] = useState<any[]>([])
  const [currentImage, setCurrentImage] = useState(0)
  const [touchStart, setTouchStart] = useState(0)

  const perPage = parseInt(content.blog_posts_per_page) || 10
  const showSidebar = content.blog_show_sidebar !== 'false'

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchBlogPosts({
        page,
        limit: perPage,
        search: searchInput,
        tag: tagFilter,
        author: authorFilter,
        year: yearFilter,
        month: monthFilter,
      })
      setPosts(data.posts)
      setTotalPages(data.totalPages)
    } catch {} finally { setLoading(false) }
  }, [page, perPage, searchInput, tagFilter, authorFilter, yearFilter, monthFilter])

  useEffect(() => { loadPosts() }, [loadPosts])

  useEffect(() => {
    fetchBlogTags().then(setTags).catch(() => {})
    fetchBlogAuthors().then(setAuthors).catch(() => {})
    fetchBlogArchive().then(setArchive).catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchInput(search)
    setPage(1)
    setSelectedPost(null)
  }

  const applyFilter = (key: string, value: string) => {
    if (key === 'tag') setTagFilter(tagFilter === value ? '' : value)
    else if (key === 'author') setAuthorFilter(authorFilter === value ? '' : value)
    else if (key === 'year') setYearFilter(yearFilter === value ? '' : value)
    else if (key === 'month') setMonthFilter(monthFilter === value ? '' : value)
    setPage(1)
    setSelectedPost(null)
  }

  const openPost = async (id: string) => {
    if (selectedPost?.id === id) { setSelectedPost(null); return }
    try {
      const { fetchBlogPost } = await import('../../cms/api')
      const data = await fetchBlogPost(id)
      setSelectedPost(data)
      setCurrentImage(0)
    } catch {}
  }

  const applyArchiveFilter = (year: string, month: string) => {
    if (yearFilter === year && monthFilter === month) {
      setYearFilter(''); setMonthFilter('')
    } else {
      setYearFilter(year); setMonthFilter(month)
    }
    setPage(1); setSelectedPost(null)
  }

  const clearFilters = () => {
    setSearch(''); setSearchInput(''); setTagFilter(''); setAuthorFilter(''); setYearFilter(''); setMonthFilter(''); setPage(1); setSelectedPost(null)
  }

  const hasFilters = searchInput || tagFilter || authorFilter || yearFilter || monthFilter

  const formatDate = (d: string) => {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    return `${parseInt(day)} de ${months[parseInt(m) - 1]} de ${y}`
  }

  const monthName = (m: string) => {
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    return months[parseInt(m) - 1] || m
  }

  if (selectedPost) {
    let images: { url: string; alt?: string }[] = []
    let videos: { url: string; platform?: string; caption?: string }[] = []
    try { if (selectedPost.images) images = JSON.parse(selectedPost.images) } catch {}
    try { if (selectedPost.videos) videos = JSON.parse(selectedPost.videos) } catch {}
    let tags: string[] = []
    try { if (selectedPost.tags) tags = JSON.parse(selectedPost.tags) } catch {}

    return (
      <section id="blog" className="section blog-section">
        <div className="container">
          <button className="blog-back-btn" onClick={() => setSelectedPost(null)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 15L5 9L11 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Voltar
          </button>

          <article className="blog-post-full">
            <h1 className="blog-post-title">{selectedPost.title}</h1>
            {selectedPost.subtitle && <p className="blog-post-subtitle">{selectedPost.subtitle}</p>}
            <div className="blog-post-meta">
              {selectedPost.author && <span className="blog-meta-author">Por {selectedPost.author}</span>}
              {selectedPost.date && <span className="blog-meta-date">{formatDate(selectedPost.date)}</span>}
            </div>

            {images.length > 0 && (
              <div className="blog-post-images">
                {images.length === 1 ? (
                  <LazyImage src={images[0].url} alt={images[0].alt || selectedPost.title} className="blog-post-img" />
                ) : (
                  <div className="blog-carousel"
                    onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                      const diff = touchStart - e.changedTouches[0].clientX
                      if (Math.abs(diff) > 50) {
                        diff > 0 ? setCurrentImage((p) => Math.min(images.length - 1, p + 1)) : setCurrentImage((p) => Math.max(0, p - 1))
                      }
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') setCurrentImage((p) => Math.max(0, p - 1))
                      if (e.key === 'ArrowRight') setCurrentImage((p) => Math.min(images.length - 1, p + 1))
                    }}
                  >
                    <div className="blog-carousel-viewport">
                      {images.map((img, i) => (
                        <div key={i} className={`blog-carousel-slide ${i === currentImage ? 'active' : ''}`}>
                          <LazyImage src={img.url} alt={img.alt || `Imagem ${i + 1}`} className="blog-carousel-img" loading={i === 0 ? 'eager' : 'lazy'} />
                        </div>
                      ))}
                    </div>
                    <button className="blog-carousel-btn blog-carousel-prev" onClick={() => setCurrentImage((p) => Math.max(0, p - 1))} disabled={currentImage === 0}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="blog-carousel-btn blog-carousel-next" onClick={() => setCurrentImage((p) => Math.min(images.length - 1, p + 1))} disabled={currentImage === images.length - 1}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <div className="blog-carousel-dots">
                      {images.map((_, i) => (
                        <button key={i} className={`blog-carousel-dot ${i === currentImage ? 'active' : ''}`} onClick={() => setCurrentImage(i)} aria-label={`Imagem ${i + 1}`} />
                      ))}
                    </div>
                    <span className="blog-carousel-counter">{currentImage + 1} / {images.length}</span>
                  </div>
                )}
              </div>
            )}

            {videos.length > 0 && (
              <div className="blog-post-videos">
                {videos.map((v, i) => (
                  <div key={i} className="blog-video-wrapper">
                    <iframe src={v.url} title={v.caption || `Vídeo ${i + 1}`} frameBorder="0" allowFullScreen className="blog-video-iframe" />
                    {v.caption && <p className="blog-video-caption">{v.caption}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="blog-post-content" dangerouslySetInnerHTML={{ __html: lazyImages(selectedPost.content) }} />

            {tags.length > 0 && (
              <div className="blog-post-tags">
                {tags.map((t) => <span key={t} className="blog-tag">{t}</span>)}
              </div>
            )}
          </article>
        </div>

        <style>{`
          .blog-back-btn {
            display: inline-flex; align-items: center; gap: 8px;
            background: none; border: none; cursor: pointer;
            color: var(--primary); font-size: 0.9rem; font-weight: 600;
            padding: 8px 0; margin-bottom: 32px; font-family: var(--font-sans);
            transition: opacity 0.3s;
          }
          .blog-back-btn:hover { opacity: 0.7; }
          .blog-post-full { max-width: 800px; margin: 0 auto; }
          .blog-post-title { font-size: 2rem; color: var(--primary-dark); margin: 0 0 8px; font-family: var(--font-sans); }
          .blog-post-subtitle { font-size: 1.1rem; color: var(--text-light); margin: 0 0 16px; }
          .blog-post-meta { display: flex; gap: 16px; margin-bottom: 24px; font-size: 0.85rem; color: var(--text-light); }
          .blog-post-images { margin-bottom: 24px; }
          .blog-post-img { width: 100%; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }

          .blog-carousel { position: relative; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); background: #f5f5f5; outline: none; }
          .blog-carousel:focus-visible { box-shadow: 0 0 0 3px var(--primary); }
          .blog-carousel-viewport { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; }
          .blog-carousel-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.4s ease; pointer-events: none; }
          .blog-carousel-slide.active { opacity: 1; pointer-events: auto; }
          .blog-carousel-img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .blog-carousel-btn {
            position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
            width: 40px; height: 40px; border-radius: 50%; border: none;
            background: rgba(0,0,0,0.45); color: white; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.3s; opacity: 0;
          }
          .blog-carousel:hover .blog-carousel-btn { opacity: 1; }
          .blog-carousel-btn:hover { background: rgba(0,0,0,0.7); }
          .blog-carousel-btn:disabled { opacity: 0 !important; cursor: default; }
          .blog-carousel-prev { left: 12px; }
          .blog-carousel-next { right: 12px; }
          .blog-carousel-dots { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 2; }
          .blog-carousel-dot {
            width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.7);
            background: transparent; cursor: pointer; padding: 0; transition: all 0.3s;
          }
          .blog-carousel-dot.active { background: white; border-color: white; }
          .blog-carousel-counter {
            position: absolute; top: 12px; right: 12px; z-index: 2;
            background: rgba(0,0,0,0.45); color: white; padding: 4px 10px;
            border-radius: 12px; font-size: 0.75rem; font-weight: 500;
          }

          .blog-post-videos { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }
          .blog-video-wrapper { }
          .blog-video-iframe { width: 100%; aspect-ratio: 16 / 9; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
          .blog-video-caption { font-size: 0.8rem; color: var(--text-light); margin-top: 6px; }
          .blog-post-content { line-height: 1.8; color: var(--text); margin-bottom: 32px; content-visibility: auto; contain-intrinsic-size: 500px; }
          .blog-post-content p { margin: 0 0 16px; }
          .blog-post-tags { display: flex; flex-wrap: wrap; gap: 8px; }
          .blog-tag {
            display: inline-block; padding: 4px 12px; border-radius: 20px;
            background: rgba(9,52,106,0.08); color: var(--primary);
            font-size: 0.78rem; font-weight: 500;
          }
          @media (max-width: 768px) {
            .blog-post-title { font-size: 1.5rem; }
            .blog-carousel-btn { width: 32px; height: 32px; opacity: 1; }
            .blog-carousel-prev { left: 6px; }
            .blog-carousel-next { right: 6px; }
            .blog-carousel-counter { font-size: 0.7rem; padding: 3px 8px; }
          }
        `}</style>
      </section>
    )
  }

  return (
    <section id="blog" className="section blog-section">
      <div className="container">
        <div className="section-header">
          <span className="section-label">{content.blog_label || 'Blog'}</span>
          <h2 className="section-title">
            {content.blog_title_prefix || 'Últimas do'} <span className="highlight">{content.blog_title_highlight || 'Blog'}</span>
          </h2>
          <p className="section-subtitle">
            {content.blog_subtitle || 'Acompanhe as novidades do Colégio São Judas Tadeu.'}
          </p>
        </div>

        <div className={`blog-layout ${showSidebar ? 'has-sidebar' : ''}`}>
          <div className="blog-main">
            {hasFilters && (
              <div className="blog-active-filters">
                <span>Filtros ativos:</span>
                {searchInput && <span className="blog-filter-chip" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}>Busca: "{searchInput}" ✕</span>}
                {tagFilter && <span className="blog-filter-chip" onClick={() => { setTagFilter(''); setPage(1) }}>Tag: {tagFilter} ✕</span>}
                {authorFilter && <span className="blog-filter-chip" onClick={() => { setAuthorFilter(''); setPage(1) }}>Autor: {authorFilter} ✕</span>}
                {yearFilter && <span className="blog-filter-chip" onClick={() => { setYearFilter(''); setMonthFilter(''); setPage(1) }}>Ano: {yearFilter}{monthFilter ? `/${monthFilter}` : ''} ✕</span>}
                <button className="blog-clear-filters" onClick={clearFilters}>Limpar todos</button>
              </div>
            )}

            {posts.length > 0 ? (
              <>
                <div className="blog-grid">
                  {posts.map((post) => {
                    let tags: string[] = []
                    let images: { url: string }[] = []
                    try { if (post.tags) tags = JSON.parse(post.tags) } catch {}
                    try { if (post.images) images = JSON.parse(post.images) } catch {}
                    return (
                      <div key={post.id} className="blog-card" onClick={() => openPost(post.id)}>
                        {images.length > 0 && (
                          <div className="blog-card-img-wrapper">
                            <LazyImage src={images[0].url} alt={post.title} className="blog-card-img" />
                          </div>
                        )}
                        <div className="blog-card-body">
                          <div className="blog-card-meta">
                            {post.date && <span>{formatDate(post.date)}</span>}
                            {post.author && <span>Por {post.author}</span>}
                          </div>
                          <h3 className="blog-card-title">{post.title}</h3>
                          {post.subtitle && <p className="blog-card-subtitle">{post.subtitle}</p>}
                          {tags.length > 0 && (
                            <div className="blog-card-tags">
                              {tags.map((t) => <span key={t} className="blog-tag">{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="blog-pagination">
                    <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
                    <span className="blog-page-info">Página {page} de {totalPages}</span>
                    <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
                  </div>
                )}
              </>
            ) : null}

            {posts.length === 0 && !loading && (
              <div className="blog-empty">
                <p>Nenhum post encontrado.</p>
                {hasFilters && <button className="btn btn-outline" onClick={clearFilters}>Limpar filtros</button>}
              </div>
            )}

            {loading && posts.length === 0 && (
              <div className="blog-grid">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="blog-card blog-card-skeleton">
                    <div className="blog-card-img-wrapper skeleton-pulse" />
                    <div className="blog-card-body">
                      <div className="blog-card-meta"><span className="skeleton-line w-40" /><span className="skeleton-line w-30" /></div>
                      <div className="skeleton-line w-80" />
                      <div className="skeleton-line w-60" />
                      <div className="skeleton-line w-50" />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

          {showSidebar && (
            <aside className="blog-sidebar">
              <form className="blog-search-form" onSubmit={handleSearch}>
                <input
                  type="text" placeholder="Buscar por título, autor..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="blog-search-input"
                />
                <button type="submit" className="blog-search-btn">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </form>

              {archive.length > 0 && (
                <div className="blog-sidebar-section">
                  <h4>Arquivo</h4>
                  <ul className="blog-archive-list">
                    {archive.map((a: any) => (
                      <li key={`${a.year}-${a.month}`}>
                        <button
                          className={`blog-archive-link ${yearFilter === a.year && monthFilter === a.month ? 'active' : ''}`}
                          onClick={() => applyArchiveFilter(a.year, a.month)}
                        >
                          {monthName(a.month)} de {a.year} ({a.count})
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tags.length > 0 && (
                <div className="blog-sidebar-section">
                  <h4>Tags</h4>
                  <div className="blog-tag-list">
                    {tags.map((t) => (
                      <button
                        key={t}
                        className={`blog-sidebar-tag ${tagFilter === t ? 'active' : ''}`}
                        onClick={() => applyFilter('tag', t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {authors.length > 0 && (
                <div className="blog-sidebar-section">
                  <h4>Autores</h4>
                  <ul className="blog-author-list">
                    {authors.map((a) => (
                      <li key={a}>
                        <button
                          className={`blog-author-link ${authorFilter === a ? 'active' : ''}`}
                          onClick={() => applyFilter('author', a)}
                        >
                          {a}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <style>{`
        .blog-section { background: var(--bg-white); }
        .blog-layout { display: flex; gap: 40px; align-items: flex-start; }
        .blog-layout.has-sidebar .blog-main { flex: 1; min-width: 0; }
        .blog-layout.has-sidebar .blog-sidebar { width: 280px; flex-shrink: 0; }

        .blog-active-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 0.8rem; color: var(--text-light); }
        .blog-filter-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; background: rgba(9,52,106,0.08); color: var(--primary); cursor: pointer; font-weight: 500; transition: background 0.3s; }
        .blog-filter-chip:hover { background: rgba(9,52,106,0.15); }
        .blog-clear-filters { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 0.8rem; font-weight: 600; text-decoration: underline; font-family: var(--font-sans); }

        .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .blog-card {
          background: white; border-radius: var(--radius-lg); overflow: hidden;
          box-shadow: var(--shadow-sm); border: 1px solid var(--border);
          cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column;
        }
        .blog-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .blog-card-img-wrapper { width: 100%; aspect-ratio: 16 / 9; overflow: hidden; }
        .blog-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .blog-card:hover .blog-card-img { transform: scale(1.05); }
        .blog-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .blog-card-meta { display: flex; gap: 12px; font-size: 0.78rem; color: var(--text-light); }
        .blog-card-title { font-size: 1.1rem; color: var(--primary-dark); margin: 0; font-weight: 700; line-height: 1.4; }
        .blog-card-subtitle { font-size: 0.85rem; color: var(--text-light); margin: 0; line-height: 1.5; }
        .blog-card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 8px; }

        .blog-empty { text-align: center; padding: 60px 20px; color: var(--text-light); }
        .blog-empty p { margin: 0 0 16px; }

        .blog-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 40px; }
        .blog-page-info { font-size: 0.85rem; color: var(--text-light); }

        .blog-sidebar { display: flex; flex-direction: column; gap: 28px; position: sticky; top: 100px; align-self: flex-start; }
        .blog-search-form { display: flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .blog-search-input { flex: 1; border: none; padding: 10px 14px; font-size: 0.85rem; outline: none; font-family: var(--font-sans); }
        .blog-search-btn { background: var(--primary); color: white; border: none; padding: 10px 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .blog-sidebar-section h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary-light); margin: 0 0 12px; }
        .blog-archive-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .blog-archive-link { background: none; border: none; padding: 6px 0; font-size: 0.85rem; color: var(--text); cursor: pointer; text-align: left; font-family: var(--font-sans); transition: color 0.3s; }
        .blog-archive-link:hover { color: var(--primary); }
        .blog-archive-link.active { color: var(--primary); font-weight: 600; }
        .blog-tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .blog-sidebar-tag { padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); background: white; font-size: 0.78rem; cursor: pointer; color: var(--text); font-family: var(--font-sans); transition: all 0.3s; }
        .blog-sidebar-tag:hover { border-color: var(--primary); color: var(--primary); }
        .blog-sidebar-tag.active { background: var(--primary); color: white; border-color: var(--primary); }
        .blog-author-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .blog-author-link { background: none; border: none; padding: 6px 0; font-size: 0.85rem; color: var(--text); cursor: pointer; text-align: left; font-family: var(--font-sans); transition: color 0.3s; }
        .blog-author-link:hover { color: var(--primary); }
        .blog-author-link.active { color: var(--primary); font-weight: 600; }

        @keyframes skeletonPulse { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }
        .skeleton-pulse { background: #e0e0e0; animation: skeletonPulse 1.5s ease-in-out infinite; }
        .skeleton-line { display: block; height: 14px; border-radius: 6px; background: #e0e0e0; animation: skeletonPulse 1.5s ease-in-out infinite; }
        .w-80 { width: 80%; } .w-60 { width: 60%; } .w-50 { width: 50%; } .w-40 { width: 40%; } .w-30 { width: 30%; }
        .blog-card-skeleton { pointer-events: none; }

        @media (max-width: 900px) {
          .blog-layout { flex-direction: column; }
          .blog-layout.has-sidebar .blog-sidebar { width: 100%; position: static; }
          .blog-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
