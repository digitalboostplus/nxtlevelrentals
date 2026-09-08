import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/Admin/AdminLayout';
import ContractorForm from '@/components/Admin/ContractorForm';
import { useAuth } from '@/context/AuthContext';
import { formatPhoneDisplay } from '@/lib/phone';
import { TRADES, TRADE_LABELS, type Contractor, type ContractorCommsConfigured, type ContractorInput, type Trade } from '@/types/contractors';
import type { NextPageWithAuth } from '../../_app';

type StatusFilter = 'approved' | 'inactive';

const Contractors: NextPageWithAuth = () => {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [configured, setConfigured] = useState<ContractorCommsConfigured | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [trade, setTrade] = useState<Trade | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('approved');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Contractor | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');

  const authed = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!user) throw new Error('Sign in again to continue.');
    const token = await user.getIdToken();
    const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Request failed');
    return body;
  }, [user]);

  const refresh = useCallback(async () => {
    const [list, comms] = await Promise.all([authed('/api/admin/contractors?status=all'), authed('/api/admin/contractors/settings')]);
    setContractors(list.contractors);
    setConfigured(comms.configured);
  }, [authed]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    refresh()
      .catch((e) => { if (!cancelled) setLoadError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, refresh]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return contractors.filter((c) =>
      c.status === status && (trade === 'all' || c.trades.includes(trade)) && (!needle || c.searchKey.includes(needle))
    );
  }, [contractors, status, trade, search]);

  const counts = useMemo(() => ({
    approved: contractors.filter((c) => c.status === 'approved').length,
    inactive: contractors.filter((c) => c.status === 'inactive').length,
    synced: contractors.filter((c) => c.ghlContactId).length,
    consent: contractors.filter((c) => c.consentAt).length,
  }), [contractors]);

  const save = async (input: ContractorInput) => {
    setSaving(true);
    setSaveError('');
    try {
      const path = editing ? `/api/admin/contractors/${editing.id}` : '/api/admin/contractors';
      const body = await authed(path, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(input) });
      const saved: Contractor = body.contractor;
      setContractors((current) => {
        const rest = current.filter((c) => c.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name));
      });
      setEditing(undefined);
      setNotice(saved.ghlSyncError ? `${saved.name} saved, but GoHighLevel sync failed: ${saved.ghlSyncError}` : `${saved.name} saved.`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unable to save contractor');
    } finally {
      setSaving(false);
    }
  };

  const resync = async (contractor: Contractor) => {
    setBusyId(contractor.id);
    setNotice('');
    try {
      const body = await authed(`/api/admin/contractors/${contractor.id}/resync`, { method: 'POST' });
      const saved: Contractor = body.contractor;
      setContractors((current) => current.map((c) => (c.id === saved.id ? saved : c)));
      setNotice(saved.ghlSyncError ? `Sync failed again: ${saved.ghlSyncError}` : `${saved.name} is synced to GoHighLevel.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusyId('');
    }
  };

  const actionNote = (c: Contractor): string => {
    if (!c.ghlContactId) return 'Not synced to GoHighLevel yet';
    if (!c.consentAt) return 'Text only until consent is recorded';
    return '';
  };

  return (
    <AdminLayout title="Approved contractors">
      <Head>
        <title>Contractors - Admin</title>
      </Head>
      <div className="owner-page contractors">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Admin · Contractors</p>
            <h1>Approved contractors</h1>
            <p className="owner-page__sub">
              The trades we send to our properties. Each contractor is mirrored to GoHighLevel so the office can text, drop a voicemail or connect a call from this page.
            </p>
          </div>
          <div className="owner-page__actions">
            <button type="button" className="primary-button" onClick={() => { setSaveError(''); setEditing(null); }}>Add contractor</button>
          </div>
        </div>

        <div className="owner-page__stats">
          <div className="stat-card"><div className="stat-card__label">Approved</div><div className="stat-card__value">{counts.approved}</div><div className="stat-card__meta">ready to assign</div></div>
          <div className="stat-card"><div className="stat-card__label">Inactive</div><div className="stat-card__value">{counts.inactive}</div><div className="stat-card__meta">kept for history</div></div>
          <div className="stat-card"><div className="stat-card__label">Synced to GoHighLevel</div><div className={`stat-card__value${counts.synced < contractors.length ? ' stat-card__value--warn' : ''}`}>{counts.synced}</div><div className="stat-card__meta">of {contractors.length}</div></div>
          <div className="stat-card"><div className="stat-card__label">Consent on file</div><div className="stat-card__value">{counts.consent}</div><div className="stat-card__meta">voicemail and calls allowed</div></div>
        </div>

        {configured?.dryRun ? (
          <p className="owner-note contractors__dry-run" role="status">
            GoHighLevel sending is off in this environment. Saves and messages are recorded as dry runs.
          </p>
        ) : null}
        {notice ? <p className="owner-note" role="status">{notice}</p> : null}
        {loadError ? <p className="owner-alert" role="alert">{loadError}</p> : null}

        <section className="owner-card">
          <div className="owner-card__head contractors__toolbar">
            <div className="owner-page__chips" role="group" aria-label="Filter by trade">
              <button type="button" className={`filter-chip${trade === 'all' ? ' filter-chip--active' : ''}`} onClick={() => setTrade('all')}>All trades</button>
              {TRADES.map((t) => (
                <button key={t} type="button" className={`filter-chip${trade === t ? ' filter-chip--active' : ''}`} onClick={() => setTrade(t)}>{TRADE_LABELS[t]}</button>
              ))}
            </div>
            <div className="contractors__controls">
              <div className="owner-tabs" role="group" aria-label="Status">
                <button type="button" className={`owner-tab${status === 'approved' ? ' owner-tab--active' : ''}`} onClick={() => setStatus('approved')}>Approved</button>
                <button type="button" className={`owner-tab${status === 'inactive' ? ' owner-tab--active' : ''}`} onClick={() => setStatus('inactive')}>Inactive</button>
              </div>
              <input
                type="search"
                className="contractors__search"
                placeholder="Search name, company or phone"
                aria-label="Search contractors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p className="owner-empty">Loading contractors...</p>
          ) : rows.length === 0 ? (
            <p className="owner-empty">
              {contractors.length === 0 ? 'No contractors yet. Add the first one to start texting from here.' : 'No contractors match these filters.'}
            </p>
          ) : (
            <div className="table-wrapper owner-table">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Contractor</th>
                    <th scope="col">Trades</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Consent</th>
                    <th scope="col">GoHighLevel</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const note = actionNote(c);
                    const canText = Boolean(c.ghlContactId) && c.status === 'approved';
                    return (
                      <tr key={c.id}>
                        <th scope="row">
                          {c.name}
                          {c.company ? <span className="contractors__company">{c.company}</span> : null}
                        </th>
                        <td>
                          <span className="contractors__tags">
                            {c.trades.map((t) => <span key={t} className="tag tag--neutral">{TRADE_LABELS[t]}</span>)}
                          </span>
                        </td>
                        <td>
                          <span className="owner-mono">{formatPhoneDisplay(c.phone)}</span>
                          {c.email ? <span className="contractors__email">{c.email}</span> : null}
                        </td>
                        <td>
                          {c.consentAt ? <span className="tag tag--success">On file</span> : <span className="tag tag--warning">Not recorded</span>}
                        </td>
                        <td>
                          {c.ghlSyncError ? (
                            <span className="tag tag--error" title={c.ghlSyncError}>Sync failed</span>
                          ) : c.ghlContactId ? (
                            <span className="tag tag--success">Synced</span>
                          ) : (
                            <span className="tag tag--neutral">Pending</span>
                          )}
                        </td>
                        <td>
                          <div className="contractors__actions">
                            <button type="button" className="owner-small-button owner-small-button--primary" disabled={!canText} title={note || 'Send a text'}>Text</button>
                            <button type="button" className="owner-small-button" disabled title="Voicemail drops arrive with the next update">Voicemail</button>
                            <button type="button" className="owner-small-button" disabled title="Connected calls arrive with the next update">Call</button>
                            {c.ghlSyncError || !c.ghlContactId ? (
                              <button type="button" className="owner-small-button" disabled={busyId === c.id} onClick={() => void resync(c)}>
                                {busyId === c.id ? 'Syncing...' : 'Retry sync'}
                              </button>
                            ) : null}
                            <button type="button" className="owner-small-button" onClick={() => { setSaveError(''); setEditing(c); }}>Edit</button>
                          </div>
                          {note ? <span className="contractors__note">{note}</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editing !== undefined ? (
        <ContractorForm
          key={editing?.id || 'new'}
          contractor={editing}
          saving={saving}
          error={saveError}
          onSave={(input) => void save(input)}
          onClose={() => { if (!saving) setEditing(undefined); }}
        />
      ) : null}

      <style jsx>{`
        .contractors__dry-run {
          border-left: 3px solid var(--color-primary);
        }
        .contractors__toolbar {
          flex-direction: column;
          align-items: stretch;
          gap: 1rem;
        }
        .contractors__controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .contractors__search {
          flex: 1 1 260px;
          max-width: 360px;
          min-height: 40px;
          padding: 0.5rem 0.9rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: var(--color-background);
          color: var(--color-text);
          font: inherit;
          font-size: 0.95rem;
        }
        .contractors__company,
        .contractors__email,
        .contractors__note {
          display: block;
          font-size: 0.8rem;
          font-weight: 400;
          color: var(--color-muted);
          margin-top: 0.2rem;
        }
        .contractors__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .contractors__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        @media (max-width: 900px) {
          .contractors :global(.owner-page__stats) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </AdminLayout>
  );
};

Contractors.requireAuth = true;
Contractors.allowedRoles = ['admin', 'super-admin'];

export default Contractors;
