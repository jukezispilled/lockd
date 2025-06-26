'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { RetroGrid } from '@/components/magicui/RetroGrid';

import Tokenz from '@/components/createToken';
import Squad from '@/components/viewSquads';

export default function Home() {
  const { connection } = useConnection();  // Get shared connection from provider
  const { publicKey, connected, signTransaction } = useWallet();

  const [showTokenz, setShowTokenz] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center bg-white">
      <RetroGrid />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="p-8">
              <div className="text-center absolute top-5 right-5">
                <WalletMultiButton>{connected ? 'Disconnect' : 'Connect'}</WalletMultiButton>
              </div>
              <div>
                <AnimatePresence mode="wait">
                  {showTokenz ? (
                    <div className='w-full flex justify-center'>
                      <motion.div
                        key="tokenz-comp"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Tokenz
                          publicKey={publicKey}
                          connected={connected}
                          signTransaction={signTransaction}
                          connection={connection}
                        />
                      </motion.div>
                    </div>
                  ) : (
                    <Squad />
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-4 justify-center absolute top-5 left-5">
                  <button
                    onClick={() => setShowTokenz(!showTokenz)}
                    className="text-gray-700 text-lg font-semibold px-4 py-2 transition-all duration-300 border-0 cursor-pointer hover:scale-[102%] ease-in-out"
                  >
                    <div className="flex justify-center items-center gap-2">
                      {showTokenz ? (
                        <span className="text-lg">NVM</span>
                      ) : (
                        <motion.span
                          className="text-lg"
                          animate={{
                            scale: [1, 1.04, 1],
                          }}
                          transition={{
                            duration: .7,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          [ Create + ]
                        </motion.span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}