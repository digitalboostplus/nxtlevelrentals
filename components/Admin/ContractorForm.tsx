import { useEffect, useState, type FormEvent } from 'react';
import { TRADES, TRADE_LABELS, type Contractor, type ContractorInput, type Trade } from '@/types/contractors';
import { normalizePhoneE164 } from '@/lib/phone';

type Props = {
  contractor?: Contractor | null;
  saving: boolean;
  error: string;
  onSave: (input: ContractorInput) => void;
  onClose: () => void;
};

/** Add or edit a contractor. Mobile is stored as +1…; consent gates voicemail and calls. */
export default function ContractorForm({ contractor, saving, error, onSave, onClose }: Props) {
  const [name, setName] = useState(contractor?.name || '');
  const [company, setCompany] = useState(contractor?.company || '');
  const [trades, setTrades] = useState<Trade[]>(contractor?.trades || []);
  const [phone, setPhone] = useState(contractor?.phone || '');
  const [email, setEmail] = useState(contractor?.email || '');
  const [notes, setNotes] = useState(contractor?.notes || '');
  const [status, setStatus] = useState<'approved' | 'inactive'>(contractor?.status || 'approved');
  const [consent, setConsent] = useState(Boolean(contractor?.consentAt));
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleTrade = (trade: Trade) =>
    setTrades((current) => (current.includes(trade) ? current.filter((t) => t !== trade) : [...current, trade]));

  const normalized = normalizePhoneE164(phone);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!name.trim()) return setLocalError('Name is required.');
    if (!trades.length) return setLocalError('Pick at least one trade.');
    if (!normalized) return setLocalError('Enter a valid mobile number.');
    onSave({ name, company, trades, phone: normalized, email, notes, status, consent });
  };

  const message = localError || error;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="contractor-form-title" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2 id="contractor-form-title">{contractor ? 'Edit contractor' : 'Add contractor'}</h2>
          <button className="close-button" onClick={onClose} type="button" aria-label="Close">×</button>
        </header>

        <form onSubmit={submit} className="modal__form">
          <div className="owner-form">
            <label className="owner-field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus /></label>
            <label className="owner-field"><span>Company</span><input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} /></label>
            <label className="owner-field">
              <span>Mobile</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(816) 555-0100" required />
              <small className="contractor-form__hint">{normalized ? `Saved as ${normalized}` : 'Saved as +1 and ten digits'}</small>
            </label>
            <label className="owner-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} /></label>
            <fieldset className="owner-field owner-field--wide contractor-form__trades">
              <legend>Trades</legend>
              <div className="contractor-form__trade-grid">
                {TRADES.map((trade) => (
                  <label key={trade} className="owner-check">
                    <input type="checkbox" checked={trades.includes(trade)} onChange={() => toggleTrade(trade)} />
                    <span>{TRADE_LABELS[trade]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="owner-field owner-field--wide"><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Service area, rates, after-hours availability" /></label>
            <label className="owner-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'approved' | 'inactive')}>
                <option value="approved">Approved</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="owner-check contractor-form__consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Has agreed to automated texts and voicemail from NXT Level Mgmt</span>
            </label>
          </div>

          {message ? <p className="error-message" role="alert">{message}</p> : null}

          <div className="owner-form__actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving...' : contractor ? 'Save changes' : 'Add contractor'}</button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .modal {
          background: var(--color-surface);
          padding: 2rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          width: 100%;
          max-width: 640px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        }
        .modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .modal__header h2 {
          margin: 0;
          font-size: 1.35rem;
        }
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          color: var(--color-muted);
          cursor: pointer;
        }
        .modal__form {
          display: grid;
          gap: 1.25rem;
        }
        .contractor-form__hint {
          font-size: 0.8rem;
          color: var(--color-muted);
        }
        .contractor-form__trades {
          border: 0;
          padding: 0;
          margin: 0;
        }
        .contractor-form__trades legend {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text);
          padding: 0;
          margin-bottom: 0.4rem;
        }
        .contractor-form__trade-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0 1rem;
        }
        .contractor-form__consent {
          align-self: end;
        }
        .error-message {
          margin: 0;
          color: var(--tag-error-text);
          font-size: 0.9rem;
        }
        @media (max-width: 640px) {
          .modal {
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
