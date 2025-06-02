// components/MessageBubble.js

"use client";

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
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-center space-x-2`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {showAvatar ? getSenderName(message.senderPublicKey)[0].toUpperCase() : ''}
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
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {showAvatar ? getSenderName(message.senderPublicKey)[0].toUpperCase() : ''}
        </div>
      )}
    </div>
  );
};