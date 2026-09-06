import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/Admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from '../_app';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting to send',
  retry: 'Scheduled for retry',
  sent: 'Sent',
  failed: 'Failed (needs investigation)',
  skipped: 'Skipped',
};

const Operations: NextPageWithAuth = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    if (!user) return;
    const res = await fetch('/api/admin/run-operations', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    if (!res.ok) throw new Error('Unable to load job counts');
    setCounts((await res.json()).counts);
  }, [user]);
  useEffect(() => { void refresh().catch(e => setMessage(e.message)); }, [refresh]);
  const run = async (cleanup: boolean) => {
    if (!user) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/run-operations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ cleanup }) });
      if (!res.ok) throw new Error('Operations did not complete; inspect server logs');
      const data = await res.json();
      setMessage(`Sent: ${data.notifications.sent}; skipped: ${data.notifications.skipped}; retry: ${data.notifications.retry}; failed: ${data.notifications.failed}. Old staged uploads: ${data.cleanup.candidates}; deleted: ${data.cleanup.deleted}; cleanup failures: ${data.cleanup.failed}.`);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Operations failed');
    } finally {
      setBusy(false);
    }
  };
  const entries = Object.entries(counts);
  return (
    <AdminLayout title="Delivery and upload operations">
      <Head>
        <title>Operations - Admin</title>
      </Head>
      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Admin · Operations</p>
            <h1>Delivery and upload operations</h1>
            <p className="owner-page__sub">
              Each run processes up to 25 due notification deliveries. Failed deliveries stop after eight attempts and need a look. External delivery is not guaranteed to be exactly once.
            </p>
          </div>
        </div>

        <div className="owner-page__grid">
          <section className="owner-card">
            <div className="owner-card__head"><h2>Run a batch</h2></div>
            <p className="owner-note">The first option sends due notifications and only reports which staged uploads would be cleaned. The second also deletes uploads abandoned for seven days.</p>
            <div className="owner-page__chips">
              <button type="button" className="primary-button" disabled={busy} onClick={() => void run(false)}>
                {busy ? 'Running...' : 'Process notifications and preview cleanup'}
              </button>
              <button type="button" className="outline-button" disabled={busy} onClick={() => void run(true)}>
                Process and delete abandoned uploads
              </button>
            </div>
            {message ? <p className="owner-note" role="status">{message}</p> : <p role="status" className="owner-note" />}
          </section>

          <section className="owner-card">
            <div className="owner-card__head">
              <h2>Notification queue</h2>
              <button type="button" className="owner-small-button" onClick={() => void refresh().catch(e => setMessage(e.message))}>Refresh</button>
            </div>
            {entries.length ? (
              <div className="owner-kv">
                {entries.map(([status, count]) => (
                  <div key={status}><span>{STATUS_LABELS[status] || status}</span><span>{count}</span></div>
                ))}
              </div>
            ) : (
              <p className="owner-empty">Nothing is queued.</p>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};
Operations.requireAuth = true;
Operations.allowedRoles = ['admin', 'super-admin'];
export default Operations;
