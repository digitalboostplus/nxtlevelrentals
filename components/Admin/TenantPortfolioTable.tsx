import type { TenantSummary } from '@/data/admin';

type TenantPortfolioTableProps = {
  tenants: TenantSummary[];
};

export default function TenantPortfolioTable({ tenants }: TenantPortfolioTableProps) {
  return (
    <section className="section section--muted">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Tenant portfolio</h2>
          <p style={{ color: 'var(--color-muted)' }}>Monitor balances, lease timelines, and autopay adoption.</p>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Resident</th>
                <th scope="col">Unit</th>
                <th scope="col">Lease end</th>
                <th scope="col">Balance</th>
                <th scope="col">AutoPay</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <th scope="row">{tenant.name}</th>
                  <td>{tenant.unit}</td>
                  <td>{new Date(tenant.leaseEnd).toLocaleDateString()}</td>
                  <td>{tenant.balance === 0 ? 'Paid' : `$${tenant.balance.toFixed(2)}`}</td>
                  <td>
                    <span className={`tag ${tenant.autopay ? 'tag--success' : 'tag--warning'}`}>
                      {tenant.autopay ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style jsx>{`
        .table-wrapper {
          overflow-x: auto;
          border-radius: var(--radius-md);
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 1.15rem 1.35rem;
          text-align: left;
        }

        thead tr {
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        tbody tr + tr {
          border-top: 1px solid rgba(15, 23, 42, 0.06);
        }

        th {
          font-size: 0.85rem;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        tbody th {
          color: #111827;
          font-size: 1rem;
          text-transform: none;
          letter-spacing: normal;
        }
      `}</style>
    </section>
  );
}
