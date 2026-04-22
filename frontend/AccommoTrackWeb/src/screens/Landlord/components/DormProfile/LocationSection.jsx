import React, { memo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Custom green marker
const greenMarkerSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#10B981" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="3" fill="#ffffff" />
  </svg>
`);
const greenMarkerIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,${greenMarkerSvg}`,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -36],
});

const MapEvents = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocationSection = ({ lat, lng, address, onLocationSelect, onAddressChange, isEditing }) => {
  const position = [lat || 14.5995, lng || 120.9842];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Location Details
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Street Address</label>
          <textarea
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            disabled={!isEditing}
            rows={2}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none dark:text-white resize-none disabled:opacity-60"
            placeholder="Detailed address (Street, Brgy, City)..."
          />
        </div>

        <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 relative z-0">
          <MapContainer center={position} zoom={15} style={{ h: '100%', w: '100%' }} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={position} icon={greenMarkerIcon} />
            {isEditing && <MapEvents onLocationSelect={onLocationSelect} />}
          </MapContainer>
          {isEditing && (
            <div className="absolute bottom-4 left-4 z-[400] bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-[10px] font-bold text-gray-500 uppercase">
              Click map to set precise location
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Latitude</label>
            <input type="text" value={lat} readOnly className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg text-xs dark:text-gray-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Longitude</label>
            <input type="text" value={lng} readOnly className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg text-xs dark:text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(LocationSection);