import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonTableRow } from './BaseSkeletons';
import { SkeletonBookingCard, SkeletonStatCard } from './DashboardSkeletons';

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
                <Skeleton className="h-6 w-20 mb-2" />
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
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded" />
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
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
          <Skeleton className="h-4 w-32 mb-4" />
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
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {["Date", "Amount", "Method", "Status"].map((h, idx) => (
                <th key={idx} className="text-left py-4 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
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
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {["Due Date", "Description", "Amount", "Status"].map((h, idx) => (
                <th key={idx} className="text-left py-4 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
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

          <div className="inline-flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
            {/* four small range button skeletons matching actual layout */}
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-md mx-0.5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Desktop Table View skeleton (matches classes and structure) */}
      <div className="hidden md:block overflow-x-auto no-scrollbar">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <SkeletonTableRow key={i} columns={8} />
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
 * Skeleton for History Tab (stacked booking cards)
 */
export const SkeletonHistory = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <SkeletonBookingCard key={i} />
    ))}
  </div>
);
