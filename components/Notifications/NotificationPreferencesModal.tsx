import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from '@/lib/stripe-client';
import type { NotificationPreferences } from '@/types/notifications';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPreferencesModal({
  isOpen,
  onClose
}: NotificationPreferencesModalProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchPreferences();
    }
  }, [isOpen, user]);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      const response = await fetch('/api/notifications/preferences', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      } else {
        throw new Error('Failed to fetch preferences');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getAuthToken();

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: preferences.email,
          push: preferences.push,
          inApp: preferences.inApp
        })
      });

      if (response.ok) {
        onClose();
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (
    channel: 'email' | 'push' | 'inApp',
    field: string,
    value: boolean
  ) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [channel]: {
        ...preferences[channel],
        [field]: value
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Notification Preferences</h2>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </header>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading preferences...</p>
          </div>
        ) : preferences ? (
          <div className="modal__content">
            <p className="description">
              Choose how you want to receive notifications about your maintenance requests.
            </p>

            {/* Email Preferences */}
            <section className="preference-section">
              <div className="section-header">
                <h3>Email Notifications</h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.email.enabled}
                    onChange={(e) => handleToggle('email', 'enabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {preferences.email.enabled && (
                <div className="preference-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.email.requestConfirmation}
                      onChange={(e) =>
                        handleToggle('email', 'requestConfirmation', e.target.checked)
                      }
                    />
                    <span>Request confirmation</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.email.statusChanges}
                      onChange={(e) => handleToggle('email', 'statusChanges', e.target.checked)}
                    />
                    <span>Status changes</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.email.notesAdded}
                      onChange={(e) => handleToggle('email', 'notesAdded', e.target.checked)}
                    />
                    <span>Admin notes added</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.email.technicianScheduled}
                      onChange={(e) =>
                        handleToggle('email', 'technicianScheduled', e.target.checked)
                      }
                    />
                    <span>Technician scheduled</span>
                  </label>
                </div>
              )}
            </section>

            {/* Push Notifications */}
            <section className="preference-section">
              <div className="section-header">
                <h3>Push Notifications</h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.push.enabled}
                    onChange={(e) => handleToggle('push', 'enabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {preferences.push.enabled && (
                <div className="preference-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.push.requestConfirmation}
                      onChange={(e) =>
                        handleToggle('push', 'requestConfirmation', e.target.checked)
                      }
                    />
                    <span>Request confirmation</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.push.statusChanges}
                      onChange={(e) => handleToggle('push', 'statusChanges', e.target.checked)}
                    />
                    <span>Status changes</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.push.notesAdded}
                      onChange={(e) => handleToggle('push', 'notesAdded', e.target.checked)}
                    />
                    <span>Admin notes added</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.push.technicianScheduled}
                      onChange={(e) =>
                        handleToggle('push', 'technicianScheduled', e.target.checked)
                      }
                    />
                    <span>Technician scheduled</span>
                  </label>
                </div>
              )}
            </section>

            {/* In-App Notifications */}
            <section className="preference-section">
              <div className="section-header">
                <h3>In-App Notifications</h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.inApp.enabled}
                    onChange={(e) => handleToggle('inApp', 'enabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <p className="section-note">
                In-app notifications appear in your notification bell and notification center.
              </p>
            </section>

            {error && <p className="error-message">{error}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="outline-button"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        ) : (
          <p className="error-message">Failed to load preferences</p>
        )}

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
          }

          .modal {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }

          .modal__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .modal__header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: #1e293b;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #94a3b8;
            padding: 0;
            line-height: 1;
          }

          .close-button:hover {
            color: #64748b;
          }

          .modal__content {
            padding: 2rem;
          }

          .description {
            margin: 0 0 2rem;
            color: #64748b;
            line-height: 1.6;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
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

          .preference-section {
            margin-bottom: 2rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .preference-section:last-of-type {
            border-bottom: none;
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .section-header h3 {
            margin: 0;
            font-size: 1.125rem;
            color: #1e293b;
          }

          .section-note {
            margin: 0.5rem 0 0;
            font-size: 0.875rem;
            color: #94a3b8;
          }

          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 48px;
            height: 24px;
          }

          .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #cbd5e1;
            transition: 0.3s;
            border-radius: 24px;
          }

          .toggle-slider:before {
            position: absolute;
            content: '';
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
          }

          input:checked + .toggle-slider {
            background-color: var(--color-primary, #6c5ce7);
          }

          input:checked + .toggle-slider:before {
            transform: translateX(24px);
          }

          .preference-options {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-left: 1rem;
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 6px;
            transition: background-color 0.2s;
          }

          .checkbox-label:hover {
            background-color: #f8fafc;
          }

          .checkbox-label input[type='checkbox'] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--color-primary, #6c5ce7);
          }

          .checkbox-label span {
            color: #475569;
            font-size: 0.938rem;
          }

          .error-message {
            color: #dc2626;
            font-size: 0.875rem;
            padding: 0.75rem;
            background: #fee2e2;
            border-radius: 6px;
            margin: 1rem 0;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e2e8f0;
          }

          .outline-button,
          .primary-button {
            padding: 0.625rem 1.5rem;
            border-radius: 8px;
            font-size: 0.938rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .outline-button {
            background: white;
            border: 1px solid #cbd5e1;
            color: #475569;
          }

          .outline-button:hover:not(:disabled) {
            border-color: #94a3b8;
            background-color: #f8fafc;
          }

          .primary-button {
            background-color: var(--color-primary, #6c5ce7);
            color: white;
            border: none;
          }

          .primary-button:hover:not(:disabled) {
            background-color: var(--color-primary-dark, #5b4bc9);
          }

          .outline-button:disabled,
          .primary-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}
