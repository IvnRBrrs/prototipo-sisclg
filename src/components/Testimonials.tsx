import { motion } from 'framer-motion'

const depoimentos = [
  {
    nome: 'Maria Clara Silva',
    relacao: 'Mãe de aluno — Anos Iniciais',
    texto: 'O Colégio São Judas Tadeu foi a melhor escolha para a educação dos meus filhos. A dedicação dos professores e o ambiente acolhedor fazem toda a diferença.',
  },
  {
    nome: 'Carlos Eduardo Mendes',
    relacao: 'Ex-aluno — Ensino Médio',
    texto: 'Levo comigo os valores e a base sólida que adquiri no São Judas. A formação que recebi foi essencial para minha trajetória acadêmica e profissional.',
  },
  {
    nome: 'Ana Beatriz Oliveira',
    relacao: 'Professora',
    texto: 'Trabalhar no São Judas é gratificante. Aqui temos liberdade pedagógica e uma equipe engajada em oferecer o melhor para cada aluno.',
  },
]

export default function Testimonials() {
  return (
    <section className="section depoimentos-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-label">Depoimentos</span>
          <h2 className="section-title">
            O que dizem sobre <span className="highlight">nós</span>
          </h2>
        </motion.div>

        <div className="depoimentos-grid">
          {depoimentos.map((d, i) => (
            <motion.div
              key={d.nome}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="depoimento-card card"
            >
              <div className="depoimento-quote">"</div>
              <p className="depoimento-texto">{d.texto}</p>
              <div className="depoimento-author">
                <div className="depoimento-avatar">
                  {d.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="depoimento-nome">{d.nome}</div>
                  <div className="depoimento-relacao">{d.relacao}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .depoimentos-section {
          background: var(--bg-white);
        }
        .depoimentos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .depoimento-card {
          display: flex;
          flex-direction: column;
        }
        .depoimento-quote {
          font-family: var(--font-display);
          font-size: 4rem;
          line-height: 1;
          color: var(--primary);
          opacity: 0.2;
          margin-bottom: -8px;
        }
        .depoimento-texto {
          color: var(--text-light);
          font-size: 0.95rem;
          line-height: 1.7;
          flex: 1;
          margin-bottom: 24px;
          font-style: italic;
        }
        .depoimento-author {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .depoimento-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
        }
        .depoimento-nome {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--primary-dark);
        }
        .depoimento-relacao {
          font-size: 0.8rem;
          color: var(--text-light);
        }
      `}</style>
    </section>
  )
}
