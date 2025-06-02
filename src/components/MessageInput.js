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
      // Set a small timeout to ensure the scrollHeight is correctly calculated after render
      // This helps with initial rendering and quick successive messages
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
      }, 0);
    }
  }, [message]);

  return (
    <div className="bg-white p-4">
      {/*
        The 'items-center' class on the flex container is crucial for vertical alignment.
        Ensure both the textarea and the button effectively occupy their space without
        extra padding/margin pushing them off alignment within their flex parent.
      */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-3"> {/* Changed to items-end for better multi-line alignment */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            // Ensure consistent vertical padding with the button's visual height
            // min-h-[48px] ensures it starts at a similar height to the button
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none min-h-[48px] max-h-32 leading-normal"
            rows={1}
            disabled={disabled}
            style={{ paddingTop: '12px', paddingBottom: '12px' }} // Explicit padding to match button's visual vertical space
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
          // The button's height should be consistent. h-12 (48px) is good.
          // Ensure internal padding 'p-3' (12px) contributes to this total height.
          className="text-2xl bg-green-300 p-3 rounded-full disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[48px] h-12"
          style={{ lineHeight: '0' }} // Helps center the emoji vertically within the button
        >
            ⬆️
        </button>
      </form>
    </div>
  );
};