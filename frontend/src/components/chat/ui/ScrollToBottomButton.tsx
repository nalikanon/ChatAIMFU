import React from 'react';
import { IoIosArrowDown } from "react-icons/io";

interface ScrollToBottomButtonProps {
  isNearBottom: boolean;
  onClick: () => void;
}

/**
 * Button to scroll down to bottom when user is not at the bottom position
 */
const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ isNearBottom, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`absolute left-1/2 transform -translate-x-1/2 -top-6
                bg-blue-500 hover:bg-blue-600 text-white rounded-full 
                p-2 shadow-lg transition-all duration-300 z-20 ${
                  isNearBottom 
                    ? 'opacity-0 pointer-events-none translate-y-2' 
                    : 'opacity-100 translate-y-0'
                }`}
      aria-label="Scroll to latest messages"
    >
      <IoIosArrowDown className="h-4 w-4" />
    </button>
  );
};

export default ScrollToBottomButton; 