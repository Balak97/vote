import { Link } from "react-router-dom";
import HomeContactSection from "../components/HomeContactSection";
import LiveVoteDashboard from "../components/LiveVoteDashboard";

const features = [
  {
    icon: "🔐",
    title: "Authentification OTP",
    text: "Chaque électeur reçoit un code unique par email avant de voter.",
  },
  {
    icon: "✓",
    title: "Un vote par personne",
    text: "Contrainte technique garantissant qu'un électeur ne vote qu'une seule fois par scrutin.",
  },
  {
    icon: "📊",
    title: "Suivi en direct",
    text: "Graphique et compteurs mis à jour automatiquement pendant le scrutin.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-banner">
        <div className="hero-banner__content">
          <p className="hero-banner__eyebrow">Plateforme électorale</p>
          <h1 className="hero-banner__title">Votez en toute confiance</h1>
          <p className="hero-banner__text">
            Walata Vote est une solution de scrutin électronique sécurisée. Suivez les candidats
            et l&apos;évolution des votes en temps réel depuis cette page.
          </p>
          <div className="hero-banner__actions">
            <Link to="/vote" className="btn accent btn--lg">
              Commencer à voter
            </Link>
            <Link to="/results" className="btn btn--ghost btn--lg">
              Résultats finaux
            </Link>
          </div>
        </div>
      </section>

      <LiveVoteDashboard />

      <HomeContactSection />

      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)", marginBottom: "1.25rem" }}>
          Comment ça marche
        </h2>
        <div className="feature-grid">
          {features.map((f) => (
            <article key={f.title} className="feature-card">
              <div className="feature-card__icon" aria-hidden="true">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
