import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const landingLinks = [
  { href: '#services', label: 'Services' },
  { href: '#properties', label: 'Properties' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#contact', label: 'Contact' }
];

export default function Header() {
  const router = useRouter();
  const { user, role, signOutUser, loading } = useAuth();
  const isLanding = router.pathname === '/';
  const isPortalRoute = router.pathname.startsWith('/portal');
  const isAdminRoute = router.pathname.startsWith('/admin');

  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
      await router.push('/');
    } catch (err) {
      console.error('Failed to sign out', err);
    }
  }, [router, signOutUser]);

  const dashboardHref = role === 'admin' ? '/admin' : '/portal';
  const showLandingLinks = isLanding;

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
            <span className="site-header__status">Loading…</span>
          ) : user ? (
            <>
              <Link
                href={dashboardHref}
                className={`outline-button${
                  isPortalRoute || isAdminRoute ? ' filter-chip--active' : ''
                }`}
              >
                {role === 'admin' ? 'Admin Console' : 'Tenant Portal'}
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
        </div>
      </div>
    </header>
  );
}
