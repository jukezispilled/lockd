'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { RetroGrid } from '@/components/magicui/RetroGrid';
import { BiRefresh } from "react-icons/bi";

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
        <div className="max-w-6xl mx-auto">
          <div className="p-8">
            {/* Wallet connection button positioned at top right */}
            <div className="text-center absolute top-4 right-5 z-20">
              <WalletMultiButton>{connected ? 'sign-out' : 'sign-in'}</WalletMultiButton>
            </div>
            <div>
              {/* Render both components but control visibility */}
              <div className="relative">
                {/* Squad component - always rendered but hidden when showTokenz is true */}
                <div 
                  className={`self-start transition-opacity duration-300 ${
                    showTokenz ? 'opacity-0 pointer-events-none absolute inset-0 h-[50dvh] overflow-clip' : 'opacity-100'
                  }`}
                >
                  <Squad
                    refreshTrigger={refreshTrigger}
                    isRefreshing={isRefreshing}
                  />
                </div>

                {/* Tokenz component with animation */}
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

              {/* Action buttons (Create/NVM and Refresh) positioned at top left */}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}