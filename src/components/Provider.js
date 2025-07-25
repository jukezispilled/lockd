// Your existing WalletProviders component (updated for security)
'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter, TorusWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import '@solana/wallet-adapter-react-ui/styles.css';

export default function WalletProviders({ children }) {
  // Move API key to environment variable for security
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
    []
  );

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Environment variables needed (.env.local):
// NEXT_PUBLIC_HELIUS_API_KEY=530b3b75-39b9-4fc8-a12c-4fb4250eab6d
// HELIUS_API_KEY=530b3b75-39b9-4fc8-a12c-4fb4250eab6d (for server-side)
// NEXT_PUBLIC_BASE_URL=http://localhost:3000