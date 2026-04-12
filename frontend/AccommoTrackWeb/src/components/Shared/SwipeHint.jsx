import React from 'react';
 
const SwipeHint = () => (
  <div className="md:hidden mt-5 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest select-none">
    <div className="w-5 h-px bg-gray-300 dark:bg-gray-600" />
    <span>Swipe for more</span>
    <div className="w-5 h-px bg-gray-300 dark:bg-gray-600" />
  </div>
);
 
export default SwipeHint;