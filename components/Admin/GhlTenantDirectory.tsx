import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { DirectoryPreview } from '@/lib/ghlTenantDirectory';

type Entry = { id: string; name: string; email: string | null; propertyName?: string; status: string; hasPortalAccount: boolean; warnings?: string[]; linkedUserUid?: string | null; legacyUserIds?: string[] };
export default function GhlTenantDirectory({ onRepresented }: { onRepresented: (ids: string[]) => void }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [legacy, setLegacy] = useState<Entry[]>([]);
  const [preview, setPreview] = useState<DirectoryPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const request = useCallback(async (body?: unknown) => {
    if (!user) throw new Error('Sign in to manage the directory');
    const res = await fetch('/api/admin/import-tenants', { method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Directory request failed');
    return data;
  }, [user]);
  const load = useCallback(async () => {
    const data = await request();
    setEntries(data.entries); setLegacy(data.legacy);
    onRepresented([...data.entries.flatMap((e: any) => e.legacyUserIds || []), ...data.legacy.map((e: Entry) => e.id)]);
  }, [request, onRepresented]);
  useEffect(() => {
    if (!user) return;
    let disposed = false;
    request().then(data => {
      if (disposed) return;
      setEntries(data.entries); setLegacy(data.legacy);
      onRepresented([...data.entries.flatMap((e: any) => e.legacyUserIds || []), ...data.legacy.map((e: Entry) => e.id)]);
    }).catch(e => { if (!disposed) setError(e.message); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [user, request, onRepresented]);
  async function createPreview() {
    setBusy(true); setError(''); setMessage(''); setPreview(null); setSelected([]);
    try { setPreview(await request({ action: 'preview' })); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!preview) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await request({ action: 'apply', previewId: preview.previewId, contactIds: selected });
      const applied = data.results.filter((r: any) => r.status === 'applied').map((r: any) => r.contactId);
      setPreview(current => current ? { ...current, appliedContactIds: Array.from(new Set([...current.appliedContactIds, ...applied])) } : null);
      setSelected([]); setMessage(`Applied ${applied.length} directory changes. No login accounts were created.`);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="ghl-directory-title">
    <h2 id="ghl-directory-title">GHL tenant directory</h2>
    <p>Active tag · Tenant relationship · Occupied property. Directory membership does not create portal access.</p>
    <button type="button" className="outline-button" disabled={busy || loading} onClick={createPreview}>{busy ? 'Working…' : 'Preview GHL changes'}</button>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {loading ? <p>Loading directory…</p> : !entries.length && <p>No reviewed directory imports yet.</p>}
    {!!entries.length && <div className="table-wrapper"><table className="table" aria-label="GHL tenant directory">
      <thead><tr><th>Name</th><th>Email</th><th>Property</th><th>Membership</th><th>Portal account</th><th>Needs attention</th></tr></thead>
      <tbody>{entries.map(entry => <tr key={entry.id}><td>{entry.linkedUserUid || entry.legacyUserIds?.length === 1 ? <Link href={`/admin/tenants/${entry.linkedUserUid || entry.legacyUserIds![0]}`}>{entry.name}</Link> : entry.name}</td><td>{entry.email || 'Missing email'}</td><td>{entry.propertyName}</td><td>{entry.status}</td><td>{entry.hasPortalAccount ? 'Linked account' : 'Not created'}</td><td>{entry.warnings?.join('; ') || '—'}</td></tr>)}</tbody>
    </table></div>}
    {!!legacy.length && <details><summary>{legacy.length} legacy imports awaiting review</summary><ul>{legacy.map(entry => <li key={entry.id}><Link href={`/admin/tenants/${entry.id}`}>{entry.name}</Link> — {entry.status}; {entry.hasPortalAccount ? 'portal account exists' : 'no portal account'}</li>)}</ul></details>}
    {preview && <div>
      <h3>Review proposed changes</h3>
      <p>{Object.entries(preview.counts).map(([key, count]) => `${count} ${key}`).join(' · ')}. Expires {new Date(preview.expiresAt).toLocaleTimeString()}.</p>
      <p>Missing email or an unchecked lease agreement is a warning. Conflicts must be resolved before importing.</p>
      <button type="button" className="outline-button" disabled={busy} onClick={() => setSelected(preview.rows.filter(r => ['create', 'update', 'deactivate'].includes(r.action) && !preview.appliedContactIds.includes(r.contactId)).slice(0, 200).map(r => r.contactId))}>Select available changes (up to 200)</button>
      <div className="table-wrapper"><table className="table" aria-label="GHL import preview">
        <thead><tr><th>Select</th><th>Name</th><th>Email</th><th>Property</th><th>Change</th><th>Details</th></tr></thead>
        <tbody>{preview.rows.map(row => {
          const applied = preview.appliedContactIds.includes(row.contactId);
          const enabled = ['create', 'update', 'deactivate'].includes(row.action) && !applied;
          return <tr key={row.contactId}><td><input type="checkbox" aria-label={`Import ${row.name}`} checked={selected.includes(row.contactId)} disabled={!enabled || busy} onChange={event => setSelected(ids => event.target.checked ? [...ids, row.contactId] : ids.filter(id => id !== row.contactId))} /></td><td>{row.name}</td><td>{row.email || 'Missing email'}</td><td>{row.propertyName || 'Unmatched'}</td><td>{applied ? 'Applied' : row.action}</td><td>{[...row.reasons, ...row.warnings].join('; ') || 'Ready'}</td></tr>;
        })}</tbody>
      </table></div>
      <button type="button" className="primary-button" disabled={busy || !selected.length || selected.length > 200} onClick={apply}>Apply {selected.length} selected changes</button>
    </div>}
    <style jsx>{`section { min-width: 0; margin-bottom: 2.5rem; } h2 { margin-top: 1rem; } p, details { margin: 1rem 0; } button { margin: .5rem .5rem .5rem 0; } input { width: 1.2rem; height: 1.2rem; } td { vertical-align: top; } [role=alert] { color: var(--color-danger, #fca5a5); }`}</style>
  </section>;
}
