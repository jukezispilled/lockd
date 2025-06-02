"use client";

import { useState, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter, TorusWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Token creation form component
function TokenCreationForm({ onCreateToken, isCreating }) {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
    devBuyAmount: '0.01', // SOL amount for dev buy
    image: null // This will store the File object
  });

  // State to manage drag-and-drop visual feedback
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Unified function to handle file selection, whether from input or drag/drop
  const handleFileSelection = (file) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        image: null // Clear the image if no file is selected or if it's not an image
      }));
    }
  };

  // Event handler for direct input change
  const handleImageChange = (e) => {
    handleFileSelection(e.target.files[0]);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault(); // Prevent default to allow drop
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
      e.dataTransfer.clearData(); // Clear data after drop
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.symbol || !formData.description) {
      console.error('Please fill in required fields (Name, Symbol, Description)');
      return;
    }
    onCreateToken(formData);
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
      <h3 className="text-xl font-bold text-black mb-4">Create Token</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Name*
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.x. Anon"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              disabled={isCreating}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Ticker*
            </label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              placeholder="e.x. ANON"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              disabled={isCreating}
              required
              maxLength={10}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Description*
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your token..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
            disabled={isCreating}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              X (optional)
            </label>
            <input
              type="url"
              name="twitter"
              value={formData.twitter}
              onChange={handleInputChange}
              placeholder="https://x.com/..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              disabled={isCreating}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Telegram (optional)
            </label>
            <input
              type="url"
              name="telegram"
              value={formData.telegram}
              onChange={handleInputChange}
              placeholder="https://t.me/..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              disabled={isCreating}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Website (optional)
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              disabled={isCreating}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="token-image-upload" className="block text-sm font-medium text-gray-600 mb-2">
              Token Image (optional)
            </label>
            {/* Drag and Drop Area - now styled to match input field size */}
            <div
              className={`flex items-center space-x-2 w-full p-1 border-1 rounded-lg transition-colors duration-200 ${
                isDraggingOver ? 'border-black bg-gray-50 border-dashed' : 'border-gray-300 border-solid'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Hidden file input */}
              <input
                id="token-image-upload" // Unique ID for the input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden" // Hide the default input
                disabled={isCreating}
              />
              {/* Custom styled label acting as the "Choose File" button */}
              <label
                htmlFor="token-image-upload"
                className="cursor-pointer bg-black text-white py-2 px-3 rounded-lg hover:bg-gray-800 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50"
              >
                Choose File
              </label>
              {/* Display the selected file name from formData.image */}
              <span className="text-gray-700 text-sm flex-1 truncate">
                {formData.image ? `Selected: ${formData.image.name}` : 'No file chosen'}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Dev Buy Amount (SOL)
            </label>
            <input
              type="number"
              name="devBuyAmount"
              value={formData.devBuyAmount}
              onChange={handleInputChange}
              placeholder="0.1"
              step="0.01"
              min="0"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              disabled={isCreating}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating Token...' : 'Create Token'}
        </button>
      </form>
    </div>
  );
}

// Wallet component that uses the wallet context
function WalletContent() {
  const { publicKey, connected, signTransaction } = useWallet();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [createdTokens, setCreatedTokens] = useState([]);
  const [creationStatus, setCreationStatus] = useState('');

  // Create connection to Solana mainnet with a reliable RPC endpoint
  const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=530b3b75-39b9-4fc8-a12c-4fb4250eab6d');

  // Fetch wallet balance
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

  // Create token using PumpPortal API
  const createToken = async (tokenData) => {
    if (!connected || !publicKey || !signTransaction) {
      console.error('Please connect your wallet first');
      return;
    }

    setIsCreatingToken(true);
    setCreationStatus('Preparing token creation...');

    try {
      // Generate a random keypair for the token mint
      const mintKeypair = Keypair.generate();
      
      // Prepare form data for IPFS upload
      const formData = new FormData();
      if (tokenData.image) {
        formData.append('file', tokenData.image);
      }
      formData.append('name', tokenData.name);
      formData.append('symbol', tokenData.symbol);
      formData.append('description', tokenData.description);
      formData.append('twitter', tokenData.twitter || '');
      formData.append('telegram', tokenData.telegram || '');
      formData.append('website', tokenData.website || '');
      formData.append('showName', 'true');

      setCreationStatus('Uploading metadata to IPFS...');

      // Upload metadata to IPFS via pump.fun
      const metadataResponse = await fetch('https://pump.fun/api/ipfs', {
        method: 'POST',
        body: formData,
      });

      if (!metadataResponse.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const metadataResponseJSON = await metadataResponse.json();
      
      setCreationStatus('Creating token transaction...');

      // Create token using PumpPortal local transaction endpoint
      const createResponse = await fetch('https://pumpportal.fun/api/trade-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: publicKey.toString(),
          action: 'create',
          tokenMetadata: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            uri: metadataResponseJSON.metadataUri
          },
          mint: mintKeypair.publicKey.toString(),
          denominatedInSol: 'true',
          amount: parseFloat(tokenData.devBuyAmount) || 0.1,
          slippage: 10,
          priorityFee: 0.0005,
          pool: 'pump'
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create token transaction: ${errorText}`);
      }

      setCreationStatus('Please sign the transaction...');

      // Get the transaction data
      const { VersionedTransaction } = await import('@solana/web3.js'); // Import here to avoid issues
      const transactionData = await createResponse.arrayBuffer();
      const transaction = VersionedTransaction.deserialize(new Uint8Array(transactionData));
      
      // Sign the transaction with both mint keypair and user wallet
      transaction.sign([mintKeypair]);
      const signedTransaction = await signTransaction(transaction);

      setCreationStatus('Submitting transaction...');

      // Send the signed transaction
      const signature = await connection.sendTransaction(signedTransaction);
      
      setCreationStatus('Confirming transaction...');

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      const newToken = {
        mint: mintKeypair.publicKey.toString(),
        name: tokenData.name,
        symbol: tokenData.symbol,
        signature: signature,
        timestamp: new Date().toISOString()
      };

      setCreatedTokens(prev => [newToken, ...prev]);
      setCreationStatus(`Token created successfully! Mint: ${mintKeypair.publicKey.toString()}`);
      
      // Refresh balance after token creation
      fetchBalance();

    } catch (error) {
      console.error('Error creating token:', error);
      setCreationStatus(`Error: ${error.message}`);
    } finally {
      setIsCreatingToken(false);
    }
  };

  // Fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [connected, publicKey]);

  return (
    <div className="min-h-screen flex items-center bg-white">
      <div className="container mx-auto px-4 py-8">

        {/* Wallet Connection Section */}
        <div className="max-w-4xl mx-auto">
          <div className="p-8">
            {!connected ? (
              <div className="text-center">
                <WalletMultiButton className="!bg-black hover:!bg-gray-800 !text-white !rounded-lg !font-semibold !px-8 !py-4 !text-lg transition-all duration-300 !border-0" />
              </div>
            ) : (
              <div>

                {/* Wallet Info */}
                <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Public Key
                      </label>
                      <div className="bg-gray-100 rounded-lg p-3 font-mono text-2xl text-black break-all">
                        {publicKey
                          ? `${publicKey.toString().slice(0, 3)}...${publicKey.toString().slice(-3)}`
                          : ''}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Balance
                      </label>
                      <div className="bg-gray-100 rounded-lg p-3">
                        {loading ? (
                          <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full mx-auto"></div>
                        ) : (
                          <span className="text-2xl font-bold text-black">
                            {balance !== null ? `${balance.toFixed(4)} SOL` : 'Error loading balance'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Creation Form */}
                <TokenCreationForm 
                  onCreateToken={createToken} 
                  isCreating={isCreatingToken}
                />

                {/* Creation Status */}
                {creationStatus && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-800">{creationStatus}</p>
                  </div>
                )}

                {/* Created Tokens List */}
                {createdTokens.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
                    <h3 className="text-xl font-bold text-black mb-4">Created Tokens</h3>
                    <div className="space-y-3">
                      {createdTokens.map((token) => (
                        <div key={token.mint} className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Name:</span> {token.name} ({token.symbol})
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Mint:</span> 
                              <span className="font-mono ml-2">{token.mint.slice(0, 8)}...{token.mint.slice(-8)}</span>
                            </div>
                            <div>
                              <a 
                                href={`https://solscan.io/tx/${token.signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                View Transaction
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={fetchBalance}
                    disabled={loading}
                    className="rounded-2xl bg-black text-white text-lg font-semibold px-4 py-2 transition-all duration-300 border-0"
                  >
                    {loading ? 'Loading...' : <div className='flex items-center gap-3'><div className='text-2xl'>🔄</div>Balance</div>}
                  </button>
                  
                  <WalletDisconnectButton className="!bg-gray-600 hover:!bg-gray-500 !text-white !font-semibold !py-3 !px-6 !rounded-lg !transition-colors !duration-300 !border-0" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App component with wallet providers
export default function Home() {
  
  // RPC endpoint - using a more reliable endpoint
  const endpoint = useMemo(() => 'https://mainnet.helius-rpc.com/?api-key=530b3b75-39b9-4fc8-a12c-4fb4250eab6d', []);
  
  // Configure wallets
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
          <WalletContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}