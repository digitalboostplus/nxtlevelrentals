import type { Announcement, MessageThread } from '@/data/portal';

type CommunicationHubProps = {
  announcements: Announcement[];
  messages: MessageThread[];
};

export default function CommunicationHub({ announcements, messages }: CommunicationHubProps) {
  return (
    <section className="section" id="communications">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '2rem' }}>
          <h2 className="card__title">Communications</h2>
          <span className="tag tag--info">Stay informed</span>
        </div>
        <div className="communication-grid">
          <div>
            <h3 className="card__title" style={{ marginBottom: '1rem' }}>
              Direct messages
            </h3>
            <div className="documents-grid">
              {messages.length === 0 ? (
                <div className="empty-card">
                  <h4>No messages yet</h4>
                  <p>Reach out to your property manager if you need help.</p>
                  <a className="outline-button" href="mailto:support@nxtlevelrentals.com">
                    Send a message
                  </a>
                </div>
              ) : (
                messages.map((message) => (
                  <article className="message-card" key={message.id}>
                    <div className="message-card__header">
                      <div className="message-card__sender">{message.from}</div>
                      {message.unread ? <span className="tag tag--info">Unread</span> : null}
                    </div>
                    <p className="message-card__snippet">{message.snippet}</p>
                    <p className="message-card__timestamp">
                      {new Date(message.sentAt).toLocaleString()}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="card__title" style={{ marginBottom: '1rem' }}>
              Community announcements
            </h3>
            <div className="documents-grid">
              {announcements.length === 0 ? (
                <div className="empty-card">
                  <h4>No announcements today</h4>
                  <p>Check back soon for community updates and event invites.</p>
                </div>
              ) : (
                announcements.map((announcement) => (
                  <article className="announcement-card" key={announcement.id}>
                    <div className="announcement-card__title">{announcement.title}</div>
                    <p>{announcement.content}</p>
                    <p className="announcement-card__timestamp">
                      Posted {new Date(announcement.postedOn).toLocaleDateString()}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .message-card__timestamp,
        .announcement-card__timestamp {
          margin-top: 0.75rem;
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .empty-card {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
          padding: 1.75rem;
          display: grid;
          gap: 0.75rem;
          color: var(--color-muted);
        }

        .empty-card h4 {
          margin: 0;
          color: var(--color-text);
        }

        .empty-card .outline-button {
          justify-self: flex-start;
        }
      `}</style>
    </section>
  );
}
