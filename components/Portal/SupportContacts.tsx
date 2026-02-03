import type { SupportContact } from '@/data/portal';

type SupportContactsProps = {
  contacts: SupportContact[];
};

export default function SupportContacts({ contacts }: SupportContactsProps) {
  return (
    <section className="section section--muted">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Need help?</h2>
          <p style={{ color: 'var(--color-muted)' }}>
            Reach the Next Level Management team through the channel that works best for you.
          </p>
        </div>
        <div className="contacts-grid">
          {contacts.length === 0 ? (
            <div className="contact-empty">
              <h3>No support contacts listed</h3>
              <p>Email us and we will connect you with the right team.</p>
              <a className="outline-button" href="mailto:support@nxtlevelrentals.com">
                Contact support
              </a>
            </div>
          ) : (
            contacts.map((contact) => (
              <article key={contact.id} className="contact-card">
                <span className="tag tag--info">{contact.department}</span>
                <h3>{contact.contactName}</h3>
                <dl>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Hours</dt>
                    <dd>{contact.hours}</dd>
                  </div>
                  <div>
                    <dt>Preferred channel</dt>
                    <dd>{contact.preferredChannel}</dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      </div>
      <style jsx>{`
        .contacts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .contact-card {
          padding: 1.75rem;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          border: 1px solid rgba(15, 118, 110, 0.12);
          box-shadow: var(--shadow-sm);
          display: grid;
          gap: 1rem;
        }

        .contact-card h3 {
          margin: 0;
          color: var(--color-text);
        }

        dl {
          margin: 0;
          display: grid;
          gap: 0.75rem;
        }

        dt {
          font-size: 0.85rem;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        dd {
          margin: 0.15rem 0 0;
          font-weight: 600;
          color: var(--color-text);
        }

        a {
          color: var(--color-primary);
        }

        .contact-empty {
          grid-column: 1 / -1;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
          padding: 2rem;
          display: grid;
          gap: 0.75rem;
          color: var(--color-muted);
        }

        .contact-empty h3 {
          margin: 0;
          color: var(--color-text);
        }

        .contact-empty .outline-button {
          justify-self: flex-start;
        }
      `}</style>
    </section>
  );
}
