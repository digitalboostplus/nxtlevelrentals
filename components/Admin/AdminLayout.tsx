import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.pathname]);

  // Prevent body scroll when mobile menu is open
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
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Properties', path: '/admin/properties', icon: '🏠' },
    { label: 'Tenants', path: '/admin/tenants', icon: '👥' },
    { label: 'Rent Payments', path: '/admin/rent-payments', icon: '💰' },
    { label: 'Maintenance', path: '/admin/maintenance', icon: '🔧' },
    // { label: 'Invoices', path: '/admin/invoices', icon: '📄' },
  ];

  const activeTitle = title ? `${title} | Admin Portal` : 'Admin Portal - Next Level Rentals';

  return (
    <div className="admin-layout">
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
        <div
          className="backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="admin-body">
        <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <h2>Admin Menu</h2>
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

        <main className="admin-content">
          {children}
        </main>
      </div>

      <Footer />

      <style jsx>{`
        .admin-layout {
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
          transform: scale(1.05);
          box-shadow: var(--shadow-xl);
        }

        .mobile-menu-button:active {
          transform: scale(0.95);
        }

        .backdrop {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 45;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .admin-body {
          flex: 1;
          display: flex;
        }

        .admin-sidebar {
          width: 260px;
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          padding: 2rem 1rem;
          transition: transform var(--transition-base);
        }

        .sidebar-header {
          display: none;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .close-button:hover {
          background: var(--color-background);
          color: var(--color-text);
        }

        .admin-sidebar ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          color: var(--color-text-secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          transition: all var(--transition-fast);
          margin-bottom: 0.25rem;
          min-height: 48px;
        }

        .nav-link:hover {
          background: var(--color-background);
          color: var(--color-text);
        }

        .nav-link.active {
          background: var(--color-primary);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        .icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .label {
          font-size: 0.938rem;
        }

        .admin-content {
          flex: 1;
          background: var(--color-background);
        }

        @media (max-width: 768px) {
          .mobile-menu-button {
            display: flex;
          }

          .backdrop {
            display: block;
          }

          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            max-width: 80vw;
            z-index: 50;
            transform: translateX(-100%);
            box-shadow: var(--shadow-xl);
            overflow-y: auto;
          }

          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }

          .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1rem 1.5rem;
            border-bottom: 1px solid var(--color-border);
            margin-bottom: 1rem;
          }

          .sidebar-header h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--color-text);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-menu-button,
          .admin-sidebar,
          .nav-link,
          .close-button {
            transition-duration: 0.01ms !important;
          }

          .backdrop {
            animation: none !important;
          }

          .mobile-menu-button:hover {
            transform: none;
          }

          .mobile-menu-button:active {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
