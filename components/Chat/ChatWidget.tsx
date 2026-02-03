import { useChatContext } from './ChatProvider';
import { useAuth } from '@/context/AuthContext';
import ChatWindow from './ChatWindow';

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ChatWidget() {
  const { user, loading } = useAuth();
  const { isOpen, isMinimized, toggleChat } = useChatContext();

  // Don't show chat widget if user is not authenticated
  if (loading || !user) {
    return null;
  }

  return (
    <>
      {/* Chat Window */}
      {isOpen && !isMinimized && <ChatWindow />}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={toggleChat}
        className="chat-fab"
        aria-label={isOpen ? 'Close chat' : 'Open chat with Nex'}
        title={isOpen ? 'Close chat' : 'Chat with Nex'}
      >
        <span className={`chat-fab__icon ${isOpen ? 'chat-fab__icon--active' : ''}`}>
          {isOpen ? <CloseIcon /> : <ChatIcon />}
        </span>
        {!isOpen && (
          <span className="chat-fab__pulse" />
        )}
      </button>

      <style jsx>{`
        .chat-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 12px rgba(15, 118, 110, 0.35),
            0 0 0 0 rgba(15, 118, 110, 0.35);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
        }

        .chat-fab:hover {
          transform: scale(1.05);
          box-shadow:
            0 6px 20px rgba(15, 118, 110, 0.45),
            0 0 0 0 rgba(15, 118, 110, 0.35);
        }

        .chat-fab:active {
          transform: scale(0.95);
        }

        .chat-fab__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }

        .chat-fab__icon--active {
          transform: rotate(90deg);
        }

        .chat-fab__pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--color-primary);
          opacity: 0.4;
          animation: fab-pulse 2s ease-out infinite;
        }

        @keyframes fab-pulse {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        /* Mobile optimization */
        @media (max-width: 640px) {
          .chat-fab {
            bottom: 16px;
            right: 16px;
            width: 52px;
            height: 52px;
          }
        }
      `}</style>
    </>
  );
}
