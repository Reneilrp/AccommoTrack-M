import React from 'react';

/**
 * Base Skeleton component for loading states
 */
export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  />
);

/**
 * Skeleton for text lines
 */
export const SkeletonText = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
      />
    ))}
  </div>
);

/**
 * Skeleton for circular avatars
 */
export const SkeletonAvatar = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };
  return <Skeleton className={`${sizes[size]} rounded-full ${className}`} />;
};

/**
 * Skeleton for property cards
 */
export const SkeletonPropertyCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
    {/* Image placeholder */}
    <div className="h-48 bg-gray-200" />
    
    {/* Content */}
    <div className="p-4">
      {/* Title and status */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      {/* Stats row */}
      <div className="flex gap-4 mb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for table rows
 */
export const SkeletonTableRow = ({ columns = 5 }) => (
  <tr className="animate-pulse">
    {[...Array(columns)].map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton className={`h-4 ${i === 0 ? 'w-32' : i === columns - 1 ? 'w-20' : 'w-24'}`} />
      </td>
    ))}
  </tr>
);

/**
 * Skeleton for booking cards (mobile view)
 */
export const SkeletonBookingCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
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
  <div className="flex items-center gap-3 p-4 animate-pulse">
    <SkeletonAvatar size="lg" />
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  </div>
);

/**
 * Skeleton for dashboard stat cards
 */
export const SkeletonStatCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
  </div>
);

/**
 * Skeleton for chart containers
 */
export const SkeletonChart = ({ height = 'h-64' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse ${height}`}>
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
    <div className="flex items-end justify-around h-40 gap-2">
      {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
        <Skeleton key={i} className="w-8 rounded-t" style={{ height: `${height}%` }} />
      ))}
    </div>
  </div>
);

/**
 * Skeleton for tenant dashboard current stay card
 */
export const SkeletonCurrentStay = () => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-pulse">
    {/* Hero image */}
    <div className="h-48 bg-gray-200" />
    
    {/* Content */}
    <div className="p-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-50 p-4 rounded-lg">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      
      {/* Landlord info */}
      <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
        <SkeletonAvatar size="lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for room cards (matching RoomManagement)
 */
export const SkeletonRoomCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse flex flex-col h-full">
    <div className="relative h-48 bg-gray-200" />
    <div className="p-4 flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded" />
      </div>
      <div className="flex items-center gap-4 mb-3">
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex gap-1 mb-3">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
      <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  </div>
);

export default Skeleton;
