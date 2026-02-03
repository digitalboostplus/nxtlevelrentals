const weatherAlerts = [
  {
    type: 'Heat Advisory',
    window: 'July 14 - 12:00 PM - 8:00 PM',
    summary: 'Temperatures expected to reach 98 F with high humidity. Portable AC units available from the leasing office.',
    actions: ['Pick up cooling kits in the lobby by 11 AM', 'Limit balcony grilling between noon and 7 PM', 'Hydration stations open all day']
  },
  {
    type: 'Afternoon Thunderstorms',
    window: 'July 18 - 3:00 PM - 7:00 PM',
    summary: 'Scattered severe storms with wind gusts up to 45 mph. Maintenance will secure outdoor furniture the evening prior.',
    actions: ['Move planters and decor indoors', 'Close windows before leaving for work', 'Expect garage entry delays around 4 PM']
  }
];

export default function WeatherAlertsSection() {
  return (
    <section className="weather-alerts" aria-labelledby="weatherAlertsHeading">
      <div className="weather-alerts__inner">
        <div className="weather-alerts__header">
          <p className="section-eyebrow">Stay weather ready</p>
          <h2 id="weatherAlertsHeading">Weather notifications tailored to your property</h2>
          <p>
            We monitor the National Weather Service and local emergency bulletins to keep you informed. Customize notification
            preferences within your tenant profile to receive SMS, email, or in-app alerts.
          </p>
        </div>
        <div className="weather-alerts__list" role="list">
          {weatherAlerts.map((alert) => (
            <article className="weather-card" key={alert.type} role="listitem">
              <header>
                <span className="weather-card__badge">{alert.type}</span>
                <p className="weather-card__window">{alert.window}</p>
              </header>
              <p className="weather-card__summary">{alert.summary}</p>
              <ul className="weather-card__actions">
                {alert.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              <p className="weather-card__footer">Update your safety contacts in the portal so household members stay looped in.</p>
            </article>
          ))}
        </div>
      </div>
      <style jsx>{`
        .weather-alerts {
          padding: clamp(3.5rem, 7vw, 5.5rem) 1.5rem;
          background: linear-gradient(160deg, rgba(15, 118, 110, 0.95), rgba(3, 105, 161, 0.9));
          color: white;
        }

        .weather-alerts__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          gap: clamp(2rem, 5vw, 3rem);
        }

        .weather-alerts__header {
          max-width: 640px;
        }

        .section-eyebrow {
          color: rgba(226, 232, 240, 0.85);
        }

        .weather-alerts__header h2 {
          font-size: clamp(2rem, 4vw, 2.6rem);
          margin-bottom: 0.75rem;
        }

        .weather-alerts__header p {
          color: rgba(226, 232, 240, 0.9);
          line-height: 1.7;
        }

        .weather-alerts__list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .weather-card {
          background: rgba(15, 23, 42, 0.45);
          border-radius: var(--radius-lg);
          padding: 1.85rem;
          display: grid;
          gap: 1.25rem;
          border: 1px solid rgba(226, 232, 240, 0.2);
          backdrop-filter: blur(8px);
          box-shadow: var(--shadow-md);
        }

        .weather-card__badge {
          display: inline-flex;
          align-items: center;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          background: rgba(248, 250, 252, 0.16);
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-size: 0.8rem;
        }

        .weather-card__window {
          margin-top: 0.5rem;
          color: rgba(226, 232, 240, 0.75);
          font-weight: 500;
        }

        .weather-card__summary {
          line-height: 1.6;
          color: rgba(226, 232, 240, 0.9);
        }

        .weather-card__actions {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.75rem;
        }

        .weather-card__actions li {
          position: relative;
          padding-left: 1.4rem;
          color: rgba(226, 232, 240, 0.85);
          line-height: 1.6;
        }

        .weather-card__actions li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.6rem;
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 999px;
          background: rgba(191, 219, 254, 0.9);
        }

        .weather-card__footer {
          font-size: 0.9rem;
          color: rgba(226, 232, 240, 0.85);
        }
      `}</style>
    </section>
  );
}
