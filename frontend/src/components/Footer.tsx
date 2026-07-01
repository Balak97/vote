export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>© {new Date().getFullYear()} Walata Vote — scrutin électronique sécurisé</p>
        <p className="site-footer__note">Code OTP par email · Un vote par électeur · Résultats certifiés</p>
      </div>
    </footer>
  );
}
