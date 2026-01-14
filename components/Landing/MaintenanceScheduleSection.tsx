const maintenanceItems = [
  {
    title: 'HVAC filter replacements',
    window: 'Building-wide · July 22 – July 24',
    description: 'Technicians will replace air filters in all units. Please leave the mechanical closet accessible between 9 AM and 4 PM.',
    preparation: ['Secure pets in a separate room', 'Clear a 3 ft. path to the HVAC closet', 'Note thermostat issues in the portal']
  },
  {
    title: 'Quarterly property review',
    window: 'Scheduled by appointment · July 29 – August 2',
    description:
      'A quick walk-through with your resident experience team to ensure appliances, safety devices, and fixtures are in peak condition.',
    preparation: ['Choose a preferred time slot in the portal', 'List any minor repairs you would like addressed', 'Expect visit to last 20 minutes']
  },
  {
    title: 'Community amenity refresh',
    window: 'Pool & fitness center · August 5 – August 7',
    description:
      'Seasonal deep cleaning, equipment tune-ups, and fresh towels. Amenities will reopen daily at 4 PM with updated capacity limits.',
    preparation: ['Check temporary schedules posted in the lobby', 'Access alternate workout passes provided to residents', 'Contact support for ADA accommodations']
  }
];

export default function MaintenanceScheduleSection() {
  return (
    <section className="maintenance" id="maintenance-schedule" aria-labelledby="maintenanceHeading">
      <div className="maintenance__inner">
        <div className="maintenance__header">
          <p className="section-eyebrow">Routine upkeep</p>
          <h2 id="maintenanceHeading">Upcoming maintenance and property care</h2>
          <p>
            We publish a rolling 60-day maintenance calendar so you know who is coming by and how to prepare. Update your
            contact preferences to receive reminders 48 hours before scheduled visits.
          </p>
        </div>
        <ol className="maintenance__timeline">
          {maintenanceItems.map((item) => (
            <li key={item.title} className="maintenance__item">
              <div className="maintenance__item-header">
                <h3>{item.title}</h3>
                <span>{item.window}</span>
              </div>
              <p className="maintenance__item-description">{item.description}</p>
              <ul className="maintenance__prep-list">
                {item.preparation.map((prep) => (
                  <li key={prep}>{prep}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
      <style jsx>{`
        .maintenance {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem;
          background: var(--color-surface);
        }

        .maintenance__inner {
          max-width: 1080px;
          margin: 0 auto;
          display: grid;
          gap: clamp(2rem, 6vw, 3rem);
        }

        .maintenance__header {
          max-width: 640px;
        }

        .maintenance__header h2 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          color: #0f172a;
          margin-bottom: 0.75rem;
        }

        .maintenance__header p {
          color: rgba(15, 23, 42, 0.68);
          line-height: 1.7;
        }

        .maintenance__timeline {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 2rem;
          position: relative;
        }

        .maintenance__timeline::before {
          content: '';
          position: absolute;
          left: 18px;
          top: 0.5rem;
          bottom: 0.5rem;
          width: 2px;
          background: rgba(99, 102, 241, 0.25);
        }

        .maintenance__item {
          position: relative;
          padding-left: 3.5rem;
        }

        .maintenance__item::before {
          content: '';
          position: absolute;
          left: 10px;
          top: 0.35rem;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.18);
        }

        .maintenance__item-header {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem 1.5rem;
          align-items: center;
        }

        .maintenance__item-header h3 {
          font-size: 1.2rem;
          color: #1e293b;
        }

        .maintenance__item-header span {
          font-weight: 600;
          color: rgba(79, 70, 229, 0.9);
        }

        .maintenance__item-description {
          margin: 0.75rem 0 1rem;
          color: rgba(15, 23, 42, 0.7);
          line-height: 1.6;
        }

        .maintenance__prep-list {
          margin: 0;
          padding-left: 1.2rem;
          display: grid;
          gap: 0.5rem;
          color: rgba(15, 23, 42, 0.68);
        }

        .maintenance__prep-list li {
          list-style: disc;
        }

        @media (max-width: 640px) {
          .maintenance__timeline::before {
            left: 12px;
          }

          .maintenance__item {
            padding-left: 2.75rem;
          }

          .maintenance__item::before {
            left: 4px;
          }
        }
      `}</style>
    </section>
  );
}
