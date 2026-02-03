import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { messagingUtils } from '@/lib/firebase-utils';
import { getAuthToken } from '@/lib/stripe-client';

const COOKIE_NAME = 'notification_prompt_dismissed';
const COOKIE_EXPIRY_DAYS = 90;

export default function PushPermissionPrompt() {
  const { user, profile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    // Only show to tenants, not admins
    if (!user || !profile || profile.role !== 'tenant') {
      return;
    }

    // Check if user already dismissed the prompt
    if (getCookie(COOKIE_NAME)) {
      return;
    }

    // Check if notifications are already granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return;
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000); // 3 seconds after page load

    return () => clearTimeout(timer);
  }, [user, profile]);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);

    try {
      // Request notification permission and get FCM token
      const token = await messagingUtils.requestPermission();

      if (token) {
        // Register token with backend
        const authToken = await getAuthToken();

        await fetch('/api/notifications/register-fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            token,
            deviceInfo: navigator.userAgent
          })
        });

        console.log('Push notifications enabled successfully');
      }

      // Hide prompt and set cookie
      handleDismiss();
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      // Still dismiss the prompt even if there's an error
      handleDismiss();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setCookie(COOKIE_NAME, 'true', COOKIE_EXPIRY_DAYS);
  };

  if (!isVisible) return null;

  return (
    <div className="push-prompt">
      <div className="prompt-content">
        <div className="prompt-icon">🔔</div>
        <div className="prompt-text">
          <h3>Stay Updated on Your Maintenance Requests</h3>
          <p>
            Enable notifications to get instant updates when we respond to your requests or schedule
            technician visits.
          </p>
        </div>
        <div className="prompt-actions">
          <button
            className="enable-button"
            onClick={handleEnableNotifications}
            disabled={isEnabling}
          >
            {isEnabling ? 'Enabling...' : 'Enable Notifications'}
          </button>
          <button className="dismiss-button" onClick={handleDismiss} disabled={isEnabling}>
            Maybe Later
          </button>
        </div>
      </div>

      <style jsx>{`
        .push-prompt {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          max-width: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .prompt-content {
          padding: 1.5rem;
        }

        .prompt-icon {
          font-size: 3rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .prompt-text {
          margin-bottom: 1.5rem;
        }

        .prompt-text h3 {
          margin: 0 0 0.5rem;
          font-size: 1.125rem;
          color: var(--color-text-secondary);
        }

        .prompt-text p {
          margin: 0;
          font-size: 0.938rem;
          color: var(--color-muted);
          line-height: 1.5;
        }

        .prompt-actions {
          display: flex;
          gap: 0.75rem;
        }

        .enable-button,
        .dismiss-button {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.938rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .enable-button {
          background-color: var(--color-primary);
          color: white;
        }

        .enable-button:hover:not(:disabled) {
          background-color: var(--color-primary-dark);
          transform: translateY(-1px);
        }

        .dismiss-button {
          background: var(--color-surface);
          color: var(--color-muted);
          border: 1px solid var(--color-border);
        }

        .dismiss-button:hover:not(:disabled) {
          border-color: rgba(15, 118, 110, 0.3);
          background-color: var(--color-surface-elevated);
        }

        .enable-button:disabled,
        .dismiss-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .push-prompt {
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
            max-width: none;
          }

          .prompt-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

// Cookie helper functions
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }

  return null;
}
