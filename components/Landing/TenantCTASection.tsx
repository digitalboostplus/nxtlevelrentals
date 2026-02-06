import Link from 'next/link';

export default function TenantCTASection() {
  return (
    <section className="tenant-cta" aria-labelledby="tenantCTAHeading">
      <div className="tenant-cta__inner">
        <div className="tenant-cta__content">
          <p className="section-eyebrow tenant-cta__eyebrow">Ready when you are</p>
          <h2 id="tenantCTAHeading">Log in to personalize your stay</h2>
          <p>
            Access rental documents, track maintenance visits, discover local happenings, and message your property team anytime.
            The portal keeps everything organized so you can focus on enjoying home.
          </p>
        </div>
        <div className="tenant-cta__actions">
          <Link href="/login" className="primary-button tenant-cta__primary">
            Sign in now
          </Link>
          <Link href="mailto:hello@nxtlevelrentals.com" className="outline-button tenant-cta__outline">
            Request onboarding support
          </Link>
        </div>
      </div>
      <style jsx>{`
        .tenant-cta {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem clamp(4rem, 8vw, 6rem);
          background: linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(3, 105, 161, 0.12));
        }

        .tenant-cta__inner {
          max-width: var(--max-width-narrow);
          margin: 0 auto;
          background: var(--color-surface);
          border-radius: clamp(1.5rem, 4vw, 2.5rem);
          padding: clamp(2.5rem, 5vw, 3rem);
          box-shadow: var(--shadow-md);
          border: 1px solid rgba(15, 118, 110, 0.16);
          display: grid;
          gap: clamp(1.5rem, 4vw, 2.5rem);
        }

        .tenant-cta__content h2 {
          font-size: clamp(2rem, 4vw, 2.4rem);
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .tenant-cta__content p {
          color: var(--color-muted);
          line-height: 1.7;
        }

        .tenant-cta__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .tenant-cta__primary {
          box-shadow: 0 18px 28px rgba(15, 118, 110, 0.25);
        }

        .tenant-cta__outline {
          border-color: rgba(15, 118, 110, 0.4);
        }
      `}</style>
    </section>
  );
}
