// hooks/useChatCreation.js
import { useState } from 'react';

export const useChatCreation = () => {
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatCreationStatus, setChatCreationStatus] = useState('');

  const createGroupChat = async (tokenData, publicKey) => {
    // Validate input data
    if (!tokenData?.name || !tokenData?.symbol ||  !tokenData?.mint || !publicKey) {
      const errorMsg = 'Error: Missing required data for chat creation';
      setChatCreationStatus(errorMsg);
      console.error('Validation failed:', { tokenData, publicKey });
      return null;
    }

    setIsCreatingChat(true);
    setChatCreationStatus('Creating group chat...');

    try {
      console.log('Creating chat with data:', {
        tokenName: tokenData.name,
        tokenSym: tokenData.symbol,
        tokenMint: tokenData.mint,
        creatorPublicKey: publicKey.toString()
      });

      const response = await fetch('/api/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenName: tokenData.name,
          tokenSym: tokenData.symbol,
          tokenMint: tokenData.mint,
          creatorPublicKey: publicKey.toString()
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create group chat`);
      }

      const result = await response.json();
      console.log('Success result:', result);
      
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