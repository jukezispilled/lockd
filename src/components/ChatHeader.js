"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';

import { FiCopy, FiCheck } from 'react-icons/fi'; // Example using react-icons

// Component to fetch and display the token image
function TokenImage({ mintAddress }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mintAddress) {
      setLoading(false);
      return;
    }

    async function fetchTokenImage() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/token-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mintAddress }), // Sending a single mint address
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch token image.');
        }

        const data = await response.json(); // data will be an object: { "mintAddress": "imageUrl" }
        console.log("TokenImage received data:", data); // Debugging log

        // Extract the imageUrl for the specific mintAddress
        if (data && typeof data === 'object' && data[mintAddress]) {
          setImageUrl(data[mintAddress]);
        } else {
          // Handle cases where mintAddress is not found in the response object
          console.warn(`Image URL not found in response for mint: ${mintAddress}`, data);
          setImageUrl(null);
        }

      } catch (err) {
        console.error("Error fetching token image for", mintAddress, ":", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTokenImage();
  }, [mintAddress]); // Re-fetch when mintAddress changes

  if (loading) {
    return (
      <div className="w-[82px] h-[82px] rounded-xl bg-gray-100 animate-pulse" />
    );
  }

  if (error) {
    return <div className="text-red-500 text-xs">Image error.</div>;
  }

  if (!imageUrl) {
    return null; // No image found or mint address was not provided, or image not found in response
  }

  return (
    <AnimatePresence>
      <motion.div
        key="image-area"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        <Image
          src={imageUrl}
          alt={`Image for token ${mintAddress}`}
          width={82} // Small size for the bottom-left corner
          height={82}
          className="rounded-xl" // Tailwind classes for styling
        />
      </motion.div>
    </AnimatePresence>
  );
}

export const ChatHeader = ({ chatData }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copiedMint, setCopiedMint] = useState(null);

  const handleCopyClick = useCallback(async (event, tokenMint) => {
    event.stopPropagation(); // Prevent the card's onClick from firing
    try {
      await navigator.clipboard.writeText(tokenMint);
      setCopiedMint(tokenMint);
      setTimeout(() => {
        setCopiedMint(null); // Reset the icon after a short delay
      }, 1500); // 1.5 seconds
    } catch (err) {
      console.error("Failed to copy token mint:", err);
    }
  }, []);

  if (!chatData) return null;

  return (
    <>
      <div className="bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-full text-2xl"
            >
              ⬅️
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{chatData.name} • ({chatData.tokenSym})</h1>
              <AnimatePresence>
                <motion.div 
                    className="flex items-center cursor-pointer"
                    whileTap={{ scale: 0.75 }} // Scale down on tap
                    transition={{ duration: 0.1 }}
                    onClick={(e) => handleCopyClick(e, chatData.tokenMint)}
                >
                    {chatData.tokenMint && (
                    <div
                        className="mr-1" // Add margin-right for spacing
                    >
                        {copiedMint === chatData.tokenMint ? (
                        <FiCheck className="text-gray-400" size={16} />
                        ) : (
                        <FiCopy className="text-gray-400" size={16} />
                        )}
                    </div>
                    )}
                    <p className="text-gray-400 text-sm line-clamp-2">
                    {chatData.tokenMint
                        ? `${chatData.tokenMint.slice(0, 3)}...${chatData.tokenMint.slice(-4)}`
                        : "No associated token."}
                    </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {chatData.tokenMint && <TokenImage mintAddress={chatData.tokenMint} />}
          </div>
        </div>
      </div>

      {/* Chat Details Dropdown */}
      {showDetails && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-600">Token Mint:</span>
                <p className="font-mono text-xs break-all">{chatData.tokenMint}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <p>{new Date(chatData.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Creator:</span>
              <p className="font-mono text-xs">{chatData.creatorPublicKey}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};