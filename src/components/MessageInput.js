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
      <form onSubmit={handleSubmit} className="flex items-start space-x-3 md:w-[75%]">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What's up"
            className="w-full p-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none min-h-[48px] max-h-32"
            rows={1}
            disabled={disabled}
          />
          
          {/* Character count */}
          {message.length > 0 && (
            <div className="absolute bottom-1 right-3 text-xs text-gray-400">
              {message.length}/1000
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || disabled || message.length > 1000}
          className="text-2xl bg-green-300 p-3 rounded-full disabled:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[48px] h-12"
        >
            ⬆️
        </button>
      </form>
    </div>
  );
};