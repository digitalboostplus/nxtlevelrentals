import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import { useLandlordData } from '@/hooks/useLandlordData';
import { formatLocalDate, normalizeDate } from '@/lib/date';
import { formatMoney, formatPropertyAddress, isOpenRequest } from '@/lib/console-home';
import type { Lease, Property } from '@/types/schema';
import type { NextPageWithAuth } from '../../_app';

type Filter = 'all' | 'attention' | 'leased' | 'vacant';

const LandlordPropertiesPage: NextPageWithAuth = () => {
  const { properties, leases, maintenanceRequests, loading, error, refresh } = useLandlordData();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const active = leases.filter((lease) => lease.isActive && lease.status === 'active');
    return properties
      .filter((property) => !property.archived)
      .map((property) => {
        const propertyLeases = active.filter((lease) => lease.propertyId === property.id);
        const leased = propertyLeases.length > 0 || property.status === 'occupied';
        const rent = propertyLeases.reduce((sum, lease) => sum + (lease.monthlyRent || lease.rentAmount || 0), 0) || property.defaultRentAmount || property.rent || 0;
        const leaseEnd = propertyLeases
          .map((lease: Lease) => normalizeDate(lease.endDate))
          .filter((d): d is Date => Boolean(d))
          .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
        const openWork = maintenanceRequests.filter((request) => request.propertyId === property.id && isOpenRequest(request)).length;
        const tenant = propertyLeases.length > 1 ? `${propertyLeases.length} tenants` : propertyLeases[0]?.tenantName || (leased ? 'Tenant' : 'Vacant');
        return { property, leased, rent, leaseEnd, openWork, tenant, attention: !leased || openWork > 0 };
      });
  }, [properties, leases, maintenanceRequests]);

  const counts = {
    all: rows.length,
    attention: rows.filter((r) => r.attention).length,
    leased: rows.filter((r) => r.leased).length,
    vacant: rows.filter((r) => !r.leased).length,
  };

  const visible = rows.filter((row) => {
    if (filter === 'attention' && !row.attention) return false;
    if (filter === 'leased' && !row.leased) return false;
    if (filter === 'vacant' && row.leased) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (row.property.name || '').toLowerCase().includes(q) || formatPropertyAddress(row.property.address).toLowerCase().includes(q);
  });

  const expected = rows.filter((r) => r.leased).reduce((sum, r) => sum + r.rent, 0);

  return (
    <LandlordLayout title="My Properties">
      <Head>
        <title>My properties - Owner Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>My properties</h1>
            <p className="owner-page__sub">
              {rows.length} home{rows.length === 1 ? '' : 's'} · {counts.leased} leased · {counts.vacant} vacant
              {expected > 0 ? ` · ${formatMoney(expected)} expected this month` : ''}
            </p>
          </div>
          <div className="owner-page__actions">
            <Link href="/landlord/financials" className="outline-button">
              Download rent roll
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading your properties..." />
        ) : error ? (
          <div className="owner-alert" role="alert">
            {error}{' '}
            <button type="button" className="owner-small-button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="properties__filters">
              <div className="owner-page__chips" role="tablist" aria-label="Filter properties">
                {(
                  [
                    ['all', `All ${counts.all}`],
                    ['attention', `Needs attention ${counts.attention}`],
                    ['leased', `Leased ${counts.leased}`],
                    ['vacant', `Vacant ${counts.vacant}`],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    className={`filter-chip${filter === key ? ' filter-chip--active' : ''}`}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="search"
                className="owner-select properties__search"
                placeholder="Search by name or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search properties"
              />
            </div>

            {visible.length === 0 ? (
              <div className="owner-card">
                <p className="owner-empty">{rows.length === 0 ? 'No properties are linked to your account yet.' : 'No properties match this filter.'}</p>
              </div>
            ) : (
              <div className="properties__grid">
                {visible.map(({ property, leased, rent, leaseEnd, openWork, tenant }) => (
                  <article key={property.id} className="property-tile">
                    <div className="owner-photo">
                      {property.images?.[0] ? (
                        <Image src={property.images[0]} alt={property.name} fill sizes="(max-width: 1100px) 50vw, 33vw" style={{ objectFit: 'cover' }} />
                      ) : (
                        <span>No photo yet</span>
                      )}
                    </div>
                    <div className="property-tile__body">
                      <div className="property-tile__title">
                        <div>
                          <h3>{property.name || formatPropertyAddress(property.address)}</h3>
                          <span>{tenant}</span>
                        </div>
                        <span className={`tag ${leased ? (openWork > 0 ? 'tag--info' : 'tag--success') : 'tag--neutral'}`}>
                          {leased ? (openWork > 0 ? `${openWork} open` : 'Leased') : 'Vacant'}
                        </span>
                      </div>
                      <dl className="property-tile__facts">
                        <div>
                          <dt>Rent</dt>
                          <dd>{rent ? `${formatMoney(rent)}${leased ? '' : ' target'}` : '—'}</dd>
                        </div>
                        <div>
                          <dt>Lease ends</dt>
                          <dd>{leaseEnd ? formatLocalDate(leaseEnd, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</dd>
                        </div>
                        <div>
                          <dt>Open work</dt>
                          <dd>{openWork > 0 ? `${openWork} open` : 'None'}</dd>
                        </div>
                      </dl>
                      <Link href={`/landlord/properties/${property.id}`} className="property-tile__link">
                        View property
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .properties__filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .properties__search {
          min-width: 260px;
        }

        .properties__grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .property-tile {
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          transition: transform var(--transition-base), box-shadow var(--transition-base);
        }

        .property-tile:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .property-tile__body {
          padding: 1.25rem 1.4rem 1.4rem;
          display: grid;
          gap: 0.75rem;
        }

        .property-tile__title {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .property-tile__title h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }

        .property-tile__title span:not(.tag) {
          font-size: 0.9rem;
          color: var(--color-muted);
        }

        .property-tile__facts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin: 0;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border);
        }

        .property-tile__facts dt {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-muted);
        }

        .property-tile__facts dd {
          margin: 0.1rem 0 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .property-tile :global(.property-tile__link) {
          justify-self: start;
          font-size: 0.9rem;
          font-weight: 600;
        }

        @media (max-width: 1100px) {
          .properties__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .properties__grid {
            grid-template-columns: 1fr;
          }

          .properties__search {
            width: 100%;
          }
        }
      `}</style>
    </LandlordLayout>
  );
};

LandlordPropertiesPage.requireAuth = true;
LandlordPropertiesPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordPropertiesPage;
