// hooks/useChatMessages.js

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export const useChatMessages = (chatId) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { publicKey: userPublicKey } = useWallet(); // Get user's public key from useWallet

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      
      // Mark messages as own if they belong to current user
      const messagesWithOwnership = data.messages.map(msg => ({
        ...msg,
        isOwn: userPublicKey && msg.senderPublicKey === userPublicKey.toString()
      }));
      
      setMessages(messagesWithOwnership);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    }
  }, [chatId, userPublicKey]); // Add userPublicKey to dependencies

  const sendMessage = async (content) => {
    if (!chatId || !content.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!userPublicKey) {
        throw new Error('Please connect your wallet to send messages');
      }

      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          senderPublicKey: userPublicKey.toString() // Use userPublicKey directly
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Refresh messages after sending
      await fetchMessages();
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMessages = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    refreshMessages
  };
};