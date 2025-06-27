// app/chat/[chatId]/page.js

"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
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
    }, 600000);

    return () => clearInterval(interval);
  }, [chatId, refreshMessages]);

  if (loading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="bg-gray-100 flex items-center justify-center h-[calc(100dvh-20px)]"
        >
          <div className="text-center">
            <p className="text-gray-600">Loading chat...</p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (error) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="bg-gray-100 flex items-center justify-center h-[calc(100dvh-20px)]"
        >
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Bro is not lockd in</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="bg-black text-white px-6 py-2 rounded-lg"
            >
              Go Back
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="chat-page"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col h-[calc(100dvh-20px)]"
      >
        <ChatHeader chatData={chatData} />
        
        <div className="bg-gray-100 flex-1 overflow-hidden flex flex-col justify-center items-center">
          <div className='h-[90%] w-[75%] border border-gray-300 rounded-xl p-4 flex flex-col'> {/* Added flex flex-col */}
            <div className='flex-grow overflow-y-auto'> {/* Added flex-grow and overflow-y-auto */}
              <MessageList 
                messages={messages} 
                isLoading={isSendingMessage}
                error={messageError}
              />
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        <MessageInput 
          onSendMessage={sendMessage}
          disabled={isSendingMessage}
          chatId={chatId}
        />
      </motion.div>
    </AnimatePresence>
  );
}