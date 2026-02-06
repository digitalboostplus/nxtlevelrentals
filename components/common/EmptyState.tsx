import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

export default function EmptyState({
  icon = '📋',
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3 className="title">{title}</h3>
      {description && <p className="description">{description}</p>}
      {action && (
        <button className="action-button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {children && <div className="custom-content">{children}</div>}

      <style jsx>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4rem 2rem;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
          line-height: 1;
        }

        .title {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .description {
          margin: 0 0 1.5rem;
          font-size: 0.938rem;
          color: var(--color-text-secondary);
          max-width: 400px;
          line-height: 1.5;
        }

        .action-button {
          padding: 0.75rem 1.5rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.938rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .action-button:hover {
          background: var(--color-primary-dark);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .action-button:active {
          transform: translateY(0);
        }

        .custom-content {
          margin-top: 1.5rem;
        }

        @media (max-width: 768px) {
          .empty-state {
            padding: 3rem 1.5rem;
          }

          .icon {
            font-size: 3rem;
          }

          .title {
            font-size: 1.125rem;
          }

          .description {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
