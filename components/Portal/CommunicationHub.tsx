import type { Announcement, MessageThread } from '@/data/portal';

type CommunicationHubProps = {
  announcements: Announcement[];
  messages: MessageThread[];
};

export default function CommunicationHub({ announcements, messages }: CommunicationHubProps) {
  return (
    <section className="section">
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
              {messages.map((message) => (
                <article className="message-card" key={message.id}>
                  <div className="message-card__header">
                    <div className="message-card__sender">{message.from}</div>
                    {message.unread ? <span className="tag tag--info">Unread</span> : null}
                  </div>
                  <p className="message-card__snippet">{message.snippet}</p>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    {new Date(message.sentAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div>
            <h3 className="card__title" style={{ marginBottom: '1rem' }}>
              Community announcements
            </h3>
            <div className="documents-grid">
              {announcements.map((announcement) => (
                <article className="announcement-card" key={announcement.id}>
                  <div className="announcement-card__title">{announcement.title}</div>
                  <p>{announcement.content}</p>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Posted {new Date(announcement.postedOn).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
