import React from 'react';
import { Skeleton, SkeletonAvatar } from './BaseSkeletons';

/**
 * Skeleton for property cards
 */
export const SkeletonPropertyCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
    {/* Image placeholder */}
    <div className="h-48 bg-gray-200 dark:bg-gray-700" />
    
    {/* Content */}
    <div className="p-4">
      {/* Title and status */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      {/* Stats row */}
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for booking cards (mobile view)
 */
export const SkeletonBookingCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
    <div className="flex items-start gap-4">
      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton for conversation list items
 */
export const SkeletonConversation = () => (
  <div className="flex items-center gap-4 p-4 animate-pulse">
    <SkeletonAvatar size="lg" />
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  </div>
);

/**
 * Skeleton for room cards (matching RoomManagement)
 */
export const SkeletonRoomCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse flex flex-col h-full">
    <div className="relative h-48 bg-gray-200 dark:bg-gray-700" />
    <div className="p-4 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded" />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
      <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  </div>
);
