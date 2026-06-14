import Link from 'next/link';

// Local prop type (kept independent of the server-only properties-public helper
// so this client component never pulls firebase-admin into the browser bundle).
export type LandingProperty = {
  id: string;
  name: string;
  address: string;
  description: string;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rent: number;
};

type Props = {
  properties: LandingProperty[];
};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80';

function formatRent(rent: number): string {
  if (!rent) return 'Contact for pricing';
  return `$${rent.toLocaleString()}/mo`;
}

export default function FeaturedPropertiesSection({ properties }: Props) {
  // Nothing to show (e.g. before the first GHL sync) — render nothing.
  if (!properties || properties.length === 0) return null;

  return (
    <section className="featured-properties" id="properties" aria-labelledby="featuredPropertiesHeading">
      <div className="featured-properties__inner">
        <div className="featured-properties__header">
          <p className="section-eyebrow">Available now</p>
          <h2 id="featuredPropertiesHeading">Explore our available rentals</h2>
          <p>
            Browse current openings managed by Next Level Rentals. Found a place you love? Sign in or reach out to start
            your application.
          </p>
        </div>

        <div className="featured-properties__grid" role="list">
          {properties.map((property) => (
            <article className="property-card" key={property.id} role="listitem">
              <div className="property-card__image">
                {/* Plain img keeps arbitrary GHL/Storage image hosts working without next/image config. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={property.images?.[0] || PLACEHOLDER_IMAGE} alt={property.name} loading="lazy" />
              </div>
              <div className="property-card__body">
                <h3>{property.name}</h3>
                {property.address && <p className="property-card__address">{property.address}</p>}
                <div className="property-card__details">
                  {property.bedrooms > 0 && <span>{property.bedrooms} Bed</span>}
                  {property.bathrooms > 0 && <span>{property.bathrooms} Bath</span>}
                  {property.squareFeet > 0 && <span>{property.squareFeet.toLocaleString()} SqFt</span>}
                </div>
                {property.description && (
                  <p className="property-card__description">{property.description}</p>
                )}
                <div className="property-card__footer">
                  <span className="property-card__rent">{formatRent(property.rent)}</span>
                  <Link href="/login" className="property-card__cta">
                    Inquire
                    <span aria-hidden="true">&gt;</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        .featured-properties {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem;
          background: var(--color-surface);
        }

        .featured-properties__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          gap: clamp(2rem, 6vw, 3rem);
        }

        .featured-properties__header {
          max-width: 640px;
        }

        .featured-properties__header h2 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          color: var(--color-text);
          margin-bottom: 0.75rem;
        }

        .featured-properties__header p {
          color: var(--color-muted);
          line-height: 1.7;
        }

        .featured-properties__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .property-card {
          background: var(--color-surface-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(15, 118, 110, 0.12);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease;
        }

        .property-card:hover {
          transform: translateY(-4px);
        }

        .property-card__image {
          height: 200px;
          background: var(--color-surface);
        }

        .property-card__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .property-card__body {
          padding: 1.5rem;
          display: grid;
          gap: 0.5rem;
          flex: 1;
        }

        .property-card__body h3 {
          font-size: 1.2rem;
          color: var(--color-text);
          margin: 0;
        }

        .property-card__address {
          font-size: 0.875rem;
          color: var(--color-muted);
          margin: 0;
        }

        .property-card__details {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
          color: var(--color-muted);
          margin: 0.25rem 0;
        }

        .property-card__description {
          color: var(--color-muted);
          line-height: 1.6;
          font-size: 0.9rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .property-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid rgba(15, 118, 110, 0.12);
        }

        .property-card__rent {
          font-weight: 700;
          color: var(--color-text);
          font-size: 1.1rem;
        }

        .property-card__cta {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        .property-card__cta span {
          transition: transform 0.2s ease;
        }

        .property-card__cta:hover span,
        .property-card__cta:focus span {
          transform: translateX(4px);
        }
      `}</style>
    </section>
  );
}
