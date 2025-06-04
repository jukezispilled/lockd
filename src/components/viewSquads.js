// src/app/squad/page.js (or wherever your Squad component resides)
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// TokenImage component now receives imageUrl directly
function TokenImage({ mintAddress, imageUrl, loading }) {
    if (loading) {
        return (
            <div className="w-[96px] h-[96px] rounded-xl bg-gray-100 animate-pulse" />
        );
    }

    if (!imageUrl) {
        return null; // No image found or mint address was not provided
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
                width={96} // Small size for the bottom-left corner
                height={96}
                className="rounded-xl" // Tailwind classes for styling
            />
        </motion.div>
    );
}

export default function Squad() {
    const [groupChats, setGroupChats] = useState([]);
    const [loadingChats, setLoadingChats] = useState(true); // Renamed for clarity
    const [errorChats, setErrorChats] = useState(null); // Renamed for clarity
    const [tokenImages, setTokenImages] = useState({}); // New state to store fetched images
    const [loadingImages, setLoadingImages] = useState(true); // New state for image loading
    const router = useRouter();

    // Fetch group chats
    useEffect(() => {
        async function fetchGroupChats() {
            try {
                const response = await fetch('/api/chat/view');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setGroupChats(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Failed to fetch group chats:", e);
                setErrorChats(e.message);
            } finally {
                setLoadingChats(false);
            }
        }

        fetchGroupChats();
    }, []);

    // Fetch token images for all unique mint addresses after group chats are loaded
    useEffect(() => {
        if (!loadingChats && groupChats.length > 0) {
            const uniqueMintAddresses = [...new Set(
                groupChats
                    .map(chat => chat.tokenMint)
                    .filter(mint => mint) // Filter out null/undefined mints
            )];

            if (uniqueMintAddresses.length === 0) {
                setLoadingImages(false);
                return;
            }

            async function fetchAllTokenImages() {
                setLoadingImages(true);
                try {
                    const response = await fetch('/api/token-image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ mintAddresses: uniqueMintAddresses }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to fetch token images.');
                    }

                    const data = await response.json();
                    if (data.results) {
                        const imagesMap = {};
                        data.results.forEach(result => {
                            imagesMap[result.mintAddress] = result.imageUrl;
                        });
                        setTokenImages(imagesMap);
                    }
                } catch (err) {
                    console.error("Error fetching all token images:", err);
                    // You might want to handle this error more gracefully,
                    // perhaps showing a broken image or a default placeholder.
                } finally {
                    setLoadingImages(false);
                }
            }

            fetchAllTokenImages();
        } else if (!loadingChats && groupChats.length === 0) {
            setLoadingImages(false); // No chats, no images to fetch
        }
    }, [groupChats, loadingChats]); // Re-run when groupChats or loadingChats changes

    const handleChatClick = useCallback((chatId) => { // Use useCallback for memoization
        router.push(`/${chatId}`);
    }, [router]);

    if (loadingChats) {
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

    if (errorChats) {
        return (
            <motion.div
                key="error-comp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex justify-center items-center text-red-500"
            >
                Error: {errorChats}
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
                        className="h-[200px] w-full max-w-[250px] border rounded-2xl bg-black shadow-lg p-2 flex flex-col justify-between relative"
                        onClick={() => handleChatClick(chat._id)}
                    >
                        <div>
                            <div className='absolute top-2 left-2 w-[60%]'>
                                <p className="text-white text-xl font-semibold break-words line-clamp-2">
                                    {chat.name || "Untitled Group Chat"}
                                </p>
                                <p className="text-gray-400 text-base line-clamp-2">
                                    {`(${chat.tokenSym})` || ""}
                                </p>
                            </div>
                            {/* Display abbreviated tokenMint here */}
                            <p className="text-gray-400 text-[11px] line-clamp-2 absolute top-2 right-2">
                                {chat.tokenMint
                                    ? `${chat.tokenMint.slice(0, 3)}...${chat.tokenMint.slice(-4)}`
                                    : "No associated token."}
                            </p>
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                {chat.description || ""}
                            </p>
                        </div>
                        {/* The empty div where the image will be rendered */}
                        <div className='absolute bottom-2 left-2 z-10'>
                            {/* Pass the fetched imageUrl and loading state to TokenImage */}
                            {chat.tokenMint && (
                                <TokenImage
                                    mintAddress={chat.tokenMint}
                                    imageUrl={tokenImages[chat.tokenMint]} // Get image from the map
                                    loading={loadingImages} // Pass global image loading state
                                />
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
}