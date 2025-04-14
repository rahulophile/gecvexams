import React, { useEffect } from 'react';
import { IoMdClose } from "react-icons/io";
import { IoCheckmarkCircle, IoWarning, IoInformation, IoClose } from "react-icons/io5";

const CustomAlert = ({ 
  isOpen, 
  onClose, 
  type = "info", // "success", "error", "warning", "info"
  title,
  message,
  autoClose = 5000 // Changed from 1000 to 5000 (5 seconds)
}) => {
  if (!isOpen) return null;

  // Auto close timer
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, autoClose);
    return () => clearTimeout(timer);
  }, [autoClose, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <IoCheckmarkCircle className="text-green-500 text-2xl" />;
      case "error":
        return <IoClose className="text-red-500 text-2xl" />;
      case "warning":
        return <IoWarning className="text-yellow-500 text-2xl" />;
      default:
        return <IoInformation className="text-blue-500 text-2xl" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-500";
      case "error":
        return "bg-red-50 border-red-500";
      case "warning":
        return "bg-yellow-50 border-yellow-500";
      default:
        return "bg-blue-50 border-blue-500";
    }
  };

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto z-[100]">
      <div 
        className={`w-full md:w-96 border-l-4 rounded-lg shadow-lg ${getColors()} relative z-[101]`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div className="flex-grow min-w-0">
              <h3 className="text-base md:text-lg font-medium text-gray-900 break-words">
                {title}
              </h3>
              <div className="mt-1 text-xs md:text-sm text-gray-600 break-words">
                {message}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 -mr-1 p-1 md:p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              <IoMdClose className="text-gray-400 hover:text-gray-500 w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert; 