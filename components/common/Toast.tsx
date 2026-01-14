import { useEffect, useState } from 'react';
import { useToast, type Toast as ToastType } from '@/context/ToastContext';

// Toast Icons
function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 8L8 12M8 8L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 7V11M10 14V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8.57465 3.21993L2.51465 13.4999C2.38027 13.7334 2.30949 13.9976 2.30927 14.2667C2.30905 14.5358 2.37938 14.8001 2.5134 15.0338C2.64741 15.2676 2.84056 15.4624 3.07318 15.5984C3.30581 15.7344 3.56956 15.8069 3.83865 15.8089H15.9587C16.2278 15.8069 16.4915 15.7344 16.7241 15.5984C16.9568 15.4624 17.1499 15.2676 17.2839 15.0338C17.4179 14.8001 17.4883 14.5358 17.488 14.2667C17.4878 13.9976 17.417 13.7334 17.2827 13.4999L11.2227 3.21993C11.0847 2.99254 10.8899 2.80595 10.6569 2.67815C10.4239 2.55036 10.1608 2.48584 9.89365 2.49093C9.6265 2.49601 9.36615 2.57051 9.1384 2.70693C8.91066 2.84335 8.72358 3.03692 8.57465 3.21993Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 9V13M10 7V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const icons = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 200);
  };

  const Icon = icons[toast.type];

  return (
    <div className={`toast toast--${toast.type} ${isExiting ? 'toast--exiting' : ''}`}>
      <div className="toast__icon">
        <Icon />
      </div>
      <div className="toast__content">
        <div className="toast__title">{toast.title}</div>
        {toast.message && <div className="toast__message">{toast.message}</div>}
        {toast.action && (
          <button
            className="toast__action"
            onClick={() => {
              toast.action?.onClick();
              handleClose();
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button className="toast__close" onClick={handleClose} aria-label="Close">
        <CloseIcon />
      </button>
      <style jsx>{`
        .toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          min-width: 320px;
          max-width: 420px;
          animation: slideInRight 0.3s var(--ease-out-expo);
        }
        .toast--exiting {
          animation: slideOutRight 0.2s ease-in forwards;
        }
        .toast__icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .toast--success .toast__icon { color: var(--color-success); }
        .toast--error .toast__icon { color: var(--color-error); }
        .toast--warning .toast__icon { color: var(--color-warning); }
        .toast--info .toast__icon { color: var(--color-info); }
        .toast__content {
          flex: 1;
          min-width: 0;
        }
        .toast__title {
          font-weight: 600;
          color: var(--color-text);
          font-size: 0.95rem;
        }
        .toast__message {
          color: var(--color-muted);
          font-size: 0.875rem;
          margin-top: 4px;
          line-height: 1.4;
        }
        .toast__action {
          background: none;
          border: none;
          color: var(--color-primary);
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0;
          margin-top: 8px;
          cursor: pointer;
          transition: opacity var(--transition-fast);
        }
        .toast__action:hover {
          opacity: 0.8;
        }
        .toast__close {
          flex-shrink: 0;
          background: none;
          border: none;
          color: var(--color-muted);
          padding: 4px;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .toast__close:hover {
          background: var(--color-border);
          color: var(--color-text);
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
      <style jsx>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: none;
        }
        .toast-container > :global(*) {
          pointer-events: auto;
        }
        @media (max-width: 480px) {
          .toast-container {
            top: auto;
            bottom: 20px;
            left: 20px;
            right: 20px;
          }
        }
      `}</style>
    </div>
  );
}
