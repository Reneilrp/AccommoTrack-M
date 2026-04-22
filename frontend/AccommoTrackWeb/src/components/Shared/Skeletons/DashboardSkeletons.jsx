import React from 'react';
import { Skeleton, SkeletonAvatar } from './BaseSkeletons';

/**
 * Skeleton for dashboard stat cards
 */
export const SkeletonStatCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton className="h-3 w-24 mb-4" />
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
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse ${height}`}>
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
    <div className="flex items-end justify-around h-40 gap-2">
      {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
        <Skeleton key={i} className="w-8 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

/**
 * Skeleton for tenant dashboard current stay card
 */
export const SkeletonCurrentStay = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 animate-pulse">
    {/* Hero image */}
    <div className="h-48 bg-gray-200 dark:bg-gray-700" />
    
    {/* Content */}
    <div className="p-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      
      {/* Landlord info */}
      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
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
 * Skeleton for booking cards
 */
export const SkeletonBookingCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <Skeleton className="h-4 w-48 mb-2" />
    <Skeleton className="h-4 w-40 mb-4" />
    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  </div>
);
