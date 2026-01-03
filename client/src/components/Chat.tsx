import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../shared/types';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function Chat({ messages, onSendMessage, disabled }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col h-80">
      <h3 className="text-lg font-semibold text-white mb-3">
        Listener Chat
      </h3>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No messages yet. Say hi!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${
                msg.username === 'Radio'
                  ? 'text-purple-400 italic'
                  : 'text-gray-300'
              }`}
            >
              <span className="text-gray-500 text-xs mr-2">
                {formatTime(msg.timestamp)}
              </span>
              <span className={`font-medium ${
                msg.username === 'Radio' ? 'text-purple-400' : 'text-pink-400'
              }`}>
                {msg.username}:
              </span>{' '}
              {msg.message}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message or suggestion..."
          disabled={disabled}
          maxLength={500}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>

      <p className="text-gray-500 text-xs mt-2">
        Tip: Suggest music styles, moods, or keys - the AI DJ reads chat!
      </p>
    </div>
  );
}
