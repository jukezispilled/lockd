// app/chat/[chatId]/page.js

"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { MessageList } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { ChatHeader } from '@/components/message/ChatHeader';
import { VideoCallModal } from '@/components/VideoCallModal';
import { useChatMessages } from '../hooks/useChatMessages';
import { HiSpeakerphone } from "react-icons/hi";

export default function ChatPage() {
  const { chatId } = useParams();
  const { publicKey, connected } = useWallet();
  
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenGateLoading, setTokenGateLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [roomUrl, setRoomUrl] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true); // Track if user is near bottom
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const {
    messages,
    sendMessage,
    isLoading: isSendingMessage,
    error: messageError,
    refreshMessages
  } = useChatMessages(chatId);

  // Verify token ownership
  const verifyTokenOwnership = async (walletAddress) => {
    if (!walletAddress || !chatData?.tokenMint || !chatData?.amount) {
      return false;
    }
    
    setTokenGateLoading(true);
    
    try {
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress.toString(),
          tokenMint: chatData.tokenMint,
          requiredAmount: chatData.amount,
          chatId: chatId
        })
      });

      if (!response.ok) {
        throw new Error(`Token verification failed: ${response.status}`);
      }

      const data = await response.json();
      setTokenBalance(data.balance || 0);
      setHasAccess(data.hasAccess);
      
      return data.hasAccess;
    } catch (err) {
      setHasAccess(false);
      return false;
    } finally {
      setTokenGateLoading(false);
    }
  };

  // Function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user is near bottom of scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setIsNearBottom(nearBottom);
    setShowJumpButton(!nearBottom);
  };

  // Create or join Daily.co room
  const handleJoinRoom = async () => {
    setIsCreatingRoom(true);
    try {
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

  // Verify token ownership when wallet connects or chat data loads
  useEffect(() => {
    if (connected && publicKey && chatData && !hasAccess && !verificationAttempted) {
      setVerificationAttempted(true);
      verifyTokenOwnership(publicKey);
    }
  }, [connected, publicKey, chatData, hasAccess, verificationAttempted]);

  // Conditionally auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (hasAccess && isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasAccess, isNearBottom]);

  // Poll for new messages every 10 minutes (only if has access)
  useEffect(() => {
    if (!chatId || !hasAccess) return;

    const interval = setInterval(() => {
      refreshMessages();
    }, 600000);

    return () => clearInterval(interval);
  }, [chatId, refreshMessages, hasAccess]);

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
                className="bg-black rounded-sm border border-[#333] text-white px-6 py-2"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Token gate screen - show if not connected or doesn't have access
  if (!connected || !hasAccess) {
    return (
      <div className="flex flex-col h-[100dvh] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key="token-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-black flex items-center justify-center flex-1"
          >
            <div className="text-center max-w-md mx-auto p-6">
              <div className="text-yellow-500 text-6xl mb-4">🔐</div>
              
              {!connected ? (
                <>
                  <p className="text-gray-300 mb-6">
                    Connect your wallet
                  </p>
                  <WalletMultiButton className="!bg-purple-600 !rounded-sm" />
                </>
              ) : (
                <>
                  {tokenGateLoading ? (
                    <div className="text-center">
                      <div className="size-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-gray-300">Verifying...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-300 mb-2">
                        Need to hold at least <span className="text-green-400 font-bold">{chatData?.amount || 0}</span> tokens
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Token: {chatData?.tokenMint || 'Unknown'}
                      </p>
                      <p className="text-red-400 mb-4">
                        Your balance: <span className="font-bold">{tokenBalance}</span>
                      </p>
                      
                      <button
                        onClick={() => {
                          setVerificationAttempted(false);
                          verifyTokenOwnership(publicKey);
                        }}
                        disabled={tokenGateLoading}
                        className={`rounded-sm border text-white px-6 py-2 mb-4 ${
                          tokenGateLoading 
                            ? 'bg-gray-600 border-gray-500 cursor-not-allowed' 
                            : 'bg-black border-[#333] cursor-pointer'
                        }`}
                      >
                        {tokenGateLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="size-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            Checking...
                          </div>
                        ) : (
                          'Check Again'
                        )}
                      </button>
                      <div className="mt-4">
                        <WalletMultiButton className="!bg-purple-600 !rounded-sm" />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Main chat interface (only shown if user has access)
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
                  className="bg-black rounded-sm border border-[#333] text-gray-300 p-3 transition-colors flex items-center justify-center w-min md:w-32 h-auto cursor-pointer gap-3 flex-row-reverse md:flex-row"
                  title="Join Video/Voice Call"
                >
                  {isCreatingRoom ? (
                    <div className="size-6 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <HiSpeakerphone className="size-6" />
                  )}
                </motion.button>
                <hr className="my-4 border-t border-[#333]" />
                <div className='cursor-pointer text-white'>#general</div>
                <div className="hidden md:block">
                  <hr className="my-4 border-t border-[#333]" />
                  <div className='text-white mb-4'>Apps</div>
                  <div className="relative">
                    <img 
                      src="/d.png" 
                      alt="D" 
                      className="w-[86px] h-auto border border-[#333] rounded-sm"
                    />
                    <div className="absolute -top-2 right-5 bg-black border border-[#333] text-white text-xs font-medium px-2 py-1 rounded">
                      soon
                    </div>
                  </div>
                </div>
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