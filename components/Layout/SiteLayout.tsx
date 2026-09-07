import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

type SiteLayoutProps = {
  children: ReactNode;
  /** 'compact' is the one-line footer the portal designs use; the landing page keeps the full one. */
  footer?: 'full' | 'compact';
};

export default function SiteLayout({ children, footer = 'full' }: SiteLayoutProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer variant={footer} />
    </>
  );
}
