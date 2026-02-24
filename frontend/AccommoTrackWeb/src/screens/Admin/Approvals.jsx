import React, { useState } from 'react';
import PropertyApproval from './PropertyApproval';
import LandlordApproval from './LandlordApproval';

export default function Approvals() {
  const [activeTab, setActiveTab] = useState('landlords');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approvals Center</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage pending landlord verifications and property listings.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('landlords')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors
              ${activeTab === 'landlords'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}
            `}
          >
            Landlord Verifications
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors
              ${activeTab === 'properties'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}
            `}
          >
            Property Listings
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {activeTab === 'landlords' ? (
          <LandlordApproval />
        ) : (
          <PropertyApproval isEmbedded={true} />
        )}
      </div>
    </div>
  );
}
