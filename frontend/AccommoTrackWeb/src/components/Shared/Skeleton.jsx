import React from 'react';

/**
 * Base Skeleton component for loading states
 */
export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
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
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
    {/* Image placeholder */}
    <div className="h-48 bg-gray-200 dark:bg-gray-700" />
    
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
      <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
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
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
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
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse ${height}`}>
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
            <Skeleton className="h-7 w-16 mb-1" />
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
 * Skeleton for room cards (matching RoomManagement)
 */
export const SkeletonRoomCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse flex flex-col h-full">
    <div className="relative h-48 bg-gray-200 dark:bg-gray-700" />
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
      <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for My Bookings page - Current Stay Tab
 */
export const SkeletonMyBookings = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
    {/* Main Column */}
    <div className="lg:col-span-2 space-y-6">
      {/* Room Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="relative h-48 bg-gray-200 dark:bg-gray-700" />
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <SkeletonAvatar size="lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
    
    {/* Side Column */}
    <div className="space-y-6">
      {/* Addons Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Landlord Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <Skeleton className="h-5 w-28 mb-4" />
        <div className="flex items-center gap-4 mb-4">
          <SkeletonAvatar size="xl" />
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton for Financials Tab (summary cards + tables)
 */
export const SkeletonFinancials = () => (
  <div className="space-y-6 animate-pulse">
    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-10 w-40 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>

    {/* Recent Payments Table Skeleton */}
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {["Date", "Amount", "Method", "Status"].map((h, idx) => (
                <th key={idx} className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <SkeletonTableRow key={i} columns={4} />
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Invoices Table Skeleton */}
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {["Due Date", "Description", "Amount", "Status"].map((h, idx) => (
                <th key={idx} className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Skeleton className="h-4 w-28" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <SkeletonTableRow key={i} columns={4} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

/**
 * Skeleton for History Tab (stacked booking cards)
 */
export const SkeletonHistory = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <SkeletonBookingCard key={i} />
    ))}
  </div>
);

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

/**
 * Skeleton for Tenant Wallet page
 */
export const SkeletonWallet = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
    {/* Stats skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </div>

    {/* Payment History skeleton: container matches TenantWallet structure exactly */}
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="w-48 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />

        <div className="flex items-center gap-2">
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />

          <div className="inline-flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
            {/* four small range button skeletons matching actual layout */}
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Desktop Table View skeleton (matches classes and structure) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <SkeletonTableRow key={i} columns={7} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View skeleton (matches classes) */}
      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4">
            <SkeletonBookingCard />
          </div>
        ))}
      </div>
    </div>
  </div>
);

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
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-36 animate-pulse" />
            <div className="h-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2 gap-3 mt-4">
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
          <div className="space-y-3">
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

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
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

