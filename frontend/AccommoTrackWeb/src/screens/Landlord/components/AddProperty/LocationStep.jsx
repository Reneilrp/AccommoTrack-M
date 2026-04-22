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
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Location Details
        </h3>
        <p className="text-sm text-gray-500">Provide the exact location of your property.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Street Address *</label>
          <input
            type="text"
            value={data.streetAddress}
            onChange={(e) => onDataChange('streetAddress', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.streetAddress ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:text-white transition-all`}
            placeholder="No. 123 Rizal St."
          />
          {errors.streetAddress && <p className="text-xs text-red-500 mt-1">{errors.streetAddress}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Barangay *</label>
          <input
            type="text"
            value={data.barangay}
            onChange={(e) => onDataChange('barangay', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.barangay ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:text-white transition-all`}
            placeholder="e.g. San Jose"
          />
          {errors.barangay && <p className="text-xs text-red-500 mt-1">{errors.barangay}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">City *</label>
          <input
            type="text"
            value={data.city}
            onChange={(e) => onDataChange('city', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.city ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:text-white transition-all`}
            placeholder="e.g. Pagadian City"
          />
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Postal Code *</label>
          <input
            type="text"
            value={data.postalCode}
            onChange={(e) => onDataChange('postalCode', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.postalCode ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:text-white transition-all`}
            placeholder="e.g. 7016"
          />
          {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode}</p>}
        </div>
      </div>

      <div className="h-64 md:h-80 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative z-0">
        <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={tileUrl} />
          <Marker position={position} />
          <MapEvents onLocationSelect={onLocationSelect} />
        </MapContainer>
        <div className="absolute bottom-4 left-4 z-[400] bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-[10px] font-bold text-gray-500 uppercase">
          Click map to set precise location
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Latitude</label>
          <input type="text" value={data.latitude} readOnly className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg text-xs dark:text-gray-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Longitude</label>
          <input type="text" value={data.longitude} readOnly className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg text-xs dark:text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default memo(LocationStep);