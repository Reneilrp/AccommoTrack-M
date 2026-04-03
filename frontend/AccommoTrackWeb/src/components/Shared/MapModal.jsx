import React from 'react';
import { X, MapPin, ExternalLink } from 'lucide-react';

/**
 * MapModal — shows property location using an OpenStreetMap iframe embed.
 * No API key required. Falls back to a link if lat/lng are missing.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - latitude: number | null
 *  - longitude: number | null
 *  - title: string (property name)
 *  - address: string (full address text)
 */
export default function MapModal({ isOpen, onClose, latitude, longitude, title = 'Property', address = '' }) {
  if (!isOpen) return null;

  const hasCoords = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude);
  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.005},${longitude + 0.005},${latitude + 0.005}&layer=mapnik&marker=${latitude},${longitude}`
    : null;
  const osmLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
              <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h2>
              {address && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{address}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: 400 }}>
          {hasCoords ? (
            <iframe
              title="Property Location"
              src={osmUrl}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900">
              <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Location coordinates not available</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">The property owner hasn't set map coordinates yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasCoords && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
            <a
              href={osmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
            >
              Open in OpenStreetMap <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
