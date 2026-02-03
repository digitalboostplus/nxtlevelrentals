import { useState, useRef, KeyboardEvent } from 'react';
import { useChatContext } from './ChatProvider';

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessage, isLoading } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);

    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  return (
    <div className="chat-input">
      <div className="chat-input__container">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="chat-input__textarea"
          rows={1}
          disabled={isLoading}
          aria-label="Type a message"
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="chat-input__send"
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
          title="Send message"
        >
          <SendIcon />
        </button>
      </div>

      <style jsx>{`
        .chat-input {
          padding: 12px 16px;
          border-top: 1px solid var(--color-border);
          background: var(--color-surface);
        }

        .chat-input__container {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 8px 8px 8px 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .chat-input__container:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .chat-input__textarea {
          flex: 1;
          border: none;
          background: none;
          resize: none;
          outline: none;
          font-size: 0.875rem;
          line-height: 1.5;
          color: var(--color-text);
          font-family: inherit;
          max-height: 120px;
          padding: 4px 0;
        }

        .chat-input__textarea::placeholder {
          color: var(--color-text-secondary);
        }

        .chat-input__textarea:disabled {
          opacity: 0.6;
        }

        .chat-input__send {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .chat-input__send:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .chat-input__send:active:not(:disabled) {
          transform: scale(0.95);
        }

        .chat-input__send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
