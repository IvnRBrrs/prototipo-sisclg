import { useState, useRef, useCallback } from 'react'

const styleId = 'lazy-image-styles'
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const s = document.createElement('style')
  s.id = styleId
  s.textContent = `
    @keyframes lazyPulse { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }
    .lazy-glass {
      position: absolute; inset: 0; z-index: 1; pointer-events: none;
      background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      animation: lazyPulse 1.6s ease-in-out infinite;
    }
  `
  document.head.appendChild(s)
}

interface LazyImageProps {
  src: string
  alt?: string
  className?: string
  imgStyle?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  asBackground?: boolean
}

export default function LazyImage({ src, alt, className, imgStyle, loading = 'lazy', asBackground }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const bgRef = useRef<HTMLDivElement>(null)

  const handleLoad = useCallback(() => setLoaded(true), [])

  if (asBackground) {
    return (
      <>
        {!loaded && <div className="lazy-glass" />}
        <img
          src={src}
          alt=""
          loading="eager"
          onLoad={handleLoad}
          onError={handleLoad}
          style={{ display: 'none' }}
        />
        <div
          ref={bgRef}
          className={className}
          style={{
            backgroundImage: `url(${src})`,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.35s ease',
            ...imgStyle,
          }}
        />
      </>
    )
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {!loaded && <div className="lazy-glass" />}
      <img
        src={src}
        alt={alt || ''}
        className={className}
        loading={loading}
        onLoad={handleLoad}
        onError={handleLoad}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.35s ease', ...imgStyle }}
      />
    </div>
  )
}
