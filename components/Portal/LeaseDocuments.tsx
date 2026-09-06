import UploadFiles from '@/components/common/UploadFiles';
import PrivateFile from '@/components/common/PrivateFile';
import { useState } from 'react';
import type { LeaseDocument } from '@/data/portal';
import type { Lease, RentersInsuranceInfo } from '@/types/schema';
import { formatLocalDate } from '@/lib/date';
import { useAuth } from '@/context/AuthContext';
import { company } from '@/data/site';

type LeaseDocumentsProps = {
  documents: LeaseDocument[];
  lease?: Lease | null;
  rentersInsurance?: RentersInsuranceInfo | null;
  onInsuranceUpdated?: () => void;
};

export default function LeaseDocuments({
  documents,
  lease,
  rentersInsurance: initialInsurance,
  onInsuranceUpdated
}: LeaseDocumentsProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [provider, setProvider] = useState(initialInsurance?.provider || profile?.rentersInsurance?.provider || '');
  const [policyNumber, setPolicyNumber] = useState(initialInsurance?.policyNumber || profile?.rentersInsurance?.policyNumber || '');
  const [expirationDate, setExpirationDate] = useState(initialInsurance?.expirationDate || profile?.rentersInsurance?.expirationDate || '');
  const [fileIds, setFileIds] = useState<string[]>(initialInsurance?.fileIds || profile?.rentersInsurance?.fileIds || []);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savingInsurance, setSavingInsurance] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeInsurance = initialInsurance || profile?.rentersInsurance;

  const handleSaveInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingInsurance(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/tenant/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rentersInsurance: {
            provider,
            policyNumber,
            expirationDate,
            verified: false, fileIds
          }
        })
      });

      if (!res.ok) throw new Error('Failed to update renters insurance');

      await refreshProfile();
      if (onInsuranceUpdated) onInsuranceUpdated();
      setSaveSuccess(true);
      setTimeout(() => {
        setShowInsuranceModal(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save insurance');
    } finally {
      setSavingInsurance(false);
    }
  };

  const formatLeaseDate = (val: any) => {
    if (!val) return 'N/A';
    if (val.toDate) return formatLocalDate(val.toDate().toISOString());
    return formatLocalDate(val);
  };

  return (
    <section className="section section--muted" id="documents">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card__title">Lease & Legal Documents</h2>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>Review executed lease agreements, community addenda, and insurance compliance.</p>
          </div>
          <span className="tag tag--neutral">Secure Cloud Vault</span>
        </div>

        {/* Active Lease Overview Card */}
        {lease && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem 2rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <span className="tag tag--success" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  {lease.status} Lease
                </span>
                <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.25rem' }}>Active Residential Lease</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Monthly Commitment</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  ${(lease.monthlyRent ?? lease.rentAmount ?? 0).toLocaleString()}<span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--color-muted)' }}>/mo</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', display: 'block' }}>Lease Period</span>
                <strong style={{ fontSize: '0.95rem' }}>
                  {formatLeaseDate(lease.startDate)} – {formatLeaseDate(lease.endDate)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', display: 'block' }}>Security Deposit Held</span>
                <strong style={{ fontSize: '0.95rem' }}>${(lease.securityDeposit ?? lease.depositAmount ?? 0).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', display: 'block' }}>Grace Period</span>
                <strong style={{ fontSize: '0.95rem' }}>{lease.lateFeeGraceDays ?? lease.lateFeeConfig?.gracePeriodDays ?? 5} Days</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', display: 'block' }}>Late Fee Penalty</span>
                <strong style={{ fontSize: '0.95rem' }}>
                  {lease.lateFeeAmount ? `$${lease.lateFeeAmount}` : lease.lateFeeConfig ? `$${lease.lateFeeConfig.feeAmount}` : '$50 flat fee'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {lease?.fileIds?.map(id => <PrivateFile key={id} id={id} />)}
        {activeInsurance?.fileIds?.map(id => <PrivateFile key={id} id={id} />)}
        {/* Insurance Banner */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: activeInsurance?.provider ? 'var(--tag-success-bg)' : 'var(--tag-warning-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}>
              🛡️
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Renter&apos;s Insurance Policy</h4>
              {activeInsurance?.provider ? (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  Submitted for review: <strong>{activeInsurance.provider}</strong> (Policy #{activeInsurance.policyNumber}) • Exp: {activeInsurance.expirationDate}
                </p>
              ) : (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  No insurance policy recorded. Check your signed lease for coverage requirements.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="outline-button"
            onClick={() => setShowInsuranceModal(true)}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            {activeInsurance?.provider ? 'Update Policy' : 'Upload Insurance'}
          </button>
        </div>

        {/* Documents list */}
        <div className="documents-grid">
          {documents.length === 0 && !lease?.fileIds?.length ? (
            <div className="documents-empty">
              <h3>No documents uploaded yet</h3>
              <p>Request a copy of your lease or onboarding documents from the management team.</p>
              <a className="outline-button" href={`mailto:${company.email}`}>
                Request documents
              </a>
            </div>
          ) : (
            documents.map((document) => (
              <div className="document-row" key={document.id}>
                <div className="document-row__info">
                  <span className="document-row__title">📄 {document.title}</span>
                  <span className="document-row__meta">Updated {formatLocalDate(document.updatedOn)}</span>
                </div>
                <a className="outline-button" href={document.downloadUrl} target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </div>
            ))
          )}
        </div>

        {/* Insurance Update Modal */}
        {showInsuranceModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-background)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Update Renter&apos;s Insurance</h3>
                <button
                  type="button"
                  onClick={() => setShowInsuranceModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveInsurance} style={{ display: 'grid', gap: '1rem' }}>
                <UploadFiles kind="insurance" ids={fileIds} onChange={setFileIds} onBusy={setUploading} />
                {saveError && <p role="alert">{saveError}</p>}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Insurance Carrier / Provider
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lemonade, State Farm, GEICO"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Policy Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. POL-8938291"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                {saveSuccess && (
                  <div style={{ color: 'var(--color-success, #10b981)', fontSize: '0.9rem', fontWeight: 600 }}>
                    ✓ Insurance policy saved for review!
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => setShowInsuranceModal(false)}
                    disabled={savingInsurance || uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={savingInsurance || uploading}
                  >
                    {savingInsurance ? 'Saving...' : 'Save Policy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .documents-empty {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
          padding: 2rem;
          display: grid;
          gap: 0.75rem;
          color: var(--color-muted);
        }

        .documents-empty h3 {
          margin: 0;
          color: var(--color-text);
        }

        .documents-empty .outline-button {
          justify-self: flex-start;
        }

        .document-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: 0.75rem;
        }

        .document-row__info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .document-row__title {
          font-weight: 600;
          color: var(--color-text);
        }

        .document-row__meta {
          font-size: 0.85rem;
          color: var(--color-muted);
        }
      `}</style>
    </section>
  );
}
