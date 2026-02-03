import { useRef, useEffect } from 'react';
import { useChatContext } from './ChatProvider';
import { useAuth } from '@/context/AuthContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatTypingIndicator from './ChatTypingIndicator';

function MinimizeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14L18.36 18.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ChatWindow() {
  const { messages, isLoading, closeChat, minimizeChat, clearMessages } = useChatContext();
  const { role } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const roleName = role === 'admin' || role === 'super-admin' ? 'Admin' : 'Tenant';

  return (
    <div className="chat-window animate-scale-in">
      {/* Header */}
      <div className="chat-window__header">
        <div className="chat-window__header-info">
          <div className="chat-window__avatar">
            <span className="chat-window__avatar-icon">N</span>
          </div>
          <div className="chat-window__header-text">
            <h3 className="chat-window__title">Nex</h3>
            <p className="chat-window__subtitle">{roleName} Assistant</p>
          </div>
        </div>
        <div className="chat-window__header-actions">
          <button
            type="button"
            className="chat-window__action-btn"
            onClick={clearMessages}
            title="New conversation"
            aria-label="Start new conversation"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className="chat-window__action-btn"
            onClick={minimizeChat}
            title="Minimize"
            aria-label="Minimize chat"
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            className="chat-window__action-btn chat-window__action-btn--close"
            onClick={closeChat}
            title="Close"
            aria-label="Close chat"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-window__messages">
        {messages.length === 0 ? (
          <div className="chat-window__welcome">
            <div className="chat-window__welcome-avatar">N</div>
            <h4 className="chat-window__welcome-title">Hi! I&apos;m Nex</h4>
            <p className="chat-window__welcome-text">
              {role === 'admin' || role === 'super-admin'
                ? 'I can help you with portfolio analytics, tenant information, maintenance management, and more.'
                : 'I can help you check your balance, submit maintenance requests, view lease details, and more.'}
            </p>
            <div className="chat-window__suggestions">
              {role === 'admin' || role === 'super-admin' ? (
                <>
                  <button type="button" className="chat-window__suggestion">Show portfolio summary</button>
                  <button type="button" className="chat-window__suggestion">Who has overdue rent?</button>
                  <button type="button" className="chat-window__suggestion">View urgent maintenance</button>
                </>
              ) : (
                <>
                  <button type="button" className="chat-window__suggestion">Check my balance</button>
                  <button type="button" className="chat-window__suggestion">Submit maintenance request</button>
                  <button type="button" className="chat-window__suggestion">View lease details</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              message.isLoading ? (
                <ChatTypingIndicator key={message.id} />
              ) : (
                <ChatMessage key={message.id} message={message} />
              )
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput />

      <style jsx>{`
        .chat-window {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 48px);
          height: 520px;
          max-height: calc(100vh - 120px);
          background: var(--color-surface);
          border-radius: 16px;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px var(--color-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 999;
        }

        .chat-window__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
        }

        .chat-window__header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-window__avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.125rem;
        }

        .chat-window__avatar-icon {
          background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .chat-window__header-text {
          display: flex;
          flex-direction: column;
        }

        .chat-window__title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .chat-window__subtitle {
          font-size: 0.75rem;
          opacity: 0.85;
          margin: 0;
        }

        .chat-window__header-actions {
          display: flex;
          gap: 4px;
        }

        .chat-window__action-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .chat-window__action-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .chat-window__action-btn--close:hover {
          background: rgba(239, 68, 68, 0.8);
        }

        .chat-window__messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chat-window__welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          height: 100%;
        }

        .chat-window__welcome-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.28);
        }

        .chat-window__welcome-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 8px;
          color: var(--color-text);
        }

        .chat-window__welcome-text {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0 0 20px;
          line-height: 1.5;
        }

        .chat-window__suggestions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .chat-window__suggestion {
          padding: 10px 16px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .chat-window__suggestion:hover {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        /* Mobile optimization */
        @media (max-width: 640px) {
          .chat-window {
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            max-width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
