import type { PaymentRecord } from '@/data/portal';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

type PaymentHistoryProps = {
  payments: PaymentRecord[];
};

const statusTagClass = {
  Paid: 'tag tag--success',
  Processing: 'tag tag--info',
  Failed: 'tag tag--warning'
} satisfies Record<PaymentRecord['status'], string>;

export default function PaymentHistory({ payments }: PaymentHistoryProps) {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Rent & payment history</h2>
            <span className="tag tag--neutral">Stripe secure billing</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Method</th>
                <th scope="col">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>
                    <span className={statusTagClass[payment.status]}>{payment.status}</span>
                  </td>
                  <td>{payment.method}</td>
                  <td>
                    <a href={payment.receiptUrl ?? '#'} className="site-header__link">
                      View receipt
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
