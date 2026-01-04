import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/stripe-client';
import { adminUtils } from '@/lib/firebase-utils';

type RecordPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedTenantId?: string;
};

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedTenantId,
}: RecordPaymentModalProps) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState(preselectedTenantId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check'>('cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [description, setDescription] = useState('Rent Payment');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTenants();
    }
  }, [isOpen]);

  const fetchTenants = async () => {
    try {
      const allTenants = await adminUtils.getAllTenants();
      setTenants(allTenants);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setError('Failed to load tenants');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      const selectedTenant = tenants.find((t) => t.id === tenantId);
      const propertyId = selectedTenant?.propertyIds?.[0] || 'unknown';

      const response = await fetch('/api/admin/record-manual-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId,
          propertyId,
          amount: parseFloat(amount),
          paymentMethod,
          checkNumber: paymentMethod === 'check' ? checkNumber : undefined,
          description,
          paymentDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to record payment');
      }

      // Reset form
      setTenantId(preselectedTenantId || '');
      setAmount('');
      setCheckNumber('');
      setDescription('Rent Payment');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Record Manual Payment</h2>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="form-group">
            <label htmlFor="tenant">Tenant *</label>
            <select
              id="tenant"
              required
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={!!preselectedTenantId}
            >
              <option value="">Select Tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.displayName} ({tenant.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount *</label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="paymentMethod">Payment Method *</label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as 'cash' | 'check')
              }
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
            </select>
          </div>

          {paymentMethod === 'check' && (
            <div className="form-group">
              <label htmlFor="checkNumber">Check Number</label>
              <input
                id="checkNumber"
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="e.g., 1234"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="paymentDate">Payment Date *</label>
            <input
              id="paymentDate"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <input
              id="description"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Rent Payment - January 2026"
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="outline-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>

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
          padding: 2rem;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .modal__header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--color-muted);
          padding: 0;
        }

        .close-button:hover {
          color: var(--color-text);
        }

        .modal__form {
          display: grid;
          gap: 1rem;
        }

        .form-group {
          display: grid;
          gap: 0.5rem;
        }

        label {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-text);
        }

        input,
        select {
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 1rem;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
        }

        input:disabled,
        select:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.9rem;
          padding: 0.75rem;
          background: #fee2e2;
          border-radius: 6px;
          margin: 0;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
}
