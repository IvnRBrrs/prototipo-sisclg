import { useState } from 'react'

function getEmbedUrl(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

export default function ConteudoGenerico({ content, instanceId }: { content: Record<string, string>; instanceId?: string }) {
  const showTitle = content.cg_show_title !== ''
  const showSubtitle = content.cg_show_subtitle !== ''
  const showButton = content.cg_show_button !== ''
  const showCarousel = content.cg_show_carousel !== ''
  const showVideo = content.cg_show_video !== ''
  const showText = content.cg_show_text !== ''

  const title = content.cg_title || ''
  const titleAlign = content.cg_title_align || 'left'
  const titleColor = content.cg_title_color || undefined
  const subtitle = content.cg_subtitle || ''
  const subtitleAlign = content.cg_subtitle_align || 'left'
  const subtitleColor = content.cg_subtitle_color || undefined
  const buttonText = content.cg_button_text || ''
  const buttonLink = content.cg_button_link || ''
  const videoUrl = content.cg_video_url || ''
  const rawHtml = content.cg_html || ''
  const htmlAlign = content.cg_html_align || 'left'
  const htmlColor = content.cg_html_color || undefined
  const bgColor = content.cg_bg_color || '#ffffff'
  const textColor = content.cg_text_color || '#333333'

  let images: { src: string; alt: string }[] = []
  try {
    const raw = content._cg_images
    if (raw) images = JSON.parse(raw)
  } catch { }

  const embedUrl = getEmbedUrl(videoUrl)

  const [slideIndex, setSlideIndex] = useState(0)
  const hasPrev = slideIndex > 0
  const hasNext = slideIndex < images.length - 1

  const hasAnyContent = (
    (showTitle && title) ||
    (showSubtitle && subtitle) ||
    (showCarousel && images.length > 0) ||
    (showVideo && embedUrl) ||
    (showText && rawHtml) ||
    (showButton && buttonText && buttonLink)
  )

  if (!hasAnyContent) return null

  return (
    <section className="cg-section" style={{ backgroundColor: bgColor }}>
      <div className="cg-container">
        {showTitle && title && <h1 className="cg-title" style={{ textAlign: titleAlign as any, color: titleColor || textColor }}>{title}</h1>}
        {showSubtitle && subtitle && <p className="cg-subtitle" style={{ textAlign: subtitleAlign as any, color: subtitleColor || textColor }}>{subtitle}</p>}

        {showCarousel && images.length > 0 && (
          <div className="cg-carousel">
            <div className="cg-carousel-track" style={{ transform: `translateX(-${slideIndex * 100}%)` }}>
              {images.map((img, i) => (
                <div key={i} className="cg-carousel-slide">
                  <img src={img.src} alt={img.alt || ''} />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <>
                {hasPrev && <button className="cg-carousel-btn cg-carousel-prev" onClick={() => setSlideIndex((s) => s - 1)}>&lsaquo;</button>}
                {hasNext && <button className="cg-carousel-btn cg-carousel-next" onClick={() => setSlideIndex((s) => s + 1)}>&rsaquo;</button>}
                <div className="cg-carousel-dots">
                  {images.map((_, i) => (
                    <button key={i} className={'cg-carousel-dot' + (i === slideIndex ? ' active' : '')} onClick={() => setSlideIndex(i)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {showVideo && embedUrl && (
          <div className="cg-video-wrapper">
            <iframe src={embedUrl} title="Vídeo" allowFullScreen />
          </div>
        )}

        {showText && rawHtml && (
          <div className="cg-html-content" style={{ textAlign: htmlAlign as any, color: htmlColor || textColor }} dangerouslySetInnerHTML={{ __html: rawHtml }} />
        )}

        {showButton && buttonText && buttonLink && (
          <div className="cg-button-wrapper">
            <a href={buttonLink} className="cg-button">{buttonText}</a>
          </div>
        )}
      </div>
      <style>{`
        .cg-section {
          width: 100%;
          padding: 20px 20px 80px;
          box-sizing: border-box;
        }
        .page-sections > .cg-section:first-child {
          padding-top: 60px;
          margin-top: 80px;
        }
        .cg-container {
          max-width: 1100px; margin: 0 auto;
        }
        .cg-title {
          font-family: 'Open Sans', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 800; margin: 0 0 12px;
        }
        .cg-subtitle {
          font-family: 'Open Sans', sans-serif;
          font-size: clamp(1rem, 2.5vw, 1.3rem);
          margin: 0 0 32px; opacity: 0.85;
        }
        .cg-carousel {
          position: relative; overflow: hidden;
          border-radius: 12px; margin-bottom: 32px;
        }
        .cg-carousel-track {
          display: flex; transition: transform 0.4s ease;
        }
        .cg-carousel-slide {
          min-width: 100%; box-sizing: border-box;
        }
        .cg-carousel-slide img {
          width: 100%; display: block;
          max-height: 400px; object-fit: contain;
          background: #e8e8e8;
        }
        .cg-carousel-btn {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: rgba(0,0,0,0.4); color: #fff;
          border: none; width: 40px; height: 40px;
          border-radius: 50%; font-size: 1.5rem;
          cursor: pointer; z-index: 2;
          display: flex; align-items: center; justify-content: center;
        }
        .cg-carousel-prev { left: 12px; }
        .cg-carousel-next { right: 12px; }
        .cg-carousel-dots {
          display: flex; justify-content: center; gap: 6px;
          padding: 12px 0; position: absolute; bottom: 0; left: 0; right: 0;
        }
        .cg-carousel-dot {
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.6);
          background: transparent; cursor: pointer; padding: 0;
        }
        .cg-carousel-dot.active { background: #fff; }
        .cg-video-wrapper {
          position: relative; padding-bottom: 56.25%; height: 0;
          margin-bottom: 32px; border-radius: 12px; overflow: hidden;
        }
        .cg-video-wrapper iframe {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%; border: none;
        }
        .cg-html-content {
          font-family: 'Open Sans', sans-serif;
          font-size: 1rem; line-height: 1.8;
          margin-bottom: 32px;
        }
        .cg-html-content p { margin: 0 0 16px; }
        .cg-html-content a { color: inherit; text-decoration: underline; font-weight: 600; }
        .cg-html-content strong { font-weight: 700; }
        .cg-html-content em { font-style: italic; }
        .cg-html-content u { text-decoration: underline; }
        .cg-button-wrapper { text-align: center; margin-top: 24px; }
        .cg-button {
          display: inline-block; padding: 14px 40px;
          font-family: 'Open Sans', sans-serif;
          font-size: 1rem; font-weight: 700;
          color: #fff; text-decoration: none;
          background: var(--primary, #0a2a5e);
          border-radius: 8px; transition: transform 0.2s;
        }
        .cg-button:hover { transform: scale(1.05); }
        @media (max-width: 768px) {
          .cg-section { padding: 32px 16px 48px; }
          .cg-carousel-slide img { max-height: 250px; }
        }
      `}</style>
    </section>
  )
}
