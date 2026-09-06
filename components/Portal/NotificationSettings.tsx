import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_PREFERENCES, notificationEvents } from '@/lib/notificationPreferences';

const CHANNELS = [
  { key: 'email', label: 'Email', hint: 'Sent to the address on your account.' },
  { key: 'push', label: 'Push', hint: 'Browser or phone notifications when you allow them.' },
  { key: 'inApp', label: 'In-app', hint: 'Shown inside the portal.' },
] as const;

export default function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: 'center' }); }, [error]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/notifications/preferences', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        if (!res.ok) throw new Error('Could not load notification preferences');
        const data = await res.json();
        if (active) { setPrefs({ email: data.preferences.email, push: data.preferences.push, inApp: data.preferences.inApp }); setLoading(false); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Load failed'); }
    })();
    return () => { active = false; };
  }, [user, attempt]);
  const save = async () => {
    if (!user) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const res = await fetch('/api/notifications/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(prefs) });
      if (!res.ok) throw new Error('Preferences were not saved. Please retry.');
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); } finally { setSaving(false); }
  };
  return (
    <div className="prefs">
      <div className="prefs__head">
        <h2>Maintenance notifications</h2>
        <p className="owner-note">Choose which maintenance events you receive. Rent reminders and community announcements are not automated yet.</p>
      </div>
      {error && (
        <p ref={errorRef} role="alert" className="owner-alert">
          {error}
          {loading && <button type="button" className="owner-small-button" onClick={() => { setError(''); setAttempt(attempt + 1); }}>Retry loading</button>}
        </p>
      )}
      {saved && <p role="status" className="prefs__saved">Preferences saved.</p>}
      <fieldset disabled={loading || saving} className="prefs__all">
        {CHANNELS.map(({ key, label, hint }) => (
          <fieldset key={key} className="prefs__channel">
            <legend>{label}</legend>
            <p className="owner-note">{hint}</p>
            <div className="prefs__options">
              {Object.entries(prefs[key]).map(([event, enabled]) => (
                <label key={event} className="owner-check">
                  <input
                    type="checkbox"
                    checked={!!enabled}
                    onChange={e => { setSaved(false); setPrefs({ ...prefs, [key]: { ...prefs[key], [event]: e.target.checked } }); }}
                  />
                  <span>{event === 'enabled' ? 'Enable channel' : notificationEvents[event as keyof typeof notificationEvents]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="owner-form__actions prefs__actions">
          <button type="button" className="primary-button" onClick={save}>{saving ? 'Saving...' : 'Save preferences'}</button>
        </div>
      </fieldset>
    </div>
  );
}
