import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { usePreferences } from '../contexts/PreferencesContext';

// Fix default icon issue in Leaflet with Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function DraggableMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
        },
      }}
    />
  );
}

export default function MapModal({ isOpen, onClose, latitude, longitude, onSelect }) {
  const { effectiveTheme } = usePreferences();
  const [position, setPosition] = React.useState([
    latitude || 6.91202710389216,
    longitude || 122.06186056137086,
  ]);

  React.useEffect(() => {
    setPosition([
      latitude || 6.91202710389216,
      longitude || 122.06186056137086,
    ]);
  }, [latitude, longitude, isOpen]);

  if (!isOpen) return null;

  // Map tiles based on theme
  const tileUrl = effectiveTheme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-xl relative border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Select Property Location</h2>
        <div className="w-full h-96 rounded-xl overflow-hidden mb-6 border border-gray-100 dark:border-gray-700 shadow-inner">
          <MapContainer
            center={position}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={tileUrl}
            />
            <DraggableMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </div>
        <div className="flex justify-end gap-3">
          <button
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 active:scale-95 transition-all"
            onClick={() => {
              onSelect(position);
              onClose();
            }}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
