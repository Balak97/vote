type PageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export default function PageHero({ eyebrow, title, subtitle, children }: PageHeroProps) {
  return (
    <section className="page-hero">
      {eyebrow && <p className="page-hero__eyebrow">{eyebrow}</p>}
      <h1 className="page-hero__title">{title}</h1>
      {subtitle && <p className="page-hero__subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}
