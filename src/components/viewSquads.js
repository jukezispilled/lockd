"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Squad() {
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGroupChats() {
      try {
        const response = await fetch('/api/chat/view'); // Assuming your API route is /api/groupchats
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
  }, []); // The empty dependency array ensures this runs once on mount

  if (loading) {
    return (
      <motion.div
        key="loading-comp"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-center items-center h-screen"
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
        className="flex justify-center items-center h-screen text-red-500"
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
        className="flex justify-center items-center h-screen"
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
                key={chat._id} // Use a unique ID from your chat data
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-[200px] w-full max-w-[250px] border rounded-2xl hover:scale-[102%] transition duration-250 ease-in-out bg-black shadow-lg p-4 flex flex-col justify-between"
            >
                <div>
                    <h3 className="text-white text-lg font-semibold truncate">
                        {chat.name || "Untitled Group Chat"}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {chat.description || "No description provided."}
                    </p>
                </div>
                <div className="mt-2 text-right">
                    <span className="text-gray-500 text-xs">
                        Members: {chat.members ? chat.members.length : 0}
                    </span>
                </div>
            </motion.div>
            ))}
        </AnimatePresence>
    </motion.div>
  );
}