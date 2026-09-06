import Link from 'next/link';
import type { ReactNode } from 'react';
import { company, emergencyPhone } from '@/data/site';
import { formatLocalDate } from '@/lib/date';
import { formatMoney, greeting, type ActivityItem, type AttentionItem, type Tone } from '@/lib/console-home';

export type HomeDocument = { id: string; title: string; updatedOn: string; downloadUrl: string };

type TenantHomeProps = {
  name: string;
  addressLine: string;
  rentAmount: number;
  currentBalance: number;
  nextDueDate: Date | null;
  daysUntilDue: number | null;
  lastPayment: { amount: number; date: Date; method?: string; receiptUrl?: string } | null;
  attention: AttentionItem[];
  activity: ActivityItem[];
  documents: HomeDocument[];
  hasRentersInsurance: boolean;
  onPayRent: () => void;
};

const methodLabel: Record<string, string> = {
  ach: 'ACH',
  bank_account: 'bank transfer',
  card: 'card',
  cash: 'cash',
  check: 'check',
};

const toneClass: Record<Tone, string> = {
  success: 'tag--success',
  warning: 'tag--warning',
  error: 'tag--error',
  info: 'tag--info',
  neutral: 'tag--neutral',
};

function WrenchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.7-6.7Z" />
      <path d="M9 15 4.5 19.5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

const attentionIcon: Record<AttentionItem['kind'], ReactNode> = {
  maintenance: <WrenchIcon />,
  lease: <FileIcon />,
  insurance: <FileIcon />,
  balance: <AlertIcon />,
};

