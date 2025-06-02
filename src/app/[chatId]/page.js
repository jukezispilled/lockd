// app/chat/[chatId]/page.js

"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { ChatHeader } from '@/components/ChatHeader';
import { useChatMessages } from '../hooks/useChatMessages';

export default function ChatPage() {
  const { chatId } = useParams();
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const {
    messages,
    sendMessage,
    isLoading: isSendingMessage,
    error: messageError,
    refreshMessages
  } = useChatMessages(chatId);

  // Fetch chat data
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const response = await fetch(`/api/chat/${chatId}`);
        if (!response.ok) {
          throw new Error('Chat not found');
        }
        const data = await response.json();
        setChatData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (chatId) {
      fetchChatData();
    }
  }, [chatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!chatId) return;

    const interval = setInterval(() => {
      refreshMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [chatId, refreshMessages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chat Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ChatHeader chatData={chatData} />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <MessageList 
          messages={messages} 
          isLoading={isSendingMessage}
          error={messageError}
        />
        <div ref={messagesEndRef} />
      </div>

      <MessageInput 
        onSendMessage={sendMessage}
        disabled={isSendingMessage}
        chatId={chatId}
      />
    </div>
  );
}