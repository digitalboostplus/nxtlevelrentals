import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from '@/lib/stripe-client';
import type { Notification } from '@/types/notifications';

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);



  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const token = await getAuthToken();
      const includeRead = filter === 'all' || filter === 'read';

      const response = await fetch(
        `/api/notifications/get-unread?limit=50&includeRead=${includeRead}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        let filtered = data.notifications || [];

        // Apply filter
        if (filter === 'unread') {
          filtered = filtered.filter((n: Notification) => !n.read);
        } else if (filter === 'read') {
          filtered = filtered.filter((n: Notification) => n.read);
        }

        setNotifications(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = await getAuthToken();

      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId })
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

    if (unreadIds.length === 0) return;

    setMarkingAllRead(true);

    try {
      const token = await getAuthToken();

      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notificationIds: unreadIds })
      });

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '';

    const time = typeof timestamp === 'number' ? timestamp : timestamp.seconds * 1000;
    const date = new Date(time);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notification-center">
      <div className="center-header">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button
            className="mark-all-button"
            onClick={handleMarkAllAsRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? 'Marking...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button
          className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
          onClick={() => setFilter('read')}
        >
          Read
        </button>
      </div>

      <div className="notifications-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔔</span>
            <h3>No notifications</h3>
            <p>
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : filter === 'read'
                  ? 'No read notifications yet.'
                  : 'No notifications to display.'}
            </p>
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`notification-card ${!notification.read ? 'unread' : ''}`}
              >
                <div className="card-header">
                  <span className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="card-title-section">
                    <h3 className="card-title">{notification.title}</h3>
                    <span className="card-time">{formatDate(notification.createdAt)}</span>
                  </div>
                  {!notification.read && (
                    <button
                      className="mark-read-button"
                      onClick={() => handleMarkAsRead(notification.id!)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                </div>

                <p className="card-message">{notification.message}</p>

                {notification.maintenanceRequestId && (
                  <Link href={`/portal#maintenance-${notification.maintenanceRequestId}`}>
                    <a className="view-request-link">View Maintenance Request →</a>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <style jsx>{`
        .notification-center {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .center-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .center-header h1 {
          margin: 0;
          font-size: 2rem;
          color: #1e293b;
        }

        .mark-all-button {
          padding: 0.625rem 1.25rem;
          background-color: var(--color-primary, #6c5ce7);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mark-all-button:hover:not(:disabled) {
          background-color: var(--color-primary-dark, #5b4bc9);
          transform: translateY(-1px);
        }

        .mark-all-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .filter-tab {
          padding: 0.75rem 1.25rem;
          background: none;
          border: none;
          font-size: 0.938rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          color: #334155;
        }

        .filter-tab.active {
          color: var(--color-primary, #6c5ce7);
          border-bottom-color: var(--color-primary, #6c5ce7);
        }

        .notifications-content {
          min-height: 300px;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
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
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem;
          color: #475569;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          color: #94a3b8;
        }

        .notification-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .notification-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .notification-card.unread {
          background-color: #f0f4ff;
          border-color: #c7d2fe;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .notification-icon {
          font-size: 1.75rem;
          flex-shrink: 0;
        }

        .card-title-section {
          flex: 1;
          min-width: 0;
        }

        .card-title {
          margin: 0 0 0.25rem;
          font-size: 1.063rem;
          font-weight: 600;
          color: #1e293b;
        }

        .card-time {
          font-size: 0.813rem;
          color: #94a3b8;
        }

        .mark-read-button {
          padding: 0.375rem 0.75rem;
          background: var(--color-primary, #6c5ce7);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .mark-read-button:hover {
          background-color: var(--color-primary-dark, #5b4bc9);
          transform: scale(1.1);
        }

        .card-message {
          margin: 0 0 1rem 0;
          color: #475569;
          line-height: 1.6;
          margin-left: 3.75rem;
        }

        .view-request-link {
          display: inline-block;
          color: var(--color-primary, #6c5ce7);
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          margin-left: 3.75rem;
          transition: all 0.2s;
        }

        .view-request-link:hover {
          text-decoration: underline;
          transform: translateX(4px);
        }

        @media (max-width: 640px) {
          .center-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .card-message,
          .view-request-link {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
