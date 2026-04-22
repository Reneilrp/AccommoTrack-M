import React, { memo } from 'react';

const BasicInfoStep = ({ data, onChange, errors, user }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white shrink-0">Basic Information</h2>
          {Object.keys(errors || {}).some(k => ['propertyName', 'propertyType', 'otherPropertyType'].includes(k)) && (
            <p className="text-red-600 text-xs font-bold animate-in fade-in slide-in-from-left-2">
              {['propertyName', 'propertyType', 'otherPropertyType'].map(k => errors[k]).filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Sunset Apartments"
              value={data.propertyName}
              onChange={(e) => onChange('propertyName', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.propertyName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors?.propertyName && <p className="text-red-500 text-xs mt-2">{errors.propertyName}</p>}
          </div>

          <div className={data.propertyType === 'other' || data.propertyType === 'others' ? 'col-span-1' : 'col-span-2'}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={data.propertyType}
              onChange={(e) => onChange('propertyType', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.propertyType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="" disabled hidden>Select type</option>
              <option value="dormitory">Dormitory</option>
              <option value="apartment">Apartment</option>
              <option value="boardingHouse">Boarding House</option>
              <option value="bedSpacer">Bed Spacer</option>
              <option value="other">Others</option>
            </select>
            {errors?.propertyType && <p className="text-red-500 text-xs mt-2">{errors.propertyType}</p>}
          </div>

          {(data.propertyType === 'other' || data.propertyType === 'others') && (
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Specify <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Studio"
                value={data.otherPropertyType || ''}
                onChange={(e) => onChange('otherPropertyType', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.otherPropertyType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors?.otherPropertyType && <p className="text-red-500 text-xs mt-2">{errors.otherPropertyType}</p>}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            placeholder="Provide a detailed description of the property, including any special features, nearby conveniences, and other relevant info"
            value={data.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Property Specifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bathrooms
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g., 1"
                value={data.number_of_bathrooms || ''}
                onChange={(e) => onChange('number_of_bathrooms', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Rooms
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g., 10"
                value={data.totalRooms || ''}
                onChange={(e) => onChange('totalRooms', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              {data.propertyType !== 'apartment' && (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sex Restriction <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.sexRestriction || 'mixed'}
                    onChange={(e) => onChange('sexRestriction', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="mixed">Mixed (Any Sex)</option>
                    <option value="male">Boys Only</option>
                    <option value="female">Girls Only</option>
                  </select>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Floors
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g., 3"
                value={data.total_floors || ''}
                onChange={(e) => {
                  onChange('total_floors', e.target.value);
                  // Reset managed floors when total floors change
                  onChange('floor_level', '');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Managed Floors UI */}
            {data.total_floors && parseInt(data.total_floors) > 1 && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Managed Floors (Select floors you manage)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const totalFloors = parseInt(data.total_floors);
                      const selectedFloors = (data.floor_level || '').split(',').filter(f => f && !isNaN(f));
                      const allSelected = selectedFloors.length === totalFloors;
                      onChange('floor_level', allSelected ? '' : Array.from({ length: totalFloors }, (_, i) => i + 1).join(','));
                    }}
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
                  >
                    {((data.floor_level || '').split(',').filter(f => f && !isNaN(f)).length === parseInt(data.total_floors)) ? 'Unselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: parseInt(data.total_floors) }, (_, i) => i + 1).map((floor) => (
                    <label
                      key={floor}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 cursor-pointer transition-all ${
                        (data.floor_level || '').split(',').includes(String(floor))
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 hover:border-green-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={(data.floor_level || '').split(',').includes(String(floor))}
                        onChange={(e) => {
                          const current = (data.floor_level || '').split(',').filter(f => f && !isNaN(f));
                          const next = e.target.checked
                            ? [...current, String(floor)].sort((a, b) => a - b)
                            : current.filter((f) => f !== String(floor));
                          onChange('floor_level', next.join(','));
                        }}
                      />
                      {floor}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Selected floors will be the only ones available when adding rooms.
                </p>
              </div>
            )}

            <div className="md:col-span-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
              <label className="flex items-start space-x-4 cursor-pointer group mb-6">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    checked={data.require1MonthAdvance}
                    onChange={(e) => onChange('require1MonthAdvance', e.target.checked)}
                    className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Require 1-Month Advance Payment
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    If enabled, tenants will be billed for their first month's rent plus an additional month as an advance payment upon booking confirmation. This setting will operate as the default for all rooms, but can be overridden per room.
                  </span>
                </div>
              </label>

              <label className={`flex items-start space-x-4 group ${(!user?.is_paymongo_ready) ? 'opacity-60' : 'cursor-pointer'} mt-6 mb-6`}>
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    disabled={!user?.is_paymongo_ready}
                    checked={data.requireReservationFee}
                    onChange={(e) => onChange('requireReservationFee', e.target.checked)}
                    className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-colors disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col w-full">
                  <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors">
                    Require Instant Reservation Fee
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    If enabled, tenants must pay a non-refundable reservation fee immediately to secure their booking request.
                    {!user?.is_paymongo_ready && (
                      <span className="text-red-500 block mt-2">You must complete PayMongo onboarding to enable instant payments.</span>
                    )}
                  </span>
                  {data.requireReservationFee && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reservation Fee Amount (₱)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.reservationFeeAmount}
                        onChange={(e) => onChange('reservationFeeAmount', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white transition-all duration-200 shadow-sm"
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-start space-x-4 cursor-pointer group">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    checked={data.allowPartialPayments}
                    onChange={(e) => onChange('allowPartialPayments', e.target.checked)}
                    className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Allow Partial Payments
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    If enabled, tenants can pay their invoice balance in smaller increments. If disabled, they will be required to pay the full remaining invoice balance in a single transaction.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-4 cursor-pointer group mt-6">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    checked={data.forceWalletRefunds}
                    onChange={(e) => onChange('forceWalletRefunds', e.target.checked)}
                    className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Force Excess Refunds to App Wallet
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    If enabled, excess credits from room transfers will automatically be converted to tenant wallet credits. If disabled, tenants can choose between wallet credits or requesting manual cash refunds.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(BasicInfoStep);