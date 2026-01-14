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
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(37, 99, 235, 0.15));
        }

        .tenant-cta__inner {
          max-width: 960px;
          margin: 0 auto;
          background: white;
          border-radius: clamp(1.5rem, 4vw, 2.5rem);
          padding: clamp(2.5rem, 5vw, 3rem);
          box-shadow: var(--shadow-md);
          border: 1px solid rgba(59, 130, 246, 0.18);
          display: grid;
          gap: clamp(1.5rem, 4vw, 2.5rem);
        }

        .tenant-cta__content h2 {
          font-size: clamp(2rem, 4vw, 2.4rem);
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .tenant-cta__content p {
          color: rgba(15, 23, 42, 0.7);
          line-height: 1.7;
        }

        .tenant-cta__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .tenant-cta__primary {
          box-shadow: 0 18px 28px rgba(59, 130, 246, 0.25);
        }

        .tenant-cta__outline {
          border-color: rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </section>
  );
}
