"use client";

import { useState } from 'react';
import { Connection, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { useChatCreation } from '@/app/hooks/useChatCreation';
import { ChatSuccessNotification } from './ChatSuccessNotification';
import bs58 from 'bs58';
import ImportTokenForChat from './import';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence

// Token creation form component
export default function Tokenz({ publicKey, connected, signTransaction, connection, onTokenCreationSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
    devBuyAmount: '0.005', // SOL amount for dev buy
    image: null // This will store the File object
  });

  // State to manage drag-and-drop visual feedback
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // States moved from Home component
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [createdTokens, setCreatedTokens] = useState([]);
  const [creationStatus, setCreationStatus] = useState('');
  const [createdChatData, setCreatedChatData] = useState(null);
  const { createGroupChat, isCreatingChat, chatCreationStatus, setChatCreationStatus } = useChatCreation();

  // New state to toggle between token creation form and token import form
  const [showImportForm, setShowImportForm] = useState(true);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelection = (file) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        image: null
      }));
    }
  };

  const handleImageChange = (e) => {
    handleFileSelection(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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
      e.dataTransfer.clearData();
    }
  };

  const createToken = async (tokenData) => {
    if (!connected || !publicKey || !signTransaction) {
      console.error('Please connect your wallet first');
      setCreationStatus('Error: Please connect your wallet first.');
      return;
    }

    setIsCreatingToken(true);
    setCreationStatus('Preparing token creation...');

    try {
      const mintKeypair = Keypair.generate();

      const formDataForIpfs = new FormData();
      if (tokenData.image) {
        formDataForIpfs.append('file', tokenData.image);
      }
      formDataForIpfs.append('name', tokenData.name);
      formDataForIpfs.append('symbol', tokenData.symbol);
      formDataForIpfs.append('description', tokenData.description);
      formDataForIpfs.append('twitter', tokenData.twitter || '');
      formDataForIpfs.append('telegram', tokenData.telegram || '');
      formDataForIpfs.append('website', tokenData.website || '');
      formDataForIpfs.append('showName', 'true');

      setCreationStatus('Uploading metadata to IPFS...');

      const metadataResponse = await fetch('/api/upload-metadata', {
        method: 'POST',
        body: formDataForIpfs,
      });

      if (!metadataResponse.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const metadataResponseJSON = await metadataResponse.json();

      setCreationStatus('Creating token transaction...');

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

      const { VersionedTransaction } = await import('@solana/web3.js');
      const transactionData = await createResponse.arrayBuffer();
      const transaction = VersionedTransaction.deserialize(new Uint8Array(transactionData));

      // Sign with mintKeypair first
      transaction.sign([mintKeypair]);
      
      // Get user signature
      const signedTransaction = await signTransaction(transaction);

      setCreationStatus('Submitting transaction...');

      // Use sendRawTransaction with additional options to handle blockhash issues
      const rawTransaction = signedTransaction.serialize();
      
      try {
        const signature = await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        });

        setCreationStatus('Confirming transaction...');

        // Wait for confirmation with timeout
        const confirmation = await Promise.race([
          connection.confirmTransaction({
            signature,
            blockhash: signedTransaction.message.recentBlockhash,
            lastValidBlockHeight: await connection.getBlockHeight() + 150,
          }, 'confirmed'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
          )
        ]);

        const newToken = {
          mint: mintKeypair.publicKey.toString(),
          name: tokenData.name,
          symbol: tokenData.symbol,
          signature: signature,
          timestamp: new Date().toISOString()
        };

        setCreatedTokens(prev => [newToken, ...prev]);
        setCreationStatus(`Token created successfully! Mint: ${mintKeypair.publicKey.toString()}`);

        console.log('About to create chat with tokenData:', {
            name: tokenData.name,
            symbol: tokenData.symbol,
            mint: mintKeypair.publicKey.toString()
        });

        const chatResult = await createGroupChat({
            name: tokenData.name,
            symbol: tokenData.symbol,
            mint: mintKeypair.publicKey.toString()
        }, publicKey);
        
        if (chatResult) {
            setCreatedChatData(chatResult);
        }

        if (onTokenCreationSuccess) {
          onTokenCreationSuccess();
        }

      } catch (sendError) {
        if (sendError.message.includes('Blockhash not found') || 
            sendError.message.includes('Transaction simulation failed')) {
          
          setCreationStatus('Transaction failed due to network timing. Retrying...');
          
          const retryResponse = await fetch('https://pumpportal.fun/api/trade-local', {
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
              priorityFee: 0.001,
              pool: 'pump'
            }),
          });

          if (retryResponse.ok) {
            const retryTransactionData = await retryResponse.arrayBuffer();
            const retryTransaction = VersionedTransaction.deserialize(new Uint8Array(retryTransactionData));
            
            retryTransaction.sign([mintKeypair]);
            const retrySignedTransaction = await signTransaction(retryTransaction);
            
            const retrySignature = await connection.sendRawTransaction(
              retrySignedTransaction.serialize(),
              {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 2,
              }
            );

            await connection.confirmTransaction({
              signature: retrySignature,
              blockhash: retrySignedTransaction.message.recentBlockhash,
              lastValidBlockHeight: await connection.getBlockHeight() + 150,
            }, 'confirmed');

            const newToken = {
              mint: mintKeypair.publicKey.toString(),
              name: tokenData.name,
              symbol: tokenData.symbol,
              signature: retrySignature,
              timestamp: new Date().toISOString()
            };

            setCreatedTokens(prev => [newToken, ...prev]);
            setCreationStatus(`Token created successfully! Mint: ${mintKeypair.publicKey.toString()}`);

            if (onTokenCreationSuccess) {
              onTokenCreationSuccess();
            }
          } else {
            throw new Error('Retry failed: ' + sendError.message);
          }
        } else {
          throw sendError;
        }
      }

    } catch (error) {
      console.error('Error creating token:', error);
      setCreationStatus(`Error: ${error.message}`);
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.symbol || !formData.description) {
      console.error('Please fill in required fields (Name, Symbol, Description)');
      setCreationStatus('Error: Please fill in required fields (Name, Symbol, Description).');
      return;
    }
    createToken(formData);
  };

  const handleImportSuccess = (chatData) => {
    setCreatedChatData(chatData);
    setShowImportForm(false);
    setCreationStatus('Token imported and chat created successfully!');
  };

  return (
    <>
      <AnimatePresence mode="wait"> {/* Use AnimatePresence here */}
        {!showImportForm ? (
          <motion.div
            key="create-form" // Unique key for the creation form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-white rounded-xl p-6 border border-gray-200 mb-2 max-w-2xl shadow-sm">
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
                      disabled={isCreatingToken}
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
                      disabled={isCreatingToken}
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
                    disabled={isCreatingToken}
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
                      disabled={isCreatingToken}
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
                      disabled={isCreatingToken}
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
                      disabled={isCreatingToken}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="token-image-upload" className="block text-sm font-medium text-gray-600 mb-2">
                      Image*
                    </label>
                    <div
                      className={`flex items-center space-x-2 w-full p-1 border-1 rounded-lg transition-colors duration-200 ${
                        isDraggingOver ? 'border-black bg-gray-50 border-dashed' : 'border-gray-300 border-solid'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        id="token-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isCreatingToken}
                      />
                      <label
                        htmlFor="token-image-upload"
                        className="cursor-pointer bg-black text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50"
                      >
                        Choose File
                      </label>
                      <span className="text-gray-700 text-sm flex-1 truncate">
                        {formData.image ? `Selected: ${formData.image.name}` : 'No file chosen'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Buy Amount (SOL)
                    </label>
                    <input
                      type="number"
                      name="devBuyAmount"
                      value={formData.devBuyAmount}
                      onChange={handleInputChange}
                      placeholder="0.1"
                      step="0.01"
                      min="0.005"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                      disabled={isCreatingToken}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingToken || isCreatingChat}
                  className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCreatingToken ? 'Creating Token...' : isCreatingChat ? 'Setting up Chat...' : 'Create +'}
                </button>
              </form>
            </div>
            <div
              className='flex justify-center mb-4 text-sm underline text-zinc-400 cursor-pointer'
              onClick={() => setShowImportForm(true)}
            >
              or import an existing token
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="import-form" // Unique key for the import form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <ImportTokenForChat
              publicKey={publicKey}
              onImportSuccess={handleImportSuccess}
            />
            <div
              className='flex justify-center mb-4 text-sm underline text-zinc-400 cursor-pointer'
              onClick={() => setShowImportForm(false)}
            >
              or create a new token
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status and Notification components remain outside AnimatePresence if you want them always visible */}
      {creationStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">{creationStatus}</p>
        </div>
      )}

      {createdChatData && (
        <ChatSuccessNotification
          chatData={createdChatData}
          onViewChat={(chatId) => {
            window.location.href = `/${chatId}`;
          }}
          onDismiss={() => setCreatedChatData(null)}
        />
      )}

      {chatCreationStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800">{chatCreationStatus}</p>
        </div>
      )}

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
    </>
  );
}