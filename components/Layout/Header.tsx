import Link from 'next/link';
import { useRouter } from 'next/router';

const landingLinks = [
  { href: '#services', label: 'Services' },
  { href: '#properties', label: 'Properties' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#contact', label: 'Contact' }
];

const portalLinks = [{ href: '/', label: 'Landing Page' }];

export default function Header() {
  const router = useRouter();
  const isHome = router.pathname === '/';
  const isPortal = router.pathname === '/portal';
  const navLinks = isHome ? landingLinks : portalLinks;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__logo">
          Next Level Rentals
        </Link>
        <nav className="site-header__nav" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={isHome ? link.href : link.href === '/' ? '/' : `/${link.href}`}
              className="site-header__link"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <Link href="/portal" className={`outline-button${isPortal ? ' filter-chip--active' : ''}`}>
            Tenant Portal
          </Link>
        </div>
      </div>
    </header>
  );
}
