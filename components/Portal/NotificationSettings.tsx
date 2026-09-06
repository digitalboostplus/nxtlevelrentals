import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_PREFERENCES, notificationEvents } from '@/lib/notificationPreferences';
export default function NotificationSettings() {
  const { user } = useAuth(); const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: 'center' }); }, [error]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return; let active = true;
    void (async () => { try {
      const res = await fetch('/api/notifications/preferences', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!res.ok) throw new Error('Could not load notification preferences');
      const data = await res.json(); if (active) { setPrefs({ email: data.preferences.email, push: data.preferences.push, inApp: data.preferences.inApp }); setLoading(false); }
    } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Load failed'); } })();
    return () => { active = false; };
  }, [user, attempt]);
  const save = async () => {
    if (!user) return; setSaving(true); setSaved(false); setError('');
    try {
      const res = await fetch('/api/notifications/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(prefs) });
      if (!res.ok) throw new Error('Preferences were not saved. Please retry.'); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); } finally { setSaving(false); }
  };
  return <div><h2>Maintenance notifications</h2><p>Choose which maintenance events you receive. Rent reminders and community announcements are not automated yet.</p>
    {error && <p ref={errorRef} role="alert">{error}{loading && <button onClick={() => { setError(''); setAttempt(attempt + 1); }}>Retry loading</button>}</p>}{saved && <p role="status">Preferences saved.</p>}
    <fieldset disabled={loading || saving} style={{ border: 0 }}>
      {(['email', 'push', 'inApp'] as const).map(channel => <fieldset key={channel}><legend>{channel}</legend>
        {Object.entries(prefs[channel]).map(([event, enabled]) => <label key={event} style={{ display: 'block' }}><input type="checkbox" checked={!!enabled} onChange={e => { setSaved(false); setPrefs({ ...prefs, [channel]: { ...prefs[channel], [event]: e.target.checked } }); }} />{event === 'enabled' ? 'Enable channel' : notificationEvents[event as keyof typeof notificationEvents]}</label>)}
      </fieldset>)}
      <button type="button" onClick={save}>{saving ? 'Saving...' : 'Save preferences'}</button>
    </fieldset>
  </div>;
}
