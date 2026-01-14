import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.657 4.343L14.243 5.757M5.757 14.243L4.343 15.657M15.657 15.657L14.243 14.243M5.757 5.757L4.343 4.343" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
  const { resolvedTheme, toggleTheme } = useTheme();
  const isLanding = router.pathname === '/';
  const isPortalRoute = router.pathname.startsWith('/portal');
  const isAdminRoute = router.pathname.startsWith('/admin');
  const hasAdminAccess = role === 'admin' || role === 'super-admin';

  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
      await router.push('/');
    } catch (err) {
      console.error('Failed to sign out', err);
    }
  }, [router, signOutUser]);

  const dashboardHref = hasAdminAccess ? '/admin' : '/portal';
  const dashboardLabel = hasAdminAccess
    ? role === 'super-admin'
      ? 'Super Admin Console'
      : 'Admin Console'
    : 'Tenant Portal';
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
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
          >
            {resolvedTheme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          {loading ? (
            <span className="site-header__status">Loading…</span>
          ) : user ? (
            <>
              <Link
                href={dashboardHref}
                className={`outline-button${isPortalRoute || isAdminRoute ? ' filter-chip--active' : ''
                  }`}
              >
                {dashboardLabel}
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
