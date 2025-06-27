// components/Banner.jsx
"use client"; // This is important for client-side interactivity

import React, { useState } from 'react';

const Banner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const textToCopy = "CA"; // Assuming "CA" is the text to copy

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert("Text copied: " + textToCopy); // Added an alert for user feedback
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleCloseClick = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-gray-200 py-0.25 px-2 text-center relative flex items-center justify-center gap-2.5 border-b border-gray-300">
      <span
        onClick={handleCopyClick}
        className="cursor-pointer font-bold text-xs md:text-xs text-gray-700 flex-grow"
        title="Click to copy"
      >
        CA: unrevealed
      </span>
      <button
        onClick={handleCloseClick}
        className="bg-transparent border-none text-xl cursor-pointer text-gray-500 p-0 leading-none"
        aria-label="Close banner"
      >
        &times;
      </button>
    </div>
  );
};

export default Banner;