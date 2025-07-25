'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { RetroGrid } from '@/components/magicui/RetroGrid';
import { BiRefresh, BiInfoCircle, BiX } from "react-icons/bi";
import Image from 'next/image';

import Tokenz from '@/components/createToken'; // Assuming this path is correct in your project
import Squad from '@/components/viewSquads';   // Assuming this path is correct in your project

export default function Home() {
  // Get shared connection from provider
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();

  const [showTokenz, setShowTokenz] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(true);

  // Ensure the component is mounted on the client-side before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handler for refreshing the Squads data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger refresh in Squad component by incrementing refreshTrigger
    setRefreshTrigger(prev => prev + 1);
    // Add a small delay to show the refresh animation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  // Render nothing until the component is mounted to prevent hydration issues
  if (!mounted) return null;

  return (
    <div className="min-h-[100dvh] bg-black relative">
      {/* RetroGrid background component */}
      <RetroGrid />
      <div className="container mx-auto px-2 md:px-2 py-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="p-8">
            {/* Logo positioned at top center */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>

            {/* Wallet connection button positioned at top right */}
            <div className="text-center absolute top-4 right-5 z-20">
              <WalletMultiButton>{connected ? 'wallet' : 'wallet'}</WalletMultiButton>
            </div>
            <div>
              {/* Render both components but control visibility */}
              <div className="relative">
                {/* Squad component - always rendered but hidden when showTokenz is true */}
                <div 
                  className={`self-start transition-opacity duration-300 ${
                    showTokenz ? 'opacity-0 pointer-events-none absolute inset-0 h-[0dvh] overflow-clip' : 'opacity-100'
                  }`}
                >
                  <Squad
                    refreshTrigger={refreshTrigger}
                    isRefreshing={isRefreshing}
                  />
                </div>

                {/* Tokenz component with animation */}
                <div className={`transition-opacity duration-300 ${showTokenz ? 'opacity-100' : 'hidden'}`}>
                  <AnimatePresence>
                    {showTokenz && (
                      <motion.div
                        key="tokenz-comp"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="w-full min-h-[80dvh] mt-[7%] md:mt-[0%] flex items-center justify-center relative z-20"
                      >
                        <Tokenz
                          publicKey={publicKey}
                          connected={connected}
                          signTransaction={signTransaction}
                          connection={connection}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action buttons (Create/NVM, Refresh, and Info) positioned at top left */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center absolute top-5 left-5 z-20">
                <div className="flex items-center gap-2">
                  {/* Button to toggle between Tokenz and Squad components */}
                  <button
                    onClick={() => setShowTokenz(!showTokenz)}
                    className="text-white text-lg font-semibold px-4 py-2 transition-all duration-300 border-0 cursor-pointer hover:scale-[102%] ease-in-out"
                  >
                    <div className="flex justify-center items-center gap-2">
                      {showTokenz ? (
                        <span className="text-sm md:text-base">nvm</span>
                      ) : (
                        <motion.span
                          className="text-sm md:text-base"
                          animate={{
                            scale: [1, 1.04, 1],
                          }}
                          transition={{
                            duration: .7,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          [ create + ]
                        </motion.span>
                      )}
                    </div>
                  </button>

                  {/* Refresh button, conditionally hidden when showTokenz is true */}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`text-white transition-all duration-300 border-0 cursor-pointer hover:scale-[102%] ease-in-out disabled:cursor-not-allowed disabled:opacity-50 ${showTokenz ? 'hidden' : ''}`}
                  >
                    <motion.div
                      animate={{ rotate: isRefreshing ? 360 : 0 }}
                      transition={{
                        duration: 1,
                        repeat: isRefreshing ? Infinity : 0,
                        ease: "linear"
                      }}
                    >
                      <BiRefresh size={30} />
                    </motion.div>
                  </button>

                  {/* Info button, conditionally hidden when showTokenz is true */}
                  <button
                    onClick={() => setShowInfoModal(true)}
                    className={`text-white transition-all duration-300 border-0 cursor-pointer hover:scale-[102%] ease-in-out ${showTokenz ? 'hidden' : ''}`}
                  >
                    <BiInfoCircle size={22} />
                  </button>
                </div>
              </div>

              {/* Info Modal */}
              <AnimatePresence>
                {showInfoModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center z-50"
                    onClick={() => setShowInfoModal(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-black p-6 max-w-md mx-4 relative border border-[#333]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Close button */}
                      <button
                        onClick={() => setShowInfoModal(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <BiX size={24} />
                      </button>

                      {/* Modal content */}
                      <div className="text-white text-sm">
                        {/* Logo centered horizontally */}
                        <div className="flex justify-center mb-4">
                          <Image
                            src="/logo.png"
                            alt="Logo"
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        </div>
                        <p className="text-gray-300 mb-4">
                          lockd.fun was built to supercharge our token communities by providing them a home. anybody can create a squad that is equipped with chat, voice/video chat, token gating, and very soon any app you can imagine
                        </p>
                        <p className="text-gray-300 mb-4">
                          we believe lockd is the next step in strengthening and evolving our token squads so they can reach new heights in active users, market cap, purpose, and more.
                        </p>
                        <p className="text-gray-300">
                          try it out now and give us feedback! early squad creators and participants will be rewarded! cmon bro, get lockd in.
                        </p>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}