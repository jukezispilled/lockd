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
  const [showJumpButton, setShowJumpButton] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const {
    messages,
    sendMessage,
    isLoading: isSendingMessage,
    error: messageError,
    refreshMessages
  } = useChatMessages(chatId);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user is near bottom of scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowJumpButton(!isNearBottom);
  };

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

  // Poll for new messages every 10 minutes
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
              onClick={() => (window.location.href = '/')}
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
          <div className='h-[90%] w-[75%] bg-white rounded-xl p-4 flex flex-col relative'>
            {/* Jump to Present Button */}
            <AnimatePresence>
              {showJumpButton && (
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onClick={scrollToBottom}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                    />
                  </svg>
                  Jump to Present
                </motion.button>
              )}
            </AnimatePresence>

            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className='flex-grow overflow-y-auto'
            >
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