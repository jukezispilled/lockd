"use client";

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useChatCreation } from '@/app/hooks/useChatCreation';

// Make sure you have your Helius API key set as an environment variable
// e.g., NEXT_PUBLIC_HELIUS_API_KEY=YOUR_HELIUS_API_KEY
const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
  : ''; // Fallback for local development or if not set

export default function ImportTokenForChat({ onImportSuccess, publicKey, setGroupChat }) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { createGroupChat, isCreatingChat, chatCreationStatus, setChatCreationStatus } = useChatCreation();

  const handleTokenAddressChange = (e) => {
    setTokenAddress(e.target.value);
    setError('');
    setSuccessMessage('');
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
      setSuccessMessage('');
    }
  };

  const fetchTokenMetadata = async (mintAddress) => {
    if (!HELIUS_RPC_URL) {
      throw new Error("Helius RPC URL not configured. Please set NEXT_PUBLIC_HELIUS_API_KEY environment variable.");
    }

    try {
      const response = await fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'import-token-chat',
          method: 'getAsset', // Helius DAS API method to get asset data
          params: {
            id: mintAddress,
            displayOptions: {
              showFungible: true // Ensure we get fungible token details
            }
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Helius API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const asset = data.result;

      if (!asset || asset.interface !== 'FungibleToken' || !asset.content || !asset.content.metadata) {
        throw new Error('Could not retrieve valid fungible token metadata for this address.');
      }

      return {
        name: asset.content.metadata.name || 'Unknown Token',
        symbol: asset.content.metadata.symbol || 'UNK',
      };

    } catch (err) {
      console.error('Error fetching token metadata from Helius:', err);
      throw new Error(`Failed to fetch token metadata: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!tokenAddress) {
      setError('Please enter a token address.');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (!publicKey) {
      setError('Please connect your wallet.');
      return;
    }

    try {
      // Validate Solana address format
      new PublicKey(tokenAddress);
    } catch (err) {
      setError('Invalid Solana token address format.');
      return;
    }

    setIsLoading(true);
    setChatCreationStatus('Fetching token data from Helius...');

    try {
      const { name, symbol } = await fetchTokenMetadata(tokenAddress);

      console.log('Fetched token data:', { name, symbol, mint: tokenAddress, amount });

      setChatCreationStatus('Creating squad...');
      const chatResult = await createGroupChat({
        name: name,
        symbol: symbol,
        mint: tokenAddress,
        amount: parseFloat(amount)
      }, publicKey);

      if (chatResult) {
        setSuccessMessage('Squad created successfully!');
        
        // Send the chat data to setGroupChat if provided
        if (setGroupChat) {
          setGroupChat({
            name: name,
            symbol: symbol,
            mint: tokenAddress,
            amount: parseFloat(amount),
            chatId: chatResult.id || chatResult // Adjust based on your chatResult structure
          });
        }

        if (onImportSuccess) {
          onImportSuccess(chatResult);
        }
        
        setTokenAddress(''); // Clear the input fields
        setAmount('');
      } else {
        setError('Failed to create squad for the imported token.');
      }

    } catch (err) {
      console.error('Error importing token or creating chat:', err);
      setError(`Failed to process token: ${err.message}`);
    } finally {
      setIsLoading(false);
      setChatCreationStatus(''); // Clear chat creation status after completion
    }
  };

  return (
    <div className="bg-black p-6 rounded-sm border border-[#333] mb-2 max-w-2xl shadow-xs">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Contract Address*
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={handleTokenAddressChange}
            placeholder="e.x. Hx...1a2b"
            className="w-full p-3 rounded-sm border border-[#333] focus:outline-none focus:ring-2 focus:ring-black text-white bg-black"
            disabled={isLoading || isCreatingChat}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Amount*
          </label>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.0"
            className="w-full p-3 rounded-sm border border-[#333] focus:outline-none focus:ring-2 focus:ring-black text-white bg-black"
            disabled={isLoading || isCreatingChat}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isCreatingChat || !tokenAddress || !amount}
          className="w-full bg-black text-white rounded-sm border border-[#333] py-3 px-6 font-semibold disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? 'Fetching Token Data...' : isCreatingChat ? 'Setting up Chat...' : 'Create +'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 mt-4 rounded-sm">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 p-4 mt-4 rounded-sm">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {chatCreationStatus && !successMessage && !error && (
        <div className="bg-blue-50 border border-blue-200 p-4 mt-4 rounded-sm">
          <p className="text-blue-800">{chatCreationStatus}</p>
        </div>
      )}
    </div>
  );
}