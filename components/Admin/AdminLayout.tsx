import React, { ReactNode } from 'react';
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

    const navItems = [
        { label: 'Dashboard', path: '/admin', icon: '📊' },
        { label: 'Properties', path: '/admin/properties', icon: '🏠' },
        { label: 'Tenants', path: '/admin/tenants', icon: '👥' },
        // { label: 'Invoices', path: '/admin/invoices', icon: '📄' },
    ];

    const activeTitle = title ? `${title} | Admin Portal` : 'Admin Portal - Next Level Rentals';

    return (
        <div className="admin-layout">
            <Head>
                <title>{activeTitle}</title>
            </Head>

            <Header />

            <div className="admin-body">
                <aside className="admin-sidebar">
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

        .admin-body {
          flex: 1;
          display: flex;
        }

        .admin-sidebar {
          width: 260px;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          padding: 2rem 1rem;
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
          padding: 0.75rem 1rem;
          color: #475569;
          text-decoration: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          transition: all 0.2s;
          margin-bottom: 0.25rem;
        }

        .nav-link:hover {
          background: #f1f5f9;
          color: var(--color-primary);
        }

        .nav-link.active {
          background: white;
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        .icon {
          font-size: 1.25rem;
        }

        .admin-content {
          flex: 1;
          background: white;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            display: none;
          }
        }
      `}</style>
        </div>
    );
}
