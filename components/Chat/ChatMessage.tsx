interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--assistant'} animate-fade-in`}>
      {!isUser && (
        <div className="chat-message__avatar">N</div>
      )}
      <div className="chat-message__content">
        <div className="chat-message__bubble">
          <p className="chat-message__text">{message.content}</p>
        </div>
        <span className="chat-message__time">{time}</span>
      </div>

      <style jsx>{`
        .chat-message {
          display: flex;
          gap: 8px;
          max-width: 85%;
        }

        .chat-message--user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-message--assistant {
          align-self: flex-start;
        }

        .chat-message__avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .chat-message__content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chat-message--user .chat-message__content {
          align-items: flex-end;
        }

        .chat-message__bubble {
          padding: 10px 14px;
          border-radius: 16px;
          line-height: 1.5;
        }

        .chat-message--user .chat-message__bubble {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-message--assistant .chat-message__bubble {
          background: var(--color-surface-elevated);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-bottom-left-radius: 4px;
        }

        .chat-message__text {
          margin: 0;
          font-size: 0.875rem;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .chat-message__time {
          font-size: 0.65rem;
          color: var(--color-text-secondary);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