export default function TenantHome({
  name,
  addressLine,
  rentAmount,
  currentBalance,
  nextDueDate,
  daysUntilDue,
  lastPayment,
  attention,
  activity,
  documents,
  hasRentersInsurance,
  onPayRent,
}: TenantHomeProps) {
  const emergency = emergencyPhone();
  const inGoodStanding = currentBalance <= 0;
  const amountDue = currentBalance > 0 ? currentBalance : rentAmount;
  const dueLabel = nextDueDate
    ? `Rent due ${formatLocalDate(nextDueDate, { month: 'long', day: 'numeric' })}`
    : rentAmount > 0
      ? 'Monthly rent'
      : 'Rent';
  const dueMeta =
    daysUntilDue === null
      ? null
      : daysUntilDue < 0
        ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} past due`
        : daysUntilDue === 0
          ? 'Due today'
          : `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} away`;

  const actions = [
    { label: 'Request a repair', href: '#maintenance', icon: <WrenchIcon /> },
    { label: 'Message us', href: `sms:${company.phoneTel}`, icon: <ChatIcon />, external: true },
    { label: 'Documents', href: '#documents', icon: <FileIcon /> },
    { label: 'Payment history', href: '#payments', icon: <CardIcon /> },
  ];

  return (
    <section className="home" aria-labelledby="homeHeading">
      <div className="home__inner">
        <div className="home__greeting">
          <div>
            <p className="section-eyebrow">Tenant portal</p>
            <h1 id="homeHeading">
              {greeting(new Date())}, {name}.
            </h1>
            {addressLine ? <p className="home__address">{addressLine}</p> : null}
          </div>
          <span className={`tag ${inGoodStanding ? 'tag--success' : 'tag--warning'} home__standing`}>
            {inGoodStanding ? <CheckIcon /> : <AlertIcon />}
            {inGoodStanding ? 'Your account is in good standing' : 'You have a balance due'}
          </span>
        </div>

        <div className="home__grid">
          <div className="card home__rent">
            <div className="home__rent-head">
              <span className="stat-card__label">{dueLabel}</span>
              {company.onlinePaymentsEnabled ? null : <span className="tag tag--neutral">Online payments coming soon</span>}
            </div>
            <div className="home__rent-amount">
              <span className="home__rent-value">{formatMoney(amountDue, { cents: amountDue % 1 !== 0 })}</span>
              {dueMeta ? <span className="home__rent-meta">{dueMeta}</span> : null}
            </div>
            <div className="home__rent-actions">
              <button type="button" className="primary-button" onClick={onPayRent}>
                {company.onlinePaymentsEnabled ? `Pay ${formatMoney(amountDue)}` : 'How to pay'}
              </button>
              <a className="outline-button" href="#payments">
                Payment history
              </a>
            </div>
            <div className="home__rent-foot">
              {lastPayment ? (
                <span>
                  Last payment <strong>{formatMoney(lastPayment.amount, { cents: true })}</strong> on{' '}
                  {formatLocalDate(lastPayment.date, { month: 'short', day: 'numeric' })}
                  {lastPayment.method ? ` by ${methodLabel[lastPayment.method] || lastPayment.method.replace('_', ' ')}` : ''}
                </span>
              ) : (
                <span>No payments recorded yet.</span>
              )}
              {lastPayment?.receiptUrl ? (
                <a href={lastPayment.receiptUrl} target="_blank" rel="noreferrer">
                  Receipt
                </a>
              ) : null}
            </div>
          </div>

          <div className="card home__attention">
            <h2>Needs your attention</h2>
            {attention.length === 0 ? (
              <p className="home__empty">Nothing right now. We will list repairs, lease dates, and anything due here.</p>
            ) : (
              <ul className="home__attention-list">
                {attention.map((item) => (
                  <li key={item.id}>
                    <span className={`home__attention-icon home__attention-icon--${item.tone}`} aria-hidden="true">
                      {attentionIcon[item.kind]}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.meta}</span>
                    </div>
                    <a className={`tag ${toneClass[item.tone]}`} href={item.href}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="home__actions" role="list">
          {actions.map((action) =>
            action.external ? (
              <a key={action.label} href={action.href} className="home__action" role="listitem">
                <span className="home__action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </a>
            ) : (
              <Link key={action.label} href={action.href} className="home__action" role="listitem">
                <span className="home__action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </Link>
            )
          )}
        </div>

        <div className="home__grid home__grid--bottom">
          <div className="card home__activity">
            <div className="home__card-head">
              <h2>Recent activity</h2>
              <a href="#payments">See all</a>
            </div>
            {activity.length === 0 ? (
              <p className="home__empty">Payments and repair updates will show up here.</p>
            ) : (
              <ol className="home__activity-list">
                {activity.map((item) => (
                  <li key={item.id}>
                    <span className="home__activity-date">{formatLocalDate(item.date, { month: 'short', day: 'numeric' })}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.meta ? <span>{item.meta}</span> : null}
                    </div>
                    <span className={`tag ${toneClass[item.tone]}`}>{item.tag}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="home__side">
            <div className="card">
              <div className="home__card-head">
                <h2>Documents</h2>
                <a href="#documents">All documents</a>
              </div>
              <ul className="home__docs">
                {documents.slice(0, 2).map((doc) => (
                  <li key={doc.id}>
                    <div>
                      <strong>{doc.title}</strong>
                      {doc.updatedOn ? <span>Updated {formatLocalDate(doc.updatedOn, { month: 'short', day: 'numeric', year: 'numeric' })}</span> : null}
                    </div>
                    <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </li>
                ))}
                {documents.length === 0 ? (
                  <li>
                    <div>
                      <strong>Lease agreement</strong>
                      <span>Not uploaded yet. Ask us for a copy.</span>
                    </div>
                  </li>
                ) : null}
                <li className={hasRentersInsurance ? '' : 'home__docs-missing'}>
                  <div>
                    <strong>Renters insurance</strong>
                    <span>{hasRentersInsurance ? 'On file' : 'Not on file'}</span>
                  </div>
                  <a href="#documents">{hasRentersInsurance ? 'View' : 'Upload'}</a>
                </li>
              </ul>
            </div>

            <div className="card">
              <h2>Reach us</h2>
              <div className="home__contact">
                <div>
                  <span className="stat-card__label">Call or text</span>
                  <a href={`tel:${company.phoneTel}`}>{company.phoneDisplay}</a>
                </div>
                <div>
                  <span className="stat-card__label home__contact-emergency">Emergency, any hour</span>
                  <a href={`tel:${emergency.tel}`}>{emergency.display}</a>
                </div>
              </div>
              <p className="home__contact-meta">
                <a href={`mailto:${company.email}`}>{company.email}</a>
                {company.officeHours ? ` · Office hours ${company.officeHours}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home {
          padding: calc(var(--header-height) + 3rem) 1.5rem 3rem;
          background: var(--color-background);
        }

        .home__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          gap: 1.5rem;
        }

        .home__greeting {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .home__greeting h1 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          line-height: 1.1;
          color: var(--color-text);
          margin: 0.35rem 0 0.25rem;
        }

        .home__address {
          color: var(--color-muted);
        }

        .home__standing {
          gap: 0.5rem;
          padding: 0.4rem 0.9rem;
          font-size: 0.8rem;
        }

        .home__grid {
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
          gap: 1.5rem;
          align-items: start;
        }

        .home__rent {
          display: grid;
          gap: 1.25rem;
        }

        .home__rent-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .home__rent-head :global(.stat-card__label) {
          margin: 0;
        }

        .home__rent-amount {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .home__rent-value {
          font-size: clamp(2.5rem, 5vw, 3rem);
          font-weight: 700;
          line-height: 1;
          color: var(--color-text);
        }

        .home__rent-meta {
          color: var(--color-muted);
        }

        .home__rent-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .home__rent-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
          font-size: 0.9rem;
          color: var(--color-muted);
        }

        .home__rent-foot strong {
          color: var(--color-text);
        }

        .home__rent-foot a,
        .home__card-head a,
        .home__docs a {
          color: var(--color-primary);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .home__attention h2,
        .home__activity h2,
        .home__side h2 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .home__attention {
          display: grid;
          gap: 1rem;
        }

        .home__attention-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.9rem;
        }

        .home__attention-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.9rem;
        }

        .home__attention-list li > div {
          flex: 1;
          display: grid;
          gap: 0.15rem;
          min-width: 0;
        }

        .home__attention-list strong {
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .home__attention-list span {
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .home__attention-list :global(.tag) {
          white-space: nowrap;
          flex: none;
        }

        .home__attention-icon {
          flex: none;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--tag-neutral-bg);
          color: var(--tag-neutral-text);
        }

        .home__attention-icon--info {
          background: var(--tag-info-bg);
          color: var(--tag-info-text);
        }

        .home__attention-icon--warning {
          background: var(--tag-warning-bg);
          color: var(--tag-warning-text);
        }

        .home__attention-icon--error {
          background: var(--tag-error-bg);
          color: var(--tag-error-text);
        }

        .home__empty {
          color: var(--color-muted);
          font-size: 0.95rem;
        }

        .home__actions {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }

        .home__actions :global(.home__action) {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          min-height: 64px;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-lg);
          background: var(--glass-background);
          border: 1px solid var(--glass-border);
          color: var(--color-text);
          font-weight: 600;
          font-size: 0.95rem;
          transition: transform var(--transition-base), border-color var(--transition-base);
        }

        .home__actions :global(.home__action:hover) {
          transform: translateY(-2px);
          border-color: rgba(59, 155, 255, 0.45);
          color: var(--color-text);
        }

        .home__action-icon {
          flex: none;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--color-primary-light);
          color: var(--color-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .home__card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .home__activity-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .home__activity-list li {
          display: grid;
          grid-template-columns: 72px 1fr auto;
          gap: 1rem;
          align-items: center;
          padding: 0.85rem 0;
          border-bottom: 1px solid var(--color-border);
        }

        .home__activity-list li:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .home__activity-list li > div {
          display: grid;
          gap: 0.1rem;
          min-width: 0;
        }

        .home__activity-list strong {
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .home__activity-list li > div span {
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .home__activity-date {
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .home__side {
          display: grid;
          gap: 1.5rem;
        }

        .home__docs {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.6rem;
        }

        .home__docs li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-background);
        }

        .home__docs li > div {
          display: grid;
          gap: 0.1rem;
        }

        .home__docs strong {
          font-size: 0.9rem;
          color: var(--color-text);
        }

        .home__docs li > div span {
          font-size: 0.8rem;
          color: var(--color-muted);
        }

        .home__docs-missing {
          border-style: dashed;
          border-color: rgba(59, 155, 255, 0.45);
          background: var(--color-accent-subtle);
        }

        .home__contact {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .home__contact > div {
          display: grid;
          gap: 0.15rem;
        }

        .home__contact :global(.stat-card__label) {
          margin: 0;
          font-size: 0.75rem;
        }

        .home__contact-emergency {
          color: var(--tag-error-text) !important;
        }

        .home__contact a {
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--color-text);
        }

        .home__contact a:hover,
        .home__contact-meta a:hover {
          color: var(--color-primary);
        }

        .home__contact-meta {
          margin-top: 0.9rem;
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .home__contact-meta a {
          color: var(--color-muted);
        }

        @media (max-width: 960px) {
          .home__grid {
            grid-template-columns: 1fr;
          }

          .home__actions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .home {
            padding-top: calc(var(--header-height) + 1.75rem);
          }

          .home__rent-actions .primary-button,
          .home__rent-actions .outline-button {
            width: 100%;
          }

          .home__rent-foot {
            flex-direction: column;
            align-items: flex-start;
          }

          .home__activity-list li {
            grid-template-columns: 1fr auto;
          }

          .home__activity-date {
            grid-column: 1 / -1;
          }

          .home__actions :global(.home__action) {
            flex-direction: column;
            align-items: flex-start;
            min-height: 96px;
          }
        }
      `}</style>
    </section>
  );
}
