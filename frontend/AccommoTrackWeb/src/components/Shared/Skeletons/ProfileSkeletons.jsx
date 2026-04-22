import React from 'react';
import { Skeleton, SkeletonAvatar } from './BaseSkeletons';

/**
 * Skeleton for Profile/Edit Profile Tab
 */
export const SkeletonProfileTab = () => (
  <div className="animate-pulse">
    {/* Profile Image Section */}
    <div className="flex items-center gap-6 mb-8">
      <div className="relative">
        <Skeleton className="w-24 h-24 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-5 w-28 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
    
    {/* Form Fields */}
    <div className="space-y-6">
      {/* Name Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>
      
      {/* Contact Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>
      
      {/* Address */}
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
      
      {/* Emergency Contact Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton for Preferences & Lifestyle Tab
 */
export const SkeletonPreferencesTab = () => (
  <div className="animate-pulse">
    {/* Basic Preferences */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {[...Array(2)].map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </div>
    
    {/* Personal Traits Section */}
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
      <Skeleton className="h-5 w-44 mb-2" />
      <Skeleton className="h-4 w-80 mb-6" />
      
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className={`w-full rounded-lg ${i === 2 ? 'h-24' : 'h-11'}`} />
          </div>
        ))}
      </div>
    </div>
  </div>
);
