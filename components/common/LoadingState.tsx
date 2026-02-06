import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

export default function LoadingState({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
}: LoadingStateProps) {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };

  const spinnerSize = sizeMap[size];

  return (
    <div className={`loading-state ${fullScreen ? 'full-screen' : ''}`}>
      <div className="spinner" />
      {message && <p className="message">{message}</p>}

      <style jsx>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 3rem 2rem;
        }

        .loading-state.full-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-background);
          z-index: 9999;
        }

        .spinner {
          width: ${spinnerSize}px;
          height: ${spinnerSize}px;
          border: ${size === 'small' ? '3px' : '4px'} solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .message {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: ${size === 'small' ? '0.875rem' : '1rem'};
          font-weight: 500;
          text-align: center;
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
