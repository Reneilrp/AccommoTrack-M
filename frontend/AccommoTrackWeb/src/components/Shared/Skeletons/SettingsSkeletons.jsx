import React from 'react';
import { Skeleton } from './BaseSkeletons';

/**
 * Skeleton for Account Security tab
 */
export const SkeletonAccountTab = () => (
  <div className="w-full md:w-[40%] min-w-[300px] space-y-8">
    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
      <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-40 mb-2 animate-pulse" />
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-64 mb-4 animate-pulse" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    </div>

    <div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-36 animate-pulse" />
            <div className="h-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2 gap-4 mt-4">
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for Notifications tab
 */
export const SkeletonNotificationsTab = () => (
  <div className="space-y-8">
    <div className="space-y-6">
      {[...Array(2)].map((_, section) => (
        <div key={section}>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-56 animate-pulse" />
                </div>
                <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for Appearance tab
 */
export const SkeletonAppearanceTab = () => (
  <div className="space-y-8">
    <div className="space-y-4">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
        ))}
      </div>
    </div>

    <div className="space-y-4">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
        ))}
      </div>
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
      </div>
    </div>

    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    </div>
  </div>
);
