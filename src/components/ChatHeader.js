// components/ChatHeader.js

"use client";

import { useState } from 'react';

export const ChatHeader = ({ chatData }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!chatData) return null;

  return (
    <>
      <div className="bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-full text-2xl"
            >
              ⬅️
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{chatData.name}</h1>
              <p className="text-sm text-gray-500">
                ({chatData.tokenSym}) • {chatData.tokenMint}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-600 hover:text-gray-800 p-2 rounded-full"
            >
              ⋮
            </button>
          </div>
        </div>
      </div>

      {/* Chat Details Dropdown */}
      {showDetails && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-600">Token Mint:</span>
                <p className="font-mono text-xs break-all">{chatData.tokenMint}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <p>{new Date(chatData.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Creator:</span>
              <p className="font-mono text-xs">{chatData.creatorPublicKey}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};