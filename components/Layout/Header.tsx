import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const landingLinks = [
  { href: '#city-events', label: 'Events' },
  { href: '#maintenance-schedule', label: 'Schedule' },
  { href: '#tenant-resources', label: 'Resources' }
];

export default function Header() {
  const router = useRouter();
  const { user, role, signOutUser, loading } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isLanding = router.pathname === '/';
  const isPortalRoute = router.pathname.startsWith('/portal');
  const isAdminRoute = router.pathname.startsWith('/admin');
  const isLandlordRoute = router.pathname.startsWith('/landlord');
  const hasAdminAccess = role === 'admin' || role === 'super-admin';

  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
      await router.push('/');
      setIsMobileOpen(false);
    } catch (err) {
      console.error('Failed to sign out', err);
    }
  }, [router, signOutUser]);

  const closeMobileMenu = () => setIsMobileOpen(false);
  const dashboardHref = hasAdminAccess ? '/admin' : role === 'landlord' ? '/landlord' : '/portal';
  const dashboardLabel = hasAdminAccess
    ? role === 'super-admin'
      ? 'Super Admin Console'
      : 'Admin Console'
    : role === 'landlord'
      ? 'Landlord Console'
      : 'Tenant Portal';
  const showLandingLinks = isLanding;
  const mobileLinks = showLandingLinks ? landingLinks : [{ href: '/', label: 'Home' }];

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__logo">
          Next Level Rentals
        </Link>
        <nav className="site-header__nav" aria-label="Primary">
          {showLandingLinks
            ? landingLinks.map((link) => (
              <Link key={link.href} href={link.href} className="site-header__link">
                {link.label}
              </Link>
            ))
            : null}
        </nav>
        <div className="site-header__actions">
          {loading ? (
            <span className="site-header__status">Loading...</span>
          ) : user ? (
            <>
              <Link
                href={dashboardHref}
                className={`outline-button${isPortalRoute || isAdminRoute || isLandlordRoute ? ' filter-chip--active' : ''
                  }`}
              >
                {dashboardLabel}
              </Link>
              <Link
                href="/account"
                className={`ghost-button${router.pathname === '/account' ? ' filter-chip--active' : ''}`}
              >
                My Account
              </Link>
              <button type="button" className="ghost-button" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={`outline-button${router.pathname === '/login' ? ' filter-chip--active' : ''}`}
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-controls="mobile-nav"
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen((prev) => !prev)}
          >
            {isMobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {isMobileOpen ? (
        <div className="mobile-nav" id="mobile-nav">
          <div className="mobile-nav__section">
            <span className="mobile-nav__label">Explore</span>
            {mobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-nav__link"
                onClick={closeMobileMenu}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mobile-nav__section">
            <span className="mobile-nav__label">Account</span>
            {user ? (
              <>
                <Link href={dashboardHref} className="mobile-nav__link" onClick={closeMobileMenu}>
                  {dashboardLabel}
                </Link>
                <Link href="/account" className="mobile-nav__link" onClick={closeMobileMenu}>
                  My Account
                </Link>
                <button type="button" className="mobile-nav__button" onClick={() => void handleSignOut()}>
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className="mobile-nav__link" onClick={closeMobileMenu}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
