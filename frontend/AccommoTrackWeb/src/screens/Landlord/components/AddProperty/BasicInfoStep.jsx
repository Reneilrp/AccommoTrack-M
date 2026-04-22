import React, { memo } from 'react';

const BasicInfoStep = ({ data, onChange, errors }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Basic Information</h3>
        <p className="text-sm text-gray-500">Tell us about your property's identity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Property Name *</label>
          <input
            type="text"
            value={data.propertyName}
            onChange={(e) => onChange('propertyName', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.propertyName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all`}
            placeholder="e.g. Skyline Apartments"
          />
          {errors.propertyName && <p className="text-xs text-red-500 mt-1">{errors.propertyName}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Property Type *</label>
          <select
            value={data.propertyType}
            onChange={(e) => onChange('propertyType', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.propertyType ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all`}
          >
            <option value="">Select a type...</option>
            <option value="apartment">Apartment</option>
            <option value="dormitory">Dormitory</option>
            <option value="boarding_house">Boarding House</option>
            <option value="condominium">Condominium</option>
            <option value="other">Other</option>
          </select>
          {errors.propertyType && <p className="text-xs text-red-500 mt-1">{errors.propertyType}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Sex Restriction *</label>
          <select
            value={data.sexRestriction}
            onChange={(e) => onChange('sexRestriction', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
          >
            <option value="mixed">Mixed / All Welcome</option>
            <option value="male_only">Male Only</option>
            <option value="female_only">Female Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Business Permit Number</label>
          <input
            type="text"
            value={data.permitNumber}
            onChange={(e) => onChange('permitNumber', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            placeholder="Optional permit ID"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white resize-none"
          placeholder="Describe your property, target tenants, or unique selling points..."
        />
      </div>
    </div>
  );
};

export default memo(BasicInfoStep);