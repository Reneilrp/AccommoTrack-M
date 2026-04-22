import React, { memo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

const MapEvents = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocationStep = ({ data, onLocationSelect, onDataChange, errors, tileUrl }) => {
  const position = [data.latitude || 14.5995, data.longitude || 120.9842];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Map Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-2 mb-4">
          <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Set Property Coordinates</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Drag or click on the map below to set the exact location of your property</p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64 flex items-center justify-center mb-4" style={{ position: 'relative', height: '300px' }}>
          <MapContainer
            center={position}
            zoom={16}
            style={{ height: '100%', width: '100%', borderRadius: '8px' }}
            scrollWheelZoom={true}
          >
            <TileLayer url={tileUrl} />
            <Marker position={position} />
            <MapEvents onLocationSelect={onLocationSelect} />
          </MapContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 shrink-0">Location Details</h2>
          {Object.keys(errors || {}).some(k => ['streetAddress', 'city', 'provinceRegion', 'postalCode', 'barangay'].includes(k)) && (
            <p className="text-red-600 text-xs font-bold animate-in fade-in slide-in-from-left-2">
              {['streetAddress', 'city', 'provinceRegion', 'postalCode', 'barangay'].map(k => errors[k]).filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., 123 Main Street"
              value={data.streetAddress}
              onChange={(e) => onDataChange('streetAddress', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.streetAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors?.streetAddress && <p className="text-red-500 text-xs mt-2">{errors.streetAddress}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Barangay
            </label>
            <input
              type="text"
              placeholder="e.g., Barangay 123"
              value={data.barangay || ''}
              onChange={(e) => onDataChange('barangay', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.barangay ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors?.barangay && <p className="text-red-500 text-xs mt-2">{errors.barangay}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Manila"
              value={data.city}
              onChange={(e) => onDataChange('city', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors?.city && <p className="text-red-500 text-xs mt-2">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Province/Region <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Metro Manila"
              value={data.provinceRegion}
              onChange={(e) => onDataChange('provinceRegion', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.provinceRegion ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              readOnly={data.city?.trim().toLowerCase() === 'zamboanga city'}
            />
            {errors?.provinceRegion && <p className="text-red-500 text-xs mt-2">{errors.provinceRegion}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              placeholder="e.g., 1000"
              value={data.postalCode || ''}
              onChange={(e) => onDataChange('postalCode', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${errors?.postalCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country
            </label>
            <input
              type="text"
              value={data.country || 'Philippines'}
              onChange={(e) => onDataChange('country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nearby Landmarks (Optional)
          </label>
          <textarea
            placeholder="e.g., Near Ateneo de Zamboanga University, 5 mins walk to KCC Mall"
            value={data.nearbyLandmarks || ''}
            onChange={(e) => onDataChange('nearbyLandmarks', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default memo(LocationStep);