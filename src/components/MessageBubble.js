"use client";

import Image from 'next/image'; // Import the Image component

export const MessageBubble = ({ message, isOwn, showAvatar }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderName = (publicKey) => {
    if (!publicKey) return 'Unknown';
    return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}>
      {!isOwn && (
        // Use Next.js Image component for the avatar
        <div className="flex-shrink-0">
          {showAvatar && (
            <Image
              src="/anon.jpg" // Path to your image in the public folder
              alt="Avatar"
              width={32} // Set appropriate width
              height={32} // Set appropriate height
              className="rounded-full" // Apply styling for a circular avatar
            />
          )}
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
        {!isOwn && showAvatar && (
          <div className="text-xs text-gray-500 mb-1 px-2">
            {getSenderName(message.senderPublicKey)}
          </div>
        )}
        
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-black text-white rounded-br-none'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        
        <div className={`text-xs text-gray-400 mt-1 px-2 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>

      {isOwn && (
        // For the "own" message, you can also use anon.jpg or keep the current approach
        // if you want a different avatar for the sender.
        <div className="flex-shrink-0">
          {showAvatar && (
            <Image
              src="/anon.jpg" // Path to your image in the public folder
              alt="Avatar"
              width={32} // Set appropriate width
              height={32} // Set appropriate height
              className="rounded-full" // Apply styling for a circular avatar
            />
          )}
        </div>
      )}
    </div>
  );
};