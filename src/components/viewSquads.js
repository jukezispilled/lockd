"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
                const response = await fetch('/api/token-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ mintAddress }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch token image.');
                }

                const data = await response.json();
                setImageUrl(data.imageUrl);
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
        return <div className="text-gray-500 text-xs">Loading image...</div>;
    }

    if (error) {
        return <div className="text-red-500 text-xs">Image error.</div>;
    }

    if (!imageUrl) {
        return null; // No image found or mint address was not provided
    }

    return (
        <Image
            src={imageUrl}
            alt={`Image for token ${mintAddress}`}
            width={64} // Small size for the bottom-left corner
            height={64}
            className="rounded-full" // Tailwind classes for styling
        />
    );
}

export default function Squad() {
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchGroupChats() {
      try {
        const response = await fetch('/api/chat/view'); // Your API route for group chats
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setGroupChats(data);
      } catch (e) {
        console.error("Failed to fetch group chats:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGroupChats();
  }, []);

  const handleChatClick = (chatId) => {
    router.push(`/${chatId}`);
  };

  if (loading) {
    return (
      <motion.div
        key="loading-comp"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="flex justify-center items-center text-gray-600"
      >
        Loading group chats...
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        key="error-comp"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-center items-center text-red-500"
      >
        Error: {error}
      </motion.div>
    );
  }

  if (groupChats.length === 0) {
    return (
      <motion.div
        key="no-chats-comp"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-center items-center"
      >
        No group chats found.
      </motion.div>
    );
  }

  return (
    <motion.div
        key="tokenz-comp"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-center items-center cursor-pointer p-4"
    >
        <AnimatePresence>
            {groupChats.map((chat) => (
            <motion.div
                key={chat._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="h-[200px] w-full max-w-[250px] border rounded-2xl bg-black shadow-lg p-4 flex flex-col justify-between relative"
                onClick={() => handleChatClick(chat._id)}
            >
                <div>
                    <h3 className="text-white text-lg font-semibold truncate">
                        {chat.name || "Untitled Group Chat"}
                    </h3>
                    {/* Display abbreviated tokenMint here */}
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                    {chat.tokenMint
                        ? `Token: ${chat.tokenMint.slice(0, 4)}...${chat.tokenMint.slice(-4)}`
                        : "No associated token."}
                    </p>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {chat.description || "No description provided."}
                    </p>
                </div>
                <div className="mt-2 text-right">
                    <span className="text-gray-500 text-xs">
                        Members: {chat.members ? chat.members.length : 0}
                    </span>
                </div>
                {/* The empty div where the image will be rendered */}
                <div className='absolute bottom-2 left-2 z-10'>
                    {/* Render the TokenImage component if tokenMint exists */}
                    {chat.tokenMint && <TokenImage mintAddress={chat.tokenMint} />}
                </div>
            </motion.div>
            ))}
        </AnimatePresence>
    </motion.div>
  );
}