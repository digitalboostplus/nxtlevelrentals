export default function ChatTypingIndicator() {
  return (
    <div className="typing-indicator animate-fade-in">
      <div className="typing-indicator__avatar">N</div>
      <div className="typing-indicator__bubble">
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
      </div>

      <style jsx>{`
        .typing-indicator {
          display: flex;
          gap: 8px;
          align-self: flex-start;
        }

        .typing-indicator__avatar {
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

        .typing-indicator__bubble {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
        }

        .typing-indicator__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-text-secondary);
          animation: typing-bounce 1.4s ease-in-out infinite;
        }

        .typing-indicator__dot:nth-child(1) {
          animation-delay: 0s;
        }

        .typing-indicator__dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator__dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing-bounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
