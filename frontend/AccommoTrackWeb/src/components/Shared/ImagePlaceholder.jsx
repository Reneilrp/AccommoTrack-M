import React from 'react';
import { Image } from 'lucide-react';

const ImagePlaceholder = ({ className }) => {
  return (
    <div
      className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 ${className}`}
    >
      <Image className="w-1/4 h-1/4" />
    </div>
  );
};

export default ImagePlaceholder;
