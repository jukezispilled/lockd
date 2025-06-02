"use client";

import { motion, AnimatePresence } from 'framer-motion';

export default function Squad() {
  return (
    <motion.div
        key="tokenz-comp"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-3 lg:grid-cols-4 gap-4 justify-center items-center cursor-pointer"
    >
        {Array.from({ length: 12 }).map((_, i) => (
        <div
            key={i}
            className="h-[200px] w-[200px] border rounded-2xl hover:scale-[102%] transition duration-250 ease-in-out bg-black shadow-lg"
        ></div>
        ))}
    </motion.div>
  );
}