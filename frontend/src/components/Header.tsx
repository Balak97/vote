import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Accueil", end: true },
  { to: "/vote", label: "Voter" },
  { to: "/results", label: "Résultats" },
  { to: "/admin", label: "Administration" },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink to="/" className="brand">
          <span className="brand__icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.15" />
              <path
                d="M16 6L26 12V20L16 26L6 20V12L16 6Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M16 14V22M12 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand__text">
            <strong>Walata</strong>
            <span>Vote sécurisé</span>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="Navigation principale">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `main-nav__link${isActive ? " is-active" : ""}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
