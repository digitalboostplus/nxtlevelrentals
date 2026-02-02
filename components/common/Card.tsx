import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  className?: string;
  noPadding?: boolean;
}

export default function Card({
  children,
  title,
  actions,
  footer,
  loading = false,
  className = '',
  noPadding = false,
}: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}

      <div className={`card-body ${noPadding ? 'no-padding' : ''}`}>
        {loading && (
          <div className="card-loading-overlay">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}
        {children}
      </div>

      {footer && <div className="card-footer">{footer}</div>}

      <style jsx>{`
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-base);
          overflow: hidden;
        }

        .card:hover {
          box-shadow: var(--shadow-md);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.75rem;
          border-bottom: 1px solid var(--color-border);
          gap: 1rem;
        }

        .card-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
          line-height: 1.2;
        }

        .card-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .card-body {
          padding: 1.75rem;
          position: relative;
        }

        .card-body.no-padding {
          padding: 0;
        }

        .card-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          z-index: 10;
          backdrop-filter: blur(4px);
        }

        [data-theme='dark'] .card-loading-overlay {
          background: rgba(30, 41, 59, 0.9);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .card-loading-overlay p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .card-footer {
          padding: 1rem 1.75rem;
          border-top: 1px solid var(--color-border);
          background: var(--color-background);
        }

        @media (max-width: 768px) {
          .card-header {
            padding: 1.25rem 1rem;
            flex-direction: column;
            align-items: stretch;
          }

          .card-title {
            font-size: 1.125rem;
          }

          .card-body {
            padding: 1.25rem 1rem;
          }

          .card-footer {
            padding: 1rem;
          }

          .card-actions {
            flex-direction: column;
            width: 100%;
          }

          .card-actions :global(button) {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
