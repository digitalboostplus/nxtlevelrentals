import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from '@/lib/auth-client';
import { normalizeDate } from '@/lib/date';
import type { Notification } from '@/types/notifications';

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationCenter() {
  const { user, role } = useAuth();
  const inConsole = role === 'admin' || role === 'super-admin' || role === 'landlord';
  const eyebrow = role === 'super-admin' ? 'Super admin · Notifications' : role === 'admin' ? 'Admin · Notifications' : role === 'landlord' ? 'Owner portal · Notifications' : 'Tenant portal · Notifications';
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

  const formatDate = (timestamp: unknown): string => {
    const date = normalizeDate(timestamp);
    if (!date) return '';

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
    <div className={`owner-page notification-center${inConsole ? '' : ' notification-center--site'}`}>
      <div className="owner-page__head">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h1>Notifications</h1>
          <p className="owner-page__sub">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'} · maintenance updates land here as they happen.
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="owner-page__actions">
            <button type="button" className="outline-button" onClick={handleMarkAllAsRead} disabled={markingAllRead}>
              {markingAllRead ? 'Marking...' : 'Mark all as read'}
            </button>
          </div>
        )}
      </div>

      <div className="owner-page__chips" role="tablist" aria-label="Filter notifications">
        {(
          [
            ['all', 'All'],
            ['unread', unreadCount > 0 ? `Unread ${unreadCount}` : 'Unread'],
            ['read', 'Read'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={filter === key} className={`filter-chip${filter === key ? ' filter-chip--active' : ''}`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="notification-center__loading">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <section className="owner-card">
          <div className="owner-card__head"><h2>No notifications</h2></div>
          <p className="owner-empty">
            {filter === 'unread'
              ? 'Nothing unread. Maintenance updates will show up here as they happen.'
              : filter === 'read'
                ? 'Nothing has been marked read yet.'
                : 'Maintenance updates will show up here as they happen.'}
          </p>
        </section>
      ) : (
        <ul className="owner-list notification-list">
          {notifications.map((notification) => (
            <li key={notification.id} className={`notification-card${!notification.read ? ' notification-card--unread' : ''}`}>
              <span className="owner-list__icon" aria-hidden="true">{getNotificationIcon(notification.type)}</span>
              <div className="owner-list__text">
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <span className="notification-card__meta">
                  {formatDate(notification.createdAt)}
                  {notification.maintenanceRequestId ? (
                    <>
                      {' · '}
                      <Link href={`/portal/maintenance#maintenance-${notification.maintenanceRequestId}`}>View maintenance request</Link>
                    </>
                  ) : null}
                </span>
              </div>
              {!notification.read && (
                <button type="button" className="owner-small-button" onClick={() => handleMarkAsRead(notification.id!)}>
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .notification-center {
          max-width: 880px;
        }

        .notification-center--site {
          margin: 0 auto;
          max-width: var(--max-width);
        }

        .notification-center__loading {
          display: grid;
          justify-items: center;
          gap: 0.75rem;
          padding: 3rem 1rem;
          color: var(--color-muted);
        }

        .notification-center__loading p {
          margin: 0;
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

        .notification-list > :global(li) {
          background: var(--color-surface);
          align-items: flex-start;
        }

        .notification-list > :global(li.notification-card--unread) {
          border-color: rgba(124, 192, 255, 0.45);
        }

        .notification-card__meta {
          margin-top: 0.15rem;
        }

        .notification-card__meta :global(a) {
          color: var(--color-primary);
          font-weight: 600;
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
