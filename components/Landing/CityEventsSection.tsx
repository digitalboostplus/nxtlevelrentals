const cityEvents = [
  {
    title: 'Summer Night Market',
    date: 'July 12 - 5:00-9:30 PM',
    location: 'Riverfront Commons',
    description: 'Local artisans, live music, and food trucks. Tenants receive early-bird entry at the Next Level booth.'
  },
  {
    title: 'Outdoor Movie in the Park',
    date: 'July 20 - 8:30 PM',
    location: 'Greenline Park',
    description: 'Bring a blanket and enjoy a community screening of a family-friendly classic with complimentary popcorn.'
  },
  {
    title: 'City Wellness Day',
    date: 'August 3 - 9:00 AM - 2:00 PM',
    location: 'Civic Center Plaza',
    description: 'Free yoga, bike tune-ups, and hydration stations hosted by local partners to keep residents active.'
  }
];

export default function CityEventsSection() {
  return (
    <section className="city-events" id="city-events" aria-labelledby="cityEventsHeading">
      <div className="city-events__inner">
        <div className="city-events__header">
          <p className="section-eyebrow">Around the city</p>
          <h2 id="cityEventsHeading">Upcoming events curated for Next Level tenants</h2>
          <p>
            We partner with local organizations to bring you the best of the neighborhood. RSVP through your tenant portal to
            access resident perks, reserved seating, and giveaways.
          </p>
        </div>
        <div className="city-events__grid" role="list">
          {cityEvents.map((event) => (
            <article className="event-card" key={event.title} role="listitem">
              <header>
                <h3>{event.title}</h3>
                <p className="event-card__meta">{event.date}</p>
              </header>
              <div className="event-card__body">
                <p>{event.description}</p>
              </div>
              <footer>
                <span className="event-card__location">{event.location}</span>
                <span className="event-card__cta">RSVP in portal</span>
              </footer>
            </article>
          ))}
        </div>
      </div>
      <style jsx>{`
        .city-events {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem;
          background: var(--color-surface-elevated);
        }

        .city-events__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          gap: clamp(2rem, 6vw, 3rem);
        }

        .city-events__header {
          max-width: 640px;
        }

        .section-eyebrow {
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.28em;
          font-weight: 700;
          color: rgba(15, 118, 110, 0.7);
          margin-bottom: 0.75rem;
        }

        .city-events__header h2 {
          font-size: clamp(2rem, 4vw, 2.6rem);
          color: var(--color-text);
          margin-bottom: 0.75rem;
        }

        .city-events__header p {
          color: var(--color-muted);
          line-height: 1.7;
        }

        .city-events__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .event-card {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          display: grid;
          gap: 1rem;
          border: 1px solid rgba(15, 118, 110, 0.12);
          box-shadow: var(--shadow-sm);
        }

        .event-card h3 {
          font-size: 1.25rem;
          color: var(--color-text);
          margin-bottom: 0.35rem;
        }

        .event-card__meta {
          color: var(--color-primary);
          font-weight: 600;
        }

        .event-card__body p {
          color: var(--color-muted);
          line-height: 1.6;
        }

        .event-card footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          font-size: 0.95rem;
        }

        .event-card__location {
          color: var(--color-muted);
        }

        .event-card__cta {
          color: var(--color-primary);
          font-weight: 600;
        }
      `}</style>
    </section>
  );
}
