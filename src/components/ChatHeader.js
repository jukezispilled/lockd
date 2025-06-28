"use client";

import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useCallback, memo } from 'react'; // Import memo
import Image from 'next/image';

import { FiCopy, FiCheck, FiArrowLeft } from 'react-icons/fi'; // Import FiArrowLeft

// Component to fetch and display the token image
const TokenImage = memo(function TokenImage({ mintAddress }) { // Wrapped with memo
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mintAddress) {
      setLoading(false);
      return;
    }

    // Use AbortController for robust fetching and cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    async function fetchTokenImage() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/token-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mintAddress }),
          signal: signal, // Pass the signal to the fetch request
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch token image.');
        }

        const data = await response.json();
        // Only update state if the request hasn't been aborted
        if (!signal.aborted) {
          if (data && typeof data === 'object' && data[mintAddress]) {
            setImageUrl(data[mintAddress]);
          } else {
            console.warn(`Image URL not found in response for mint: ${mintAddress}`, data);
            setImageUrl(null);
          }
        }
      } catch (err) {
        // Handle abort error gracefully, preventing state updates on unmounted component
        if (err.name === 'AbortError') {
          console.log('Fetch aborted for', mintAddress);
        } else {
          console.error("Error fetching token image for", mintAddress, ":", err);
          setError(err.message);
        }
      } finally {
        // Only set loading to false if the request wasn't aborted
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchTokenImage();

    // Cleanup function: abort the fetch request if the component unmounts
    // or if mintAddress changes before the current fetch completes
    return () => {
      abortController.abort();
    };
  }, [mintAddress]); // Re-fetch when mintAddress changes

  if (loading) {
    return (
      <div className="w-[82px] h-[82px] rounded-xl bg-gray-200 animate-pulse" />
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
});

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
      <div className="bg-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => (window.location.href = '/')}
              className="p-2 rounded-full text-2xl"
              aria-label="Go back" // Added for accessibility
            >
              <FiArrowLeft size={24} /> {/* Replaced emoji with icon */}
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{chatData.name} • ({chatData.tokenSym})</h1>
                <div
                    className="flex items-center cursor-pointer"
                    onClick={(e) => handleCopyClick(e, chatData.tokenMint)}
                >
                    {chatData.tokenMint && (
                    <div
                        className="mr-1" // Add margin-right for spacing
                    >
                        {copiedMint === chatData.tokenMint ? (
                        <FiCheck className="text-gray-400" size={14} />
                        ) : (
                        <FiCopy className="text-gray-400" size={14} />
                        )}
                    </div>
                    )}
                    <p className="text-gray-400 text-sm line-clamp-2">
                    {chatData.tokenMint
                        ? `${chatData.tokenMint.slice(0, 3)}...${chatData.tokenMint.slice(-4)}`
                        : "No associated token."}
                    </p>
                </div>
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