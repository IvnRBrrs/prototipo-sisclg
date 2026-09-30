import { motion } from 'framer-motion'

interface MapaProps {
  content: Record<string, string>
}

export default function Mapa({ content }: MapaProps) {
  return (
    <section className="section map-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-label">{content.map_label || 'Localização'}</span>
          <h2 className="section-title">
            {content.map_title_prefix || 'Onde'} <span className="highlight">{content.map_title_highlight || 'Estamos'}</span>
          </h2>
          <p className="section-subtitle">
            {content.map_address || 'Rua Adolfo Gustavo, 435, Serraria, Maceió-AL'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="map-wrapper"
        >
          <iframe
            src={content.map_iframe_src || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3933.172065679885!2d-35.7557525!3d-9.6084207!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7014566c2c8b1b9%3A0x5c5c5c5c5c5c5c5c!2sRua%20Adolfo%20Gustavo%2C%20435%20-%20Serraria%2C%20Macei%C3%B3%20-%20AL!5e0!3m2!1spt-BR!2sbr!4v1'}
            width="100%"
            height="100%"
            style={{ border: 0, position: 'absolute', inset: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa do Colégio São Judas Tadeu"
          />
        </motion.div>
      </div>

      <style>{`
        .map-section {
          background: var(--bg);
        }
        .map-wrapper {
          position: relative;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          aspect-ratio: 16 / 9;
          background: var(--border);
        }
      `}</style>
    </section>
  )
}
