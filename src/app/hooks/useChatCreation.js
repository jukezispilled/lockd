// hooks/useChatCreation.js
import { useState } from 'react';

export const useChatCreation = () => {
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatCreationStatus, setChatCreationStatus] = useState('');

  const createGroupChat = async (tokenData, publicKey) => {
    console.log('Hook received tokenData:', tokenData);
    
    // Validate input data - amount is now required
    if (!tokenData?.name || !tokenData?.symbol || !tokenData?.mint || !publicKey) {
      const errorMsg = 'Error: Missing required data for chat creation';
      setChatCreationStatus(errorMsg);
      console.error('Validation failed:', { tokenData, publicKey });
      return null;
    }

    // Validate amount if provided
    if (tokenData.amount !== undefined && (isNaN(tokenData.amount) || tokenData.amount <= 0)) {
      const errorMsg = 'Error: Invalid amount provided for chat creation';
      setChatCreationStatus(errorMsg);
      console.error('Amount validation failed:', { amount: tokenData.amount });
      return null;
    }

    setIsCreatingChat(true);
    setChatCreationStatus('Creating squad...');

    try {
      const requestBody = {
        tokenName: tokenData.name,
        tokenSym: tokenData.symbol,
        tokenMint: tokenData.mint,
        creatorPublicKey: publicKey.toString()
      };

      // Include amount if provided
      if (tokenData.amount !== undefined && tokenData.amount > 0) {
        requestBody.amount = tokenData.amount;
      }

      console.log('Creating squad with data:', requestBody);

      const response = await fetch('/api/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create squad`);
      }

      const result = await response.json();
      console.log('Success result:', result);
      
      // Include amount info in success message if provided
      const successMessage = tokenData.amount 
        ? `Squad created: ${result.chatName} (Amount: ${tokenData.amount})`
        : `Squad created: ${result.chatName}`;
      
      setChatCreationStatus(successMessage);
      
      return {
        chatId: result.chatId,
        chatName: result.chatName,
        amount: tokenData.amount || null
      };

    } catch (error) {
      console.error('Error creating squad:', error);
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