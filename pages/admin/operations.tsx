import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from '../_app';
const Operations: NextPageWithAuth = () => {
  const { user } = useAuth(); const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    if (!user) return;
    const res = await fetch('/api/admin/run-operations', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    if (!res.ok) throw new Error('Unable to load job counts');
    setCounts((await res.json()).counts);
  }, [user]);
  useEffect(() => { void refresh().catch(e => setMessage(e.message)); }, [refresh]);
  const run = async (cleanup: boolean) => {
    if (!user) return; setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/admin/run-operations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ cleanup }) });
      if (!res.ok) throw new Error('Operations did not complete; inspect server logs');
      const data = await res.json();
      setMessage(`Sent: ${data.notifications.sent}; skipped: ${data.notifications.skipped}; retry: ${data.notifications.retry}; failed: ${data.notifications.failed}. Old staged uploads: ${data.cleanup.candidates}; deleted: ${data.cleanup.deleted}; cleanup failures: ${data.cleanup.failed}.`);
      await refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Operations failed'); } finally { setBusy(false); }
  };
  return <AdminLayout title="Delivery and upload operations"><div style={{ padding: '2rem' }}>
    <h1>Delivery and upload operations</h1>
    <p>Each run processes up to 25 due notification deliveries. Failed deliveries stop after eight attempts and require investigation. External delivery is not guaranteed to be exactly once.</p>
    <dl>{Object.entries(counts).map(([status, count]) => <div key={status}><dt>{status}</dt><dd>{count}</dd></div>)}</dl>
    <button disabled={busy} onClick={() => void run(false)}>Process notifications and preview cleanup</button>
    <button disabled={busy} onClick={() => void run(true)}>Process notifications and delete uploads abandoned for seven days</button>
    <p role="status">{message}</p>
  </div></AdminLayout>;
};
Operations.requireAuth = true; Operations.allowedRoles = ['admin', 'super-admin'];
export default Operations;
