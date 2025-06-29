// app/chat/[chatId]/page.js

"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageList } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { ChatHeader } from '@/components/message/ChatHeader';
import { VideoCallModal } from '@/components/VideoCallModal';
import { useChatMessages } from '../hooks/useChatMessages';

import { HiSpeakerphone } from "react-icons/hi";

export default function ChatPage() {
  const { chatId } = useParams();
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [roomUrl, setRoomUrl] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
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

  // Create or join Daily.co room
  const handleJoinRoom = async () => {
    setIsCreatingRoom(true);
    try {
      // Create or get existing room for this chat
      const response = await fetch(`/api/video-room/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create/join room');
      }
      
      const data = await response.json();
      setRoomUrl(data.url);
      setShowVideoModal(true);
    } catch (err) {
      console.error('Error joining room:', err);
      // You could add a toast notification here
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Close video modal
  const handleCloseVideo = () => {
    setShowVideoModal(false);
    setRoomUrl(null);
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
      <div className="flex flex-col h-[100dvh] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-black flex items-center justify-center flex-1"
          >
            <div className="text-center">
              <p className="text-gray-300">Loading chat...</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-[100dvh] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-black flex items-center justify-center flex-1"
          >
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Bro is not lockd in</h2>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={() => (window.location.href = '/')}
                className="bg-black border border-[#333] text-white px-6 py-2 rounded-lg"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key="chat-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col h-full"
        >
          <div className="flex-shrink-0">
            <ChatHeader chatData={chatData} />
          </div>
          
          <div className="bg-black flex-1 min-h-0 pb-4 md:pb-0 md:my-4 overflow-hidden flex flex-col justify-center items-center">
            <div className="flex flex-col md:flex-row gap-4 h-full w-[90%] md:w-[95%] min-h-0">
              {/* Video Call Button */}
              <div className="flex flex-col gap-1 md:gap-2 md:flex-shrink-0 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJoinRoom}
                  disabled={isCreatingRoom}
                  className="bg-black border border-[#333] text-gray-300 p-3 transition-colors flex items-center justify-center w-min md:w-40 h-auto cursor-pointer gap-3 flex-row-reverse md:flex-row"
                  title="Join Video/Voice Call"
                >
                  {isCreatingRoom ? (
                    <div className="size-6 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <HiSpeakerphone className="size-6" />
                  )}
                  <span className="text-base font-medium hidden md:block text-white">voice</span>
                </motion.button>
                <hr className="my-4 border-t border-[#333]" />
                <div className='cursor-pointer text-white'>#general</div>
              </div>

              {/* Main Chat Container */}
              <div className='flex-1 bg-black border border-[#333] flex flex-col relative min-h-0'>
                {/* Jump to Present Button */}
                <AnimatePresence>
                  {showJumpButton && (
                    <motion.button
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      onClick={scrollToBottom}
                      className="absolute top-0 md:top-4 left-1/2 -translate-x-1/2 z-10 text-white px-3 py-0.5 md:py-2 rounded-lg cursor-pointer flex items-center gap-2 text-xs md:text-sm font-medium transition-colors"
                    >
                      <svg 
                        className="w-4 h-4 hidden md:block" 
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
                  className='flex-grow overflow-y-auto min-h-0'
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
          </div>

          <div className="flex-shrink-0">
            <MessageInput 
              onSendMessage={sendMessage}
              disabled={isSendingMessage}
              chatId={chatId}
            />
          </div>

          {/* Video Call Modal */}
          <VideoCallModal
            isOpen={showVideoModal}
            onClose={handleCloseVideo}
            roomUrl={roomUrl}
            chatId={chatId}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}