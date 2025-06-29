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
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
      {/* Avatar for other users (left side) */}
      {!isOwn && (
        <div className="flex-shrink-0">
          {showAvatar && (
            <Image
              src="/anon.jpg"
              alt="Avatar"
              width={36}
              height={36}
              className="rounded-full"
            />
          )}
        </div>
      )}
      
      {/* Message content */}
      <div className="max-w-xs lg:max-w-md">
        {!isOwn && showAvatar && (
          <a
            href={`https://solscan.io/account/${message.senderPublicKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 mb-1 px-2 hover:underline"
          >
            {getSenderName(message.senderPublicKey)}
          </a>
        )}
        
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-[#007aff] text-white rounded-br-none'
              : 'bg-gray-700 text-white rounded-bl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>

      {/* Avatar for own messages (right side) */}
      {isOwn && (
        <div className="flex-shrink-0">
          {showAvatar && (
            <Image
              src="/anon1.jpg"
              alt="Avatar"
              width={36}
              height={36}
              className="rounded-full"
            />
          )}
        </div>
      )}
    </div>
  );
};

/*
        <div className={`text-xs text-gray-400 mt-1 px-2 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </div>
*/