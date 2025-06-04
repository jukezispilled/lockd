// components/ChatHeader.js

"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';

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
                // *** IMPORTANT CHANGE HERE ***
                // Send mintAddress inside an array as per the new API route
                const response = await fetch('/api/token-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ mintAddresses: [mintAddress] }), // Now sending an array
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch token image.');
                }

                const data = await response.json();
                // *** IMPORTANT CHANGE HERE ***
                // The API now returns an object with a 'results' array
                // and each result has 'imageUrl' and 'mintAddress'
                if (data.results && data.results.length > 0) {
                    const tokenData = data.results[0]; // Get the first (and only) result
                    setImageUrl(tokenData.imageUrl);
                } else {
                    setImageUrl(null); // No image found for this mint
                    setError('Image URL not found for this token.');
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
        return null; // No image found or mint address was not provided
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
              <p className="text-sm text-gray-500">{chatData.tokenMint.slice(0, 3)}...{chatData.tokenMint.slice(-4)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* The TokenImage component will now send an array to the API and parse the results correctly */}
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