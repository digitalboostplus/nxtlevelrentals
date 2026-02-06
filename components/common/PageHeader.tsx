import React from 'react';
import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb, index) => (
              <li key={index}>
                {crumb.href ? (
                  <Link href={crumb.href}>{crumb.label}</Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="separator" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="header-content">
        <div className="header-text">
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="header-actions">{actions}</div>}
      </div>

      <style jsx>{`
        .page-header {
          padding: 2rem;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface);
        }

        .breadcrumbs {
          margin-bottom: 1rem;
        }

        .breadcrumbs ol {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          list-style: none;
          margin: 0;
          padding: 0;
          flex-wrap: wrap;
        }

        .breadcrumbs li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .breadcrumbs a {
          color: var(--color-primary);
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .breadcrumbs a:hover {
          color: var(--color-primary-dark);
          text-decoration: underline;
        }

        .breadcrumbs span:not(.separator) {
          color: var(--color-text);
          font-weight: 600;
        }

        .separator {
          color: var(--color-border);
          user-select: none;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .header-text {
          flex: 1;
        }

        h1 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text);
          line-height: 1.2;
        }

        .subtitle {
          margin: 0;
          font-size: 1rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 1.5rem 1rem;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          h1 {
            font-size: 1.5rem;
          }

          .subtitle {
            font-size: 0.875rem;
          }

          .header-actions {
            flex-direction: column;
            width: 100%;
          }

          .header-actions :global(button) {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
