import { ReactNode } from "react";
import Footer from "./Footer";
import Header from "./Header";

type LayoutProps = {
  children: ReactNode;
  variant?: "default" | "narrow" | "wide";
};

export default function Layout({ children, variant = "default" }: LayoutProps) {
  return (
    <div className="app-shell">
      <Header />
      <main className={`page page--${variant}`}>{children}</main>
      <Footer />
    </div>
  );
}
