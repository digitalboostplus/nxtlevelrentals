import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from '@/lib/stripe-client';
import type { Notification } from '@/types/notifications';

interface NotificationDropdownProps {
  onClose: () => void;
  onNotificationRead: () => void;
}

export default function NotificationDropdown({
  onClose,
  onNotificationRead
}: NotificationDropdownProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);



  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const token = await getAuthToken();

      const response = await fetch('/api/notifications/get-unread?limit=5', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        const token = await getAuthToken();

        await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ notificationId: notification.id })
        });

        onNotificationRead();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    onClose();
  };

  const formatTimeAgo = (timestamp: any): string => {
    if (!timestamp) return '';

    const now = Date.now();
    const time = typeof timestamp === 'number' ? timestamp : timestamp.seconds * 1000;
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(time).toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maintenance_created':
        return '🔧';
      case 'status_change':
        return '🔄';
      case 'notes_added':
        return '📝';
      case 'scheduled':
        return '📅';
      default:
        return '🔔';
    }
  };

  return (
    <div className="notification-dropdown">
      <div className="dropdown-header">
        <h3>Notifications</h3>
        <Link href="/notifications">
          <a className="view-all-link" onClick={onClose}>
            View All
          </a>
        </Link>
      </div>

      <div className="dropdown-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔔</span>
            <p>No new notifications</p>
            <span className="empty-subtitle">You&apos;re all caught up!</span>
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <span className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="notification-content">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">
                    {formatTimeAgo(notification.createdAt)}
                  </div>
                </div>
                {!notification.read && <span className="unread-dot"></span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <style jsx>{`
        .notification-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          width: 380px;
          max-width: calc(100vw - 2rem);
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          overflow: hidden;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .dropdown-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .view-all-link {
          color: var(--color-primary, #6c5ce7);
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
        }

        .view-all-link:hover {
          text-decoration: underline;
        }

        .dropdown-content {
          max-height: 400px;
          overflow-y: auto;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          color: #64748b;
          text-align: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: var(--color-primary, #6c5ce7);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }

        .empty-state p {
          margin: 0.5rem 0 0;
          font-weight: 500;
          color: #475569;
        }

        .empty-subtitle {
          font-size: 0.875rem;
          color: #94a3b8;
        }

        .notification-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.2s;
          position: relative;
        }

        .notification-item:hover {
          background-color: #f8fafc;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-item.unread {
          background-color: #f0f4ff;
        }

        .notification-item.unread:hover {
          background-color: #e5edff;
        }

        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          font-size: 0.875rem;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .notification-message {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .notification-time {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }

        .unread-dot {
          position: absolute;
          top: 50%;
          right: 1rem;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background-color: var(--color-primary, #6c5ce7);
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
