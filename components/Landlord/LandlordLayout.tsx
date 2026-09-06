import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';

interface LandlordLayoutProps {
  children: ReactNode;
  title?: string;
}

function OverviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3h8v8H3V3zm10 0h8v5h-8V3zm0 7h8v11h-8V10zM3 13h8v8H3v-8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PropertiesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20V4h16v16M8 8h2M8 12h2M8 16h2M14 8h2M14 12h2M14 16h2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FinancialsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 20V10M12 20V4M6 20v-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 14l6-6m-6 0h6v6M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PayoutsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 10h20M7 15h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MaintenanceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 5l5 5-9 9H5v-5l9-9zm-3 3l5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandlordLayout({ children, title }: LandlordLayoutProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { label: 'Overview', path: '/landlord', icon: <OverviewIcon /> },
    { label: 'My Properties', path: '/landlord/properties', icon: <PropertiesIcon /> },
    { label: 'Financials & P&L', path: '/landlord/financials', icon: <FinancialsIcon /> },
    { label: 'Expenses & Invoices', path: '/landlord/expenses', icon: <ExpensesIcon /> },
    { label: 'Disbursements', path: '/landlord/payouts', icon: <PayoutsIcon /> },
    { label: 'Maintenance', path: '/landlord/maintenance', icon: <MaintenanceIcon /> },
    { label: 'Documents', path: '/landlord/documents', icon: <DocumentsIcon /> }
  ];

  const pathSegments = router.asPath.split('?')[0].split('/').filter(Boolean);
  const breadcrumbLabels: Record<string, string> = {
    landlord: 'Owner Portal',
    properties: 'My Properties',
    financials: 'Financials',
    expenses: 'Expenses',
    payouts: 'Disbursements',
    maintenance: 'Maintenance',
    documents: 'Documents'
  };

  const breadcrumbs = pathSegments.map((segment, index) => {
    const label =
      breadcrumbLabels[segment] ??
      (segment.length > 10 ? `Record ${segment.slice(0, 6).toUpperCase()}` : segment.replace(/-/g, ' '));
    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      href: `/${pathSegments.slice(0, index + 1).join('/')}`
    };
  });
  const showBreadcrumbs = breadcrumbs.length > 2;
  const activeTitle = title ? `${title} | Owner Portal` : 'Landlord Portal - Next Level Rentals';

  return (
    <div className="landlord-layout">
      <Head>
        <title>{activeTitle}</title>
      </Head>

      <Header />

      {/* Mobile menu button */}
      <button
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop */}
      {mobileMenuOpen && (
        <div className="backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      <div className="landlord-body">
        <aside className={`landlord-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <div>
              <h2>Owner Cockpit</h2>
              <span className="sidebar-subtitle">Property Management</span>
            </div>
            <button
              className="close-button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav>
            <ul>
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`nav-link ${router.pathname === item.path ? 'active' : ''}`}
                  >
                    <span className="icon">{item.icon}</span>
                    <span className="label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="landlord-content">
          {showBreadcrumbs ? (
            <nav className="landlord-breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.href} className="landlord-breadcrumbs__item">
                  {index > 0 ? <span className="landlord-breadcrumbs__separator">/</span> : null}
                  {index === breadcrumbs.length - 1 ? (
                    <span aria-current="page">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
          {children}
        </main>
      </div>

      <Footer />

      <style jsx>{`
        .landlord-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .mobile-menu-button {
          display: none;
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          width: 56px;
          height: 56px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 50%;
          box-shadow: var(--shadow-lg);
          cursor: pointer;
          z-index: 40;
          transition: all var(--transition-fast);
          align-items: center;
          justify-content: center;
        }

        .mobile-menu-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-xl);
        }

        .backdrop {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 45;
        }

        .landlord-body {
          display: flex;
          flex: 1;
          position: relative;
        }

        .landlord-sidebar {
          width: 260px;
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          flex-shrink: 0;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.5rem 0.5rem;
          border-bottom: 1px solid var(--color-border);
        }

        .sidebar-header h2 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .sidebar-subtitle {
          font-size: 0.75rem;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .close-button {
          display: none;
          background: transparent;
          border: none;
          color: var(--color-muted);
          cursor: pointer;
          padding: 0.25rem;
        }

        nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.75rem 1rem;
          color: var(--color-muted);
          text-decoration: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 0.938rem;
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--color-text);
          background: var(--color-surface-elevated);
        }

        .nav-link.active {
          color: white;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          box-shadow: 0 2px 8px var(--color-primary-light);
        }

        .nav-link .icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .landlord-content {
          flex: 1;
          background: var(--color-background);
          min-width: 0;
        }

        .landlord-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          padding: 1.5rem 2rem 0;
          color: var(--color-muted);
        }

        .landlord-breadcrumbs a {
          color: var(--color-primary);
          text-decoration: none;
        }

        .landlord-breadcrumbs a:hover {
          text-decoration: underline;
        }

        .landlord-breadcrumbs__separator {
          color: var(--color-border);
        }

        @media (max-width: 1024px) {
          .mobile-menu-button {
            display: flex;
          }

          .backdrop {
            display: block;
          }

          .landlord-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            width: 280px;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform var(--transition-base);
            box-shadow: var(--shadow-xl);
          }

          .landlord-sidebar.mobile-open {
            transform: translateX(0);
          }

          .close-button {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
