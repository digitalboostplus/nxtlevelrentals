import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import UploadFiles from '@/components/common/UploadFiles';
import PrivateFile from '@/components/common/PrivateFile';
import { useAuth } from '@/context/AuthContext';
import { useLandlordData } from '@/hooks/useLandlordData';
import { formatLocalDate, normalizeDate } from '@/lib/date';
import { formatMoney } from '@/lib/console-home';
import type { NextPageWithAuth } from '../_app';

const EXPENSE_TYPES = [
  { value: 'maintenance', label: 'Maintenance and repairs' },
  { value: 'utility', label: 'Utilities' },
  { value: 'insurance', label: 'Property insurance' },
  { value: 'tax', label: 'Property taxes' },
  { value: 'capital_improvement', label: 'Capital improvement' },
  { value: 'other', label: 'Other' },
];

const statusTag: Record<string, string> = {
  pending: 'tag--warning',
  approved: 'tag--info',
  paid: 'tag--success',
  reimbursed: 'tag--success',
  rejected: 'tag--error',
};

const LandlordExpensesPage: NextPageWithAuth = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { properties, expenses, loading, error, refresh } = useLandlordData();

  const [filterProperty, setFilterProperty] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending'>('all');
  const operation = useRef('');
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [propertyId, setPropertyId] = useState('');
  const [expenseType, setExpenseType] = useState('maintenance');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);

  const activeProperties = useMemo(() => properties.filter((p) => !p.archived), [properties]);

  // Preselect the property from a link like /landlord/expenses?propertyId=...
  useEffect(() => {
    const fromQuery = typeof router.query.propertyId === 'string' ? router.query.propertyId : '';
    if (fromQuery && activeProperties.some((p) => p.id === fromQuery)) {
      setPropertyId(fromQuery);
      setFilterProperty(fromQuery);
    } else if (!propertyId && activeProperties[0]) {
      setPropertyId(activeProperties[0].id);
    }
  }, [router.query.propertyId, activeProperties, propertyId]);

  const filtered = useMemo(
    () =>
      [...expenses]
        .filter((expense) => filterProperty === 'all' || expense.propertyId === filterProperty)
        .filter((expense) => statusFilter === 'all' || expense.status === 'pending')
        .sort((a, b) => (normalizeDate(b.date)?.getTime() ?? 0) - (normalizeDate(a.date)?.getTime() ?? 0)),
    [expenses, filterProperty, statusFilter]
  );
  const pendingCount = expenses.filter((expense) => expense.status === 'pending').length;
  const total = filtered.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    setSaved(null);
    if (!propertyId) return setErrorMsg('Choose the property this expense belongs to.');
    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) return setErrorMsg('Enter the amount you paid.');
    setSubmitting(true);
    try {
      operation.current ||= crypto.randomUUID();
      const response = await fetch('/api/landlord/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ operationId: operation.current, propertyId, expenseType, category: category || expenseType, vendor, amount: numericAmount, description, date, invoiceNumber, taxDeductible, fileIds }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Unable to save the expense');
      operation.current = '';
      setFileIds([]);
      setAmount('');
      setVendor('');
      setDescription('');
      setInvoiceNumber('');
      setSaved('Expense saved. Management reviews it before it posts to your statement.');
      await refresh().catch(() => setSaved('Expense saved. Refresh the page to see it in the list.'));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save the expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LandlordLayout title="Expenses & Invoices">
      <Head>
        <title>Expenses and invoices - Owner Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>Expenses and invoices</h1>
            <p className="owner-page__sub">Everything you have logged, plus repairs management billed to your account. Pending items wait on management review before they post.</p>
          </div>
          <div className="owner-page__actions">
            <button type="button" className="primary-button" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} disabled={loading || activeProperties.length === 0}>
              Log expense
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading your expenses..." />
        ) : error ? (
          <div className="owner-alert" role="alert">
            {error}{' '}
            <button type="button" className="owner-small-button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : (
          <div className="owner-page__grid">
            <div className="owner-page__stack">
              <div className="expenses__filters">
                <div className="owner-page__chips" role="tablist" aria-label="Filter expenses">
                  <button type="button" role="tab" aria-selected={statusFilter === 'all'} className={`filter-chip${statusFilter === 'all' ? ' filter-chip--active' : ''}`} onClick={() => setStatusFilter('all')}>
                    All {expenses.length}
                  </button>
                  <button type="button" role="tab" aria-selected={statusFilter === 'pending'} className={`filter-chip${statusFilter === 'pending' ? ' filter-chip--active' : ''}`} onClick={() => setStatusFilter('pending')}>
                    Pending {pendingCount}
                  </button>
                </div>
                <select className="owner-select" value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)} aria-label="Filter by property">
                  <option value="all">All properties ({properties.length})</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="owner-card">
                  <p className="owner-empty">{expenses.length === 0 ? 'No expenses recorded yet. Log the first one on the right.' : 'No expenses match this filter.'}</p>
                </div>
              ) : (
                <div className="table-wrapper owner-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Property</th>
                        <th scope="col">Category</th>
                        <th scope="col">Vendor</th>
                        <th scope="col">Description</th>
                        <th scope="col">Status</th>
                        <th scope="col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((expense) => (
                        <tr key={expense.id}>
                          <th scope="row">{formatLocalDate(expense.date, { month: 'short', day: 'numeric', year: 'numeric' }) || 'Not recorded'}</th>
                          <td>{properties.find((p) => p.id === expense.propertyId)?.name || expense.propertyName || 'Property'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{(expense.category || expense.expenseType || 'other').replace(/_/g, ' ')}</td>
                          <td>{expense.vendor || '—'}</td>
                          <td>
                            {expense.description || '—'}
                            {expense.fileIds?.length ? (
                              <span className="expenses__files">
                                {expense.fileIds.map((id) => (
                                  <PrivateFile key={id} id={id} />
                                ))}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <span className={`tag ${statusTag[expense.status] || 'tag--neutral'}`}>{expense.status}</span>
                          </td>
                          <td>{formatMoney(expense.amount || 0, { cents: true })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="owner-table__foot">
                    {filtered.length} record{filtered.length === 1 ? '' : 's'} · {formatMoney(total, { cents: true })} total
                  </div>
                </div>
              )}
            </div>

            <div className="owner-card" ref={formRef}>
              <h2>Log an expense</h2>
              {activeProperties.length === 0 ? (
                <p className="owner-empty">Expenses can be logged once a property is linked to your account.</p>
              ) : (
                <form onSubmit={handleSubmit} className="owner-form">
                  <label className="owner-field owner-field--wide">
                    <span>Property *</span>
                    <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
                      {activeProperties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="owner-field">
                    <span>Expense type *</span>
                    <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)}>
                      {EXPENSE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="owner-field">
                    <span>Category</span>
                    <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Plumbing, roofing, HVAC..." />
                  </label>
                  <label className="owner-field">
                    <span>Vendor or payee</span>
                    <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Who you paid" />
                  </label>
                  <label className="owner-field">
                    <span>Amount *</span>
                    <input type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                  </label>
                  <label className="owner-field">
                    <span>Date of expense</span>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </label>
                  <label className="owner-field">
                    <span>Invoice or receipt #</span>
                    <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional" />
                  </label>
                  <label className="owner-field owner-field--wide">
                    <span>Description or scope of work</span>
                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was done and why" required />
                  </label>
                  <div className="owner-field owner-field--wide">
                    <span>Receipt or invoice</span>
                    <UploadFiles kind="expense" propertyId={propertyId} ids={fileIds} onChange={setFileIds} onBusy={setUploading} />
                  </div>
                  <label className="owner-check owner-field--wide">
                    <input type="checkbox" checked={taxDeductible} onChange={(e) => setTaxDeductible(e.target.checked)} />
                    Tax-deductible operating expense
                  </label>
                  {errorMsg ? (
                    <p className="owner-alert owner-field--wide" role="alert">
                      {errorMsg}
                    </p>
                  ) : null}
                  {saved ? (
                    <p className="expenses__saved owner-field--wide" role="status">
                      {saved}
                    </p>
                  ) : null}
                  <div className="expenses__submit owner-field--wide">
                    <button type="submit" className="primary-button" disabled={submitting || uploading}>
                      {submitting ? 'Saving...' : 'Submit for review'}
                    </button>
                    <span className="owner-note">Management reviews before it posts to your statement.</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .expenses__filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .expenses__files {
          display: block;
          margin-top: 0.25rem;
        }

        .expenses__saved {
          margin: 0;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-md);
          background: var(--tag-success-bg);
          color: var(--color-text);
          font-size: 0.9rem;
        }

        .expenses__submit {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
      `}</style>
    </LandlordLayout>
  );
};

LandlordExpensesPage.requireAuth = true;
LandlordExpensesPage.allowedRoles = ['landlord'];

export default LandlordExpensesPage;
