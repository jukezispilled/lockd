// hooks/useChatCreation.js

import { useState } from 'react';

export const useChatCreation = () => {
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatCreationStatus, setChatCreationStatus] = useState('');

  const createGroupChat = async (tokenData, publicKey) => {
    if (!tokenData.name || !tokenData.mint || !publicKey) {
      setChatCreationStatus('Error: Missing required data for chat creation');
      return null;
    }

    setIsCreatingChat(true);
    setChatCreationStatus('Creating group chat...');

    try {
      const response = await fetch('https://lockd-one.vercel.app/api/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenName: tokenData.name,
          tokenMint: tokenData.mint,
          creatorPublicKey: publicKey.toString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create group chat');
      }

      const result = await response.json();
      setChatCreationStatus(`Group chat created: ${result.chatName}`);
      
      return {
        chatId: result.chatId,
        chatName: result.chatName
      };

    } catch (error) {
      console.error('Error creating group chat:', error);
      setChatCreationStatus(`Error: ${error.message}`);
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  };

  return {
    createGroupChat,
    isCreatingChat,
    chatCreationStatus,
    setChatCreationStatus
  };
};