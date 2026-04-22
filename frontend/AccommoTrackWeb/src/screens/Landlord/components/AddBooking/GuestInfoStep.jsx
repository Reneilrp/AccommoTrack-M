import React, { memo } from 'react';
import { Users, Mail, Phone } from 'lucide-react';

const GuestInfoStep = ({ data, onDataChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Guest Information
        </h3>
        <p className="text-sm text-gray-500">Enter the primary tenant's details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">First Name *</label>
          <input
            type="text"
            value={data.first_name}
            onChange={(e) => onDataChange('first_name', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Last Name *</label>
          <input
            type="text"
            value={data.last_name}
            onChange={(e) => onDataChange('last_name', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            placeholder="Doe"
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Email Address *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={data.email}
              onChange={(e) => onDataChange('email', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              placeholder="john@example.com"
            />
          </div>
        </div>
        <div className="relative">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => onDataChange('phone', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              placeholder="0917XXXXXXX"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(GuestInfoStep);