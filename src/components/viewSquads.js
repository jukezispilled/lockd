"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Import icons (you might need to install a library like 'react-icons' or use SVG directly)
import { FiCopy, FiCheck, FiSearch, FiX } from 'react-icons/fi'; // Added FiSearch and FiX

// TokenImage component now receives imageUrl directly
function TokenImage({ imageUrl, mintAddress }) { // Added mintAddress for alt text
  if (!imageUrl) {
    return null; // No image found
  }

  return (
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
        width={96}
        height={96}
        className="rounded-xl"
      />
    </motion.div>
  );
}

export default function Squad({ refreshTrigger, isRefreshing }) {
  const [groupChats, setGroupChats] = useState([]);
  const [tokenImages, setTokenImages] = useState({}); // Stores mintAddress -> imageUrl map
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // New state for search
  const router = useRouter();
  const [copiedMint, setCopiedMint] = useState(null); // State to track which mint was copied

  // Function to fetch group chats
  const fetchGroupChats = useCallback(async () => {
    setLoadingChats(true);
    setError(null);
    try {
      const response = await fetch('/api/chat/view');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGroupChats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch group chats:", e);
      setError(e.message);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // Function to fetch token images
  const fetchTokenImages = useCallback(async (chats) => {
    const mintAddresses = chats
      .map(chat => chat.tokenMint)
      .filter(Boolean); // Filter out null/undefined values

    if (mintAddresses.length > 0) {
      setLoadingImages(true);
      try {
        const response = await fetch('/api/token-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mintAddress: mintAddresses }), // Send array of mint addresses
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch token images.');
        }

        const data = await response.json();
        setTokenImages(data); // `data` should be the map: { mintAddress: imageUrl, ... }
      } catch (err) {
        console.error("Error fetching all token images:", err);
        // Decide how to handle errors for multiple images.
        // For now, individual errors will just result in no image being shown.
      } finally {
        setLoadingImages(false);
      }
    }
  }, []);

  // Filter group chats based on search query
  const filteredGroupChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupChats;
    }

    const query = searchQuery.toLowerCase();
    return groupChats.filter(chat => {
      const name = (chat.name || '').toLowerCase();
      const symbol = (chat.tokenSym || '').toLowerCase();
      const tokenMint = (chat.tokenMint || '').toLowerCase();

      return name.includes(query) || 
             symbol.includes(query) || 
             tokenMint.includes(query);
    });
  }, [groupChats, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchGroupChats();
  }, [fetchGroupChats]);

  // Fetch token images once group chats are loaded
  useEffect(() => {
    if (!loadingChats && groupChats.length > 0) {
      fetchTokenImages(groupChats);
    }
  }, [loadingChats, groupChats, fetchTokenImages]);

  // Handle refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger > 0) {
      // Clear existing data first for better UX
      setTokenImages({});
      fetchGroupChats();
    }
  }, [refreshTrigger, fetchGroupChats]);

  const handleChatClick = useCallback((chatId) => {
    router.push(`/${chatId}`);
  }, [router]);

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

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Show loading state when refreshing or initially loading
  const showLoading = loadingChats || isRefreshing;

  if (showLoading) {
    return (
      <motion.div
        key="loading-comp"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="flex h-[80dvh] justify-center items-center text-gray-600"
      >
        {isRefreshing ? 'Refreshing squads...' : 'Loading squads...'}
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
        No squads found.
      </motion.div>
    );
  }

  return (
    <div className='mt-[10%] md:mt-[7%]'>
      <div className="text-4xl md:text-7xl font-bold text-center mb-1 text-black">Find Your Squad.</div>
      <div className="text-sm md:text-lg font-bold text-center mb-4 text-gray-600">it&apos;s time to get lockd in</div>
      
      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto mb-6 px-4"
      >
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, ticker, or CA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:border-transparent outline-none transition-all duration-200 bg-white shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors duration-200"
            >
              <FiX className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
        
        {/* Search Results Count */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-sm text-gray-500 text-center"
          >
            {filteredGroupChats.length} squad{filteredGroupChats.length !== 1 ? 's' : ''} found
            {filteredGroupChats.length !== groupChats.length && ` out of ${groupChats.length} total`}
          </motion.div>
        )}
      </motion.div>

      {/* No Search Results */}
      {searchQuery && filteredGroupChats.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col justify-center items-center py-12 text-gray-500"
        >
          <div className="text-lg mb-2">No squads found for &quot;{searchQuery}&quot;</div>
          <button
            onClick={clearSearch}
            className="text-zinc-600 hover:text-zinc-800 underline transition-colors duration-200"
          >
            Clear search to see all squads
          </button>
        </motion.div>
      )}

      {/* Squad Grid */}
      {filteredGroupChats.length > 0 && (
        <motion.div
          key="tokenz-comp"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start cursor-pointer p-4 justify-items-center ${
            isRefreshing ? 'opacity-70 pointer-events-none' : ''
          }`}
        >
          <AnimatePresence>
            {filteredGroupChats.map((chat) => (
              <motion.div
                key={chat._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="h-[200px] w-full max-w-[350px] md:max-w-[250px] rounded-2xl bg-zinc-950 shadow-sm p-2 flex flex-col justify-between relative"
                onClick={() => handleChatClick(chat._id)}
              >
                <div>
                  <div className='absolute top-2 left-2 w-[55%]'>
                    <p className="text-gray-100 text-xl font-semibold break-words line-clamp-2">
                      {chat.name || "Untitled Group Chat"}
                    </p>
                    <p className="text-gray-500 text-sm line-clamp-2">
                      {`(${chat.tokenSym})` || ""}
                    </p>
                  </div>
                  <motion.div 
                    className="absolute top-2 right-2 flex items-center"
                    whileTap={{ scale: 0.75 }} // Scale down on tap
                    transition={{ duration: 0.1 }}
                    onClick={(e) => handleCopyClick(e, chat.tokenMint)}
                  >
                    {chat.tokenMint && (
                      <div
                        className="cursor-pointer mr-[2px]" // Add margin-right for spacing
                      >
                        {copiedMint === chat.tokenMint ? (
                          <FiCheck className="text-gray-400" size={10} />
                        ) : (
                          <FiCopy className="text-gray-400" size={10} />
                        )}
                      </div>
                    )}
                    <p className="text-gray-400 text-[9px] line-clamp-2">
                      {chat.tokenMint
                        ? `${chat.tokenMint.slice(0, 3)}...${chat.tokenMint.slice(-4)}`
                        : "No associated token."}
                    </p>
                  </motion.div>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                    {chat.description || ""}
                  </p>
                </div>
                <div className='absolute bottom-2 left-2 z-10'>
                  {/* Only render TokenImage if tokenMint exists and image data is loaded */}
                  {chat.tokenMint && !loadingImages && tokenImages[chat.tokenMint] && (
                    <TokenImage imageUrl={tokenImages[chat.tokenMint]} mintAddress={chat.tokenMint} />
                  )}
                  {/* Show loading state for images */}
                  {chat.tokenMint && loadingImages && (
                     <div className="w-[96px] h-[96px] rounded-xl bg-gray-100 animate-pulse" />
                  )}
                   {chat.tokenMint && !loadingImages && !tokenImages[chat.tokenMint] && (
                     <div className="text-red-500 text-xs">Image not found.</div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}