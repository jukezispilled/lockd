// components/MessageList.js

"use client";

import { MessageBubble } from './MessageBubble';

export const MessageList = ({ messages, isLoading, error }) => {
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <p className="text-red-600">Error loading messages</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No messages yet</h3>
          <p className="text-gray-500">y'all need to get lockd in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={message._id || index}
          message={message}
          isOwn={message.isOwn}
          showAvatar={index === 0 || messages[index - 1]?.senderPublicKey !== message.senderPublicKey}
        />
      ))}
      
      {isLoading && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            <span className="text-sm">Sending...</span>
          </div>
        </div>
      )}
    </div>
  );
};