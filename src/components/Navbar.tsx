import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type DropdownItem = { label: string; href: string; external?: boolean }

type MenuItem =
  | { label: string; href: string; dropdown?: undefined }
  | { label: string; href?: undefined; dropdown: DropdownItem[] }

const menuItems: MenuItem[] = [
  { label: 'Home', href: '#hero' },
  {
    label: 'O Colégio',
    dropdown: [
      { label: 'Nossa História', href: '#historia' },
      { label: 'Anos Iniciais', href: '#segmentos' },
      { label: 'Anos Finais', href: '#segmentos' },
      { label: 'Ensino Médio', href: '#segmentos' },
    ],
  },
  {
    label: 'Links',
    dropdown: [
      { label: 'Activesoft', href: 'https://siga03.activesoft.com.br/login/?instituicao=SAOJUDAS', external: true },
      { label: 'Área do Aluno', href: 'http://drive.google.com/drive/folders/0AIjBGxYgeUOYUk9PVA', external: true },
      { label: 'Portal SAE', href: 'https://app.sae.digital/entrar/', external: true },
    ],
  },
  { label: 'Blog', href: '#blog' },
  { label: 'Login', href: '/admin/login' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
    >
      <div className="navbar-inner container">
        <a href="#hero" className="logo">
          <img src="/stj/assets/logo-sao-judas-tadeu.png" alt="Colégio São Judas Tadeu" className="logo-img" />
        </a>

        <div className="nav-links" ref={dropdownRef}>
          {menuItems.map((item) => (
            <div
              key={item.label}
              className="nav-item"
              onMouseEnter={() => item.dropdown && setOpenDropdown(item.label)}
              onMouseLeave={() => item.dropdown && setOpenDropdown(null)}
            >
              {item.dropdown ? (
                <>
                  <button
                    className="nav-link nav-dropdown-trigger"
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                  >
                    {item.label}
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`dropdown-arrow ${openDropdown === item.label ? 'open' : ''}`}>
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {openDropdown === item.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="dropdown-menu"
                      >
                        {item.dropdown.map((d) => (
                          d.external ? (
                            <a key={d.label} href={d.href} target="_blank" rel="noopener noreferrer" className="dropdown-link">
                              {d.label}
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="external-icon">
                                <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </a>
                          ) : (
                            <a key={d.label} href={d.href} className="dropdown-link" onClick={() => setOpenDropdown(null)}>
                              {d.label}
                            </a>
                          )
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <a href={item.href} className="nav-link">{item.label}</a>
              )}
            </div>
          ))}
        </div>

        <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          <span className={`hamb-line ${mobileOpen ? 'open' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mobile-menu"
          >
            {menuItems.map((item) => (
              <div key={item.label} className="mobile-group">
                {item.dropdown ? (
                  <>
                    <span className="mobile-group-label">{item.label}</span>
                    {item.dropdown.map((d) => (
                      d.external ? (
                        <a key={d.label} href={d.href} target="_blank" rel="noopener noreferrer" className="mobile-link" onClick={() => setMobileOpen(false)}>
                          {d.label}
                        </a>
                      ) : (
                        <a key={d.label} href={d.href} className="mobile-link" onClick={() => setMobileOpen(false)}>
                          {d.label}
                        </a>
                      )
                    ))}
                  </>
                ) : (
                  <a href={item.href} className="mobile-link mobile-link-main" onClick={() => setMobileOpen(false)}>
                    {item.label}
                  </a>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 16px 0;
          transition: all 0.4s ease;
          background: rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .navbar.scrolled {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 10px 0;
          box-shadow: 0 2px 20px rgba(0,0,0,0.06);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .logo-img {
          height: 52px;
          width: auto;
          transition: height 0.3s, filter 0.3s;
        }
        .navbar:not(.scrolled) .logo-img {
          filter: brightness(0) invert(1);
        }
        .navbar.scrolled .logo-img {
          height: 44px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .nav-item {
          position: relative;
        }
        .nav-link {
          color: var(--primary-dark);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 6px;
          transition: all 0.3s;
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-sans);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .navbar:not(.scrolled) .nav-link {
          color: white;
        }
        .nav-link:hover {
          background: rgba(9,52,106,0.06);
          color: var(--primary);
        }
        .navbar:not(.scrolled) .nav-link:hover {
          background: rgba(255,255,255,0.12);
          color: white;
        }
        .dropdown-arrow {
          transition: transform 0.3s;
        }
        .dropdown-arrow.open {
          transform: rotate(180deg);
        }
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 200px;
          background: white;
          border-radius: var(--radius);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          border: 1px solid var(--border);
          padding: 8px;
          z-index: 100;
        }
        .dropdown-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          color: var(--text);
          text-decoration: none;
          font-size: 0.9rem;
          border-radius: 6px;
          transition: all 0.2s;
          font-weight: 500;
        }
        .dropdown-link:hover {
          background: rgba(9,52,106,0.06);
          color: var(--primary);
        }
        .external-icon {
          flex-shrink: 0;
          opacity: 0.4;
        }
        .hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          width: 28px;
          height: 28px;
          position: relative;
          z-index: 1001;
        }
        .hamb-line, .hamb-line::before, .hamb-line::after {
          display: block;
          width: 24px;
          height: 2px;
          background: var(--primary-dark);
          transition: all 0.3s;
          position: absolute;
          left: 2px;
        }
        .navbar:not(.scrolled) .hamb-line,
        .navbar:not(.scrolled) .hamb-line::before,
        .navbar:not(.scrolled) .hamb-line::after {
          background: white;
        }
        .hamb-line { top: 13px; }
        .hamb-line::before { content: ''; top: -7px; }
        .hamb-line::after { content: ''; top: 7px; }
        .hamb-line.open { background: transparent; }
        .hamb-line.open::before,
        .hamb-line.open::after { background: var(--primary) !important; }
        .hamb-line.open::before { top: 0; transform: rotate(45deg); }
        .hamb-line.open::after { top: 0; transform: rotate(-45deg); }
        .mobile-menu {
          position: fixed;
          height: fit-content;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          
          justify-content: flex-start;
          gap: 28px;
          z-index: 999999;
          padding: 50px 12px 20px;
          padding-bottom: 60px;
          padding-left: 80px;
          overflow-y: auto;
        }
        .mobile-group {
          display: flex;
          flex-direction: column;

          gap: 12px;
        }
        .mobile-group-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--primary-light);
          font-weight: 600;
        }
        .mobile-link {
          color: var(--text);
          text-decoration: none;
          font-size: 1.1rem;
          font-weight: 500;
          transition: color 0.3s;
        }
        .mobile-link:hover { color: var(--primary); }
        .mobile-link-main {
          font-size: 1.3rem;
          font-weight: 600;
        }
        @media (max-width: 900px) {
          .nav-links { display: none; }
          .hamburger { display: block; z-index: 9999999; }
          .mobile-menu { z-index: 999999; }
        }
      `}</style>
    </motion.nav>
  )
}
