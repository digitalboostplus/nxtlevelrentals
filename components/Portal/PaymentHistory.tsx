import type { Payment } from '@/types/schema';

import { formatLocalDate } from '@/lib/date';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);

type PaymentHistoryProps = {
  payments: Payment[];
};

// Map backend types to frontend display
const getStatusConfig = (status: Payment['status']) => {
  switch (status) {
    case 'succeeded':
      return { label: 'Paid', className: 'tag tag--success' };
    case 'processing':
    case 'pending':
      return { label: 'Processing', className: 'tag tag--info' };
    case 'failed':
      return { label: 'Failed', className: 'tag tag--warning' };
    case 'refunded':
      return { label: 'Refunded', className: 'tag tag--neutral' };
    default:
      return { label: status, className: 'tag tag--neutral' };
  }
};

const getMethodLabel = (payment: Payment) => {
  // Payment method ID or type might be all we have initially
  if (payment.type === 'deposit') return 'Security Deposit';
  // Ideally we'd look up the method details, but for now we fallback
  return payment.paymentMethodId ? 'Card/Bank' : 'Manual Entry';
};

export default function PaymentHistory({ payments }: PaymentHistoryProps) {
  return (
    <section className="section" id="payments">
      <div className="section__inner">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Rent & payment history</h2>
            <span className="tag tag--neutral">Stripe secure billing</span>
          </div>
          <div className="table-wrapper" role="region" aria-label="Payment history table">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Method</th>
                  {/* <th scope="col">Receipt</th> - Receipt URL needs to be optional */}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                      No payment history yet. Recent payments can take a few minutes to appear.
                    </td>
                  </tr>
                ) : null}
                {payments.map((payment) => {
                  const statusConfig = getStatusConfig(payment.status);
                  const date = payment.paidAt || payment.dueDate;
                  // If paid, show paid date, else due date
                  return (
                    <tr key={payment.id}>
                      <td>{date ? formatLocalDate(date instanceof Date ? date.toISOString() : date as any, { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={statusConfig.className}>{statusConfig.label}</span>
                      </td>
                      <td>{getMethodLabel(payment)}</td>
                      {/* <td>
                      <a href={'#'} className="site-header__link">
                        View receipt
                      </a>
                    </td> */}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
