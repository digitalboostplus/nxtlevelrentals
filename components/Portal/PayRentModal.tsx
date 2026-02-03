import { useState } from 'react';
import { getStripe, getAuthToken } from '@/lib/stripe-client';

type PayRentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  propertyId: string;
};

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function PayRentModal({
  isOpen,
  onClose,
  currentBalance,
  propertyId
}: PayRentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<'full' | 'custom'>('full');

  if (!isOpen) return null;

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const amount = selectedAmount === 'full' ? currentBalance : parseFloat(customAmount);

      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (amount > currentBalance + 1000) {
        throw new Error('Payment amount seems unusually high. Please verify.');
      }

      const token = await getAuthToken();

      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          description: 'Rent Payment',
          propertyId,
          savePaymentMethod: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error: stripeError } = await (stripe as any).redirectToCheckout({
        sessionId: data.sessionId
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Pay Rent</h2>
          <button className="close-button" onClick={onClose} type="button" aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="modal__body">
          <div className="balance-display">
            <div className="balance-label">Current Balance</div>
            <div className="balance-amount">${currentBalance.toFixed(2)}</div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="radio"
                name="amount"
                checked={selectedAmount === 'full'}
                onChange={() => setSelectedAmount('full')}
              />
              <span>Pay full amount (${currentBalance.toFixed(2)})</span>
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="radio"
                name="amount"
                checked={selectedAmount === 'custom'}
                onChange={() => setSelectedAmount('custom')}
              />
              <span>Pay custom amount</span>
            </label>
            {selectedAmount === 'custom' && (
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="custom-amount-input"
              />
            )}
          </div>

          <div className="payment-methods-notice">
            <p>Accepted payment methods:</p>
            <ul>
              <li>Credit/Debit Cards</li>
              <li>Bank Transfer (ACH)</li>
              <li>Apple Pay / Google Pay</li>
            </ul>
          </div>

          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="form-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={handlePayment} disabled={loading}>
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal {
          background: var(--color-surface);
          padding: 2rem;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: var(--shadow-lg);
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
          color: var(--color-text);
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-muted);
          padding: 0;
        }

        .close-button:hover {
          color: var(--color-text);
        }

        .modal__body {
          display: grid;
          gap: 1.5rem;
        }

        .balance-display {
          text-align: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(3, 105, 161, 0.1));
          border-radius: var(--radius-md);
          border: 1px solid rgba(15, 118, 110, 0.12);
        }

        .balance-label {
          font-size: 0.9rem;
          color: var(--color-muted);
          margin-bottom: 0.5rem;
        }

        .balance-amount {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .form-group {
          display: grid;
          gap: 0.75rem;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          color: var(--color-text);
        }

        .form-group input[type='radio'] {
          cursor: pointer;
        }

        .custom-amount-input {
          margin-top: 0.5rem;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 1rem;
          width: 100%;
          color: var(--color-text);
          background: var(--color-surface);
        }

        .custom-amount-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }

        .payment-methods-notice {
          background: var(--color-surface-elevated);
          padding: 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          border: 1px solid var(--color-border);
        }

        .payment-methods-notice p {
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          color: var(--color-text);
        }

        .payment-methods-notice ul {
          margin: 0;
          padding-left: 1.25rem;
          color: var(--color-muted);
        }

        .payment-methods-notice li {
          margin: 0.25rem 0;
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
