'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';

import Tokenz from '@/components/createToken';
import Squad from '@/components/viewSquads';

export default function Home() {
  const { connection } = useConnection();  // Get shared connection from provider
  const { publicKey, connected, signTransaction } = useWallet();

  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTokenz, setShowTokenz] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchBalance = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenCreationSuccess = () => {
    fetchBalance();
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [connected, publicKey]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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
                          onTokenCreationSuccess={handleTokenCreationSuccess}
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
                    disabled={loading}
                    className="rounded-2xl bg-black text-white text-lg font-semibold px-4 py-2 transition-all duration-300 border-0 cursor-pointer hover:scale-[102%] ease-in-out"
                  >
                    {loading ? 'loading...' : (
                      <div className="flex justify-center items-center gap-2">
                        <span className="text-xl">{showTokenz ? 'NVM' : 'Create +'}</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}