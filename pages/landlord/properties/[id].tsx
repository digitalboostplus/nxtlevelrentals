import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import PrivateFile from '@/components/common/PrivateFile';
import { useLandlordData } from '@/hooks/useLandlordData';
import { ownerStatement } from '@/lib/ownerFinancials';
import { formatLocalDate, normalizeDate } from '@/lib/date';
import { formatMoney, formatPropertyAddress, isOpenRequest } from '@/lib/console-home';
import type { NextPageWithAuth } from '../../_app';

const statusTag: Record<string, string> = {
  submitted: 'tag--warning',
  in_progress: 'tag--info',
  completed: 'tag--success',
  cancelled: 'tag--neutral',
};

const paymentTag = (status: string) => (['paid', 'completed', 'succeeded'].includes(status) ? 'tag--success' : ['failed', 'cancelled', 'refunded'].includes(status) ? 'tag--error' : 'tag--warning');

const LandlordPropertyDetailPage: NextPageWithAuth = () => {
  const router = useRouter();
  const propertyId = typeof router.query.id === 'string' ? router.query.id : '';
  const { properties, leases, maintenanceRequests, payments, ledger, expenses, loading, error, refresh } = useLandlordData(propertyId || undefined);

  const property = properties.find((p) => p.id === propertyId) || null;
  const activeLeases = leases.filter((lease) => lease.isActive && lease.status === 'active');
  const openRequests = maintenanceRequests.filter(isOpenRequest);
  const statement = ownerStatement(ledger, expenses, 'all-time');

  if (error) {
    return (
      <LandlordLayout title="Property unavailable">
        <div className="owner-page">
          <div className="owner-alert" role="alert">
            {error}{' '}
            <button type="button" className="owner-small-button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        </div>
      </LandlordLayout>
    );
  }

  if (loading) {
    return (
      <LandlordLayout title="Property details">
        <div className="owner-page">
          <LoadingState message="Loading property details..." />
        </div>
      </LandlordLayout>
    );
  }

  if (!property) {
    return (
      <LandlordLayout title="Property not found">
        <div className="owner-page">
          <div className="owner-card">
            <h2>Property not found</h2>
            <p className="owner-empty">The requested property does not exist or is not linked to your account.</p>
            <Link href="/landlord/properties" className="outline-button" style={{ justifySelf: 'start' }}>
              Back to my properties
            </Link>
          </div>
        </div>
      </LandlordLayout>
    );
  }

  const rent = activeLeases.reduce((sum, lease) => sum + (lease.monthlyRent || lease.rentAmount || 0), 0) || property.defaultRentAmount || property.rent || 0;
  const deposit = activeLeases.reduce((sum, lease) => sum + (lease.securityDeposit || lease.depositAmount || 0), 0);
  const leaseEnd = activeLeases
    .map((lease) => normalizeDate(lease.endDate))
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const leased = activeLeases.length > 0 || property.status === 'occupied';
  const specs = [
    ['Bedrooms', property.bedrooms ? String(property.bedrooms) : 'Studio'],
    ['Bathrooms', property.bathrooms ? String(property.bathrooms) : '—'],
    ['Square feet', property.squareFeet ? property.squareFeet.toLocaleString() : '—'],
    ['Status', leased ? 'Leased' : 'Vacant'],
  ];
  const sortedPayments = [...payments].sort((a, b) => (normalizeDate(b.paidAt ?? b.dueDate)?.getTime() ?? 0) - (normalizeDate(a.paidAt ?? a.dueDate)?.getTime() ?? 0));

  return (
    <LandlordLayout title={property.name}>
      <Head>
        <title>{property.name} - Owner Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>{property.name}</h1>
            <p className="owner-page__sub">
              {formatPropertyAddress(property.address)}
              {property.bedrooms ? ` · ${property.bedrooms} bd` : ''}
              {property.bathrooms ? ` · ${property.bathrooms} ba` : ''}
              {property.squareFeet ? ` · ${property.squareFeet.toLocaleString()} sqft` : ''}
              {leased ? ` · Leased${activeLeases[0]?.tenantName ? ` to ${activeLeases.length > 1 ? `${activeLeases.length} tenants` : activeLeases[0].tenantName}` : ''}` : ' · Vacant'}
            </p>
          </div>
          <div className="owner-page__actions">
            <Link href={`/landlord/expenses?propertyId=${property.id}`} className="outline-button">
              Log expense
            </Link>
            <Link href="/landlord/financials" className="primary-button">
              View statements
            </Link>
          </div>
        </div>

        {property.images && property.images.length > 0 ? (
          <div className="detail__gallery">
            {property.images.slice(0, 4).map((url, index) => (
              <div key={url} className="detail__gallery-item">
                <Image src={url} alt={`${property.name} photo ${index + 1}`} fill sizes="25vw" style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        ) : null}

        <div className="owner-page__stats">
          <div className="stat-card">
            <div className="stat-card__label">Monthly rent</div>
            <div className="stat-card__value">{rent ? formatMoney(rent) : '—'}</div>
            <div className="stat-card__meta">{activeLeases[0] ? `Due on day ${activeLeases[0].paymentDueDay || 1}${activeLeases[0].lateFeeGraceDays ? ` · ${activeLeases[0].lateFeeGraceDays} day grace` : ''}` : leased ? 'Lease terms not on file' : 'Target rent while vacant'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Lease ends</div>
            <div className="stat-card__value">{leaseEnd ? formatLocalDate(leaseEnd, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
            <div className="stat-card__meta">{leaseEnd ? `${Math.max(0, Math.round((leaseEnd.getTime() - Date.now()) / 86400000))} days left` : 'No active lease'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Deposit held</div>
            <div className="stat-card__value">{deposit ? formatMoney(deposit) : '—'}</div>
            <div className="stat-card__meta">{deposit ? 'Per the lease on file' : 'Not recorded'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">All-time net</div>
            <div className="stat-card__value">{formatMoney(statement.net)}</div>
            <div className="stat-card__meta">{formatMoney(statement.rent)} rent · {formatMoney(statement.totalExpenses)} paid expenses</div>
          </div>
        </div>

        <div className="owner-page__grid">
          <div className="owner-page__stack">
            <div className="owner-card">
              <h2>{activeLeases.length > 1 ? 'Current leases' : 'Current lease'}</h2>
              {activeLeases.length === 0 ? (
                <p className="owner-empty">No active lease is recorded for this property. Management records new leases when a resident is placed.</p>
              ) : (
                activeLeases.map((lease) => (
                  <div key={lease.id} className="owner-kv">
                    {activeLeases.length > 1 ? (
                      <div>
                        <span>Unit</span>
                        <span>{lease.unit || 'Unit'}</span>
                      </div>
                    ) : null}
                    <div>
                      <span>Tenant</span>
                      <span>{lease.tenantName || 'Resident'}</span>
                    </div>
                    <div>
                      <span>Term</span>
                      <span>
                        {formatLocalDate(lease.startDate, { month: 'short', day: 'numeric', year: 'numeric' })} to {formatLocalDate(lease.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <span>Rent</span>
                      <span>
                        {formatMoney(lease.monthlyRent || lease.rentAmount || 0)} due on day {lease.paymentDueDay || 1}
                      </span>
                    </div>
                    <div>
                      <span>Grace period</span>
                      <span>
                        {lease.lateFeeGraceDays ?? lease.lateFeeConfig?.gracePeriodDays ?? 0} days
                        {lease.lateFeeAmount ? `, then ${formatMoney(lease.lateFeeAmount)} late fee` : ''}
                      </span>
                    </div>
                    <div>
                      <span>Deposit</span>
                      <span>{formatMoney(lease.securityDeposit || lease.depositAmount || 0)} held</span>
                    </div>
                    {(lease.fileIds?.length || lease.documents?.length) ? (
                      <div>
                        <span>Lease document</span>
                        <span className="detail__files">
                          {lease.fileIds?.map((id) => (
                            <PrivateFile key={id} id={id} />
                          ))}
                          {lease.documents?.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                              Signed lease (PDF)
                            </a>
                          ))}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="owner-card">
              <div className="owner-card__head">
                <h2>Rent collection history</h2>
                <Link href="/landlord/financials">Open financials</Link>
              </div>
              {sortedPayments.length === 0 ? (
                <p className="owner-empty">No rent receipts are recorded for this property yet.</p>
              ) : (
                <div className="table-wrapper owner-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Description</th>
                        <th scope="col">Method</th>
                        <th scope="col">Status</th>
                        <th scope="col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPayments.slice(0, 12).map((payment) => (
                        <tr key={payment.id}>
                          <th scope="row">{formatLocalDate(payment.paidAt ?? payment.dueDate, { month: 'short', day: 'numeric', year: 'numeric' }) || 'Not recorded'}</th>
                          <td>{payment.description || 'Rent payment'}</td>
                          <td>{payment.paymentMethod ? payment.paymentMethod.replace('_', ' ') : 'Not recorded'}</td>
                          <td>
                            <span className={`tag ${paymentTag(String(payment.status))}`}>{String(payment.status)}</span>
                          </td>
                          <td>{formatMoney(payment.amount, { cents: true })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sortedPayments.length > 12 ? <div className="owner-table__foot">Showing 12 of {sortedPayments.length}</div> : null}
                </div>
              )}
            </div>
          </div>

          <div className="owner-page__stack">
            <div className="owner-card">
              <div className="owner-card__head">
                <h2>Open maintenance</h2>
                <Link href="/landlord/maintenance">All maintenance</Link>
              </div>
              {openRequests.length === 0 ? (
                <p className="owner-empty">Nothing open. Completed tickets are listed under Maintenance.</p>
              ) : (
                <ul className="owner-list">
                  {openRequests.map((request) => (
                    <li key={request.id}>
                      <div className="owner-list__text">
                        <strong>{request.title}</strong>
                        <span>
                          {[
                            request.assignedVendorName,
                            request.scheduledDate ? `${formatLocalDate(request.scheduledDate, { weekday: 'short', month: 'short', day: 'numeric' })}${request.scheduledTime ? ` ${request.scheduledTime}` : ''}` : '',
                            request.estimatedCost ? `Estimate ${formatMoney(request.estimatedCost)}` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'Received, not yet scheduled'}
                        </span>
                      </div>
                      <span className={`tag ${statusTag[request.status] || 'tag--neutral'}`}>{request.status.replace('_', ' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="owner-card">
              <h2>Property details</h2>
              <div className="detail__specs">
                {specs.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              {property.description ? <p className="owner-note">{property.description}</p> : null}
              {property.amenities && property.amenities.length > 0 ? (
                <div className="detail__chips">
                  {property.amenities.map((item) => (
                    <span key={item} className="tag tag--neutral">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .detail__gallery {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .detail__gallery-item {
          position: relative;
          height: 160px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }

        .detail__files {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          align-items: flex-end;
        }

        .detail__specs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .detail__specs > div {
          display: grid;
          gap: 0.1rem;
        }

        .detail__specs span {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-muted);
        }

        .detail__specs strong {
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .detail__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        @media (max-width: 900px) {
          .detail__gallery {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </LandlordLayout>
  );
};

LandlordPropertyDetailPage.requireAuth = true;
LandlordPropertyDetailPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordPropertyDetailPage;
