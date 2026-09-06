import { useState } from 'react';
import { company, faq } from '@/data/site';

export default function AboutFaqSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="about" id="faq" aria-labelledby="aboutHeading">
      <div className="about__inner">
        <div className="about__story">
          <p className="section-eyebrow">Who you are renting from</p>
          <h2 id="aboutHeading">A small, local team. You will know us by name.</h2>
          <div className="about__photo" role="img" aria-label="Photo of the Next Level Rentals team coming soon">
            <span>Team photo</span>
          </div>
          <p>
            {company.name} is owner-operated and based right here in {company.city}. We manage a small number of
            homes on purpose, so when you call or text you reach a person who knows your house, not a call center.
          </p>
          <dl className="about__contact">
            <div>
              <dt>
                {company.streetAddress}
              </dt>
              <dd>
                {company.city}, {company.state} {company.postalCode}
              </dd>
            </div>
            <div>
              <dt>
                <a href={`tel:${company.phoneTel}`}>{company.phoneDisplay}</a>
              </dt>
              <dd>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </dd>
            </div>
          </dl>
        </div>

        <div className="about__faq">
          <p className="section-eyebrow">Common questions</p>
          <div className="faq-list">
            {faq.map((item, index) => {
              const open = openIndex === index;
              return (
                <div className={`faq-item${open ? ' faq-item--open' : ''}`} key={item.question}>
                  <button
                    type="button"
                    className="faq-item__toggle"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-toggle-${index}`}
                    onClick={() => setOpenIndex(open ? -1 : index)}
                  >
                    <span>{item.question}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      {open ? <path d="M5 12h14" /> : (
                        <>
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </>
                      )}
                    </svg>
                  </button>
                  <div className="faq-item__panel" id={`faq-panel-${index}`} role="region" aria-labelledby={`faq-toggle-${index}`} hidden={!open}>
                    <p>{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .about {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem;
          background: var(--color-background);
          border-top: 1px solid var(--color-border);
          scroll-margin-top: var(--header-height);
        }

        .about__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
          gap: clamp(2.5rem, 5vw, 4rem);
          align-items: start;
        }

        .about__story {
          display: grid;
          gap: 1.25rem;
        }

        .about__story h2 {
          font-size: clamp(1.8rem, 3.5vw, 2.25rem);
          line-height: 1.15;
          color: var(--color-text);
        }

        .about__story > p {
          color: var(--color-muted);
          line-height: 1.7;
        }

        .about__photo {
          height: 240px;
          border-radius: var(--radius-lg);
          background: linear-gradient(160deg, var(--color-surface-elevated), var(--color-surface));
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-muted);
          font-size: 0.9rem;
        }

        .about__contact {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem 2rem;
          margin: 0;
          font-size: 0.9rem;
          color: var(--color-muted);
        }

        .about__contact dt {
          font-weight: 700;
          color: var(--color-text);
        }

        .about__contact dt a {
          color: var(--color-text);
        }

        .about__contact dd {
          margin: 0.15rem 0 0;
        }

        .about__contact dd a {
          color: var(--color-muted);
        }

        .about__contact dd a:hover,
        .about__contact dt a:hover {
          color: var(--color-primary);
        }

        .about__faq {
          display: grid;
          gap: 1.25rem;
          align-content: start;
        }

        .faq-list {
          display: grid;
          gap: 0.6rem;
        }

        .faq-item {
          border-radius: var(--radius-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          transition: border-color var(--transition-fast);
        }

        .faq-item--open {
          border-color: rgba(124, 192, 255, 0.35);
        }

        .faq-item__toggle {
          width: 100%;
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.4rem;
          background: none;
          border: none;
          color: var(--color-text);
          font-weight: 600;
          font-size: 1rem;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
        }

        .faq-item__toggle svg {
          flex: none;
          color: var(--color-muted);
        }

        .faq-item--open .faq-item__toggle svg {
          color: var(--color-primary);
        }

        .faq-item__panel {
          padding: 0 1.4rem 1.1rem;
        }

        .faq-item__panel p {
          color: var(--color-muted);
          line-height: 1.65;
          font-size: 0.95rem;
        }

        @media (max-width: 960px) {
          .about__inner {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
