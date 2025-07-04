// components/MessageList.js

"use client";

import { MessageBubble } from './MessageBubble';

export const MessageList = ({ messages, isLoading, error }) => {
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center pt-4">
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
      <div className="flex-1 flex items-center justify-center pt-4">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No messages yet</h3>
          <p className="text-gray-500">ffs get lockd in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((message, index) => (
        <MessageBubble
          key={message._id || index}
          message={message}
          isOwn={message.isOwn}
          showAvatar={index === 0 || messages[index - 1]?.senderPublicKey !== message.senderPublicKey}
        />
      ))}
    </div>
  );
};