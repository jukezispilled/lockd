// components/MessageInput.js

"use client";

import { useState, useRef, useEffect } from 'react';

export const MessageInput = ({ onSendMessage, disabled, chatId }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    const messageText = message.trim();
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(messageText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  return (
    <div className="bg-white p-4 flex justify-center">
      <form onSubmit={handleSubmit} className="flex items-center md:w-[80%]">
        <div className="flex-1 relative flex items-center">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What's up?"
            className="w-full py-5 px-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none min-h-[48px] max-h-32"
            rows={1}
            disabled={disabled}
          />

          <button
            type="submit"
            disabled={!message.trim() || disabled || message.length > 1000}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl bg-green-300 p-2 rounded-full disabled:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[44px] h-11"
          >
            ⬆️
          </button>
        </div>
      </form>
    </div>
  );
};