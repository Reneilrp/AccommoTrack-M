import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { usePreferences } from '../../contexts/PreferencesContext';

// --- CUSTOM HOUSE ICON ---
const houseSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.4)"/>
  </filter>
  <path d="M12 2L2 11h2.5v10h6v-6h3v6h6v-10h2.5L12 2z" fill="#16a34a" stroke="#ffffff" stroke-width="1.5" filter="url(#shadow)"/>
</svg>
`);

const houseIcon = L.icon({
    iconUrl: `data:image/svg+xml;utf8,${houseSvg}`,
    iconSize: [42, 42],
    iconAnchor: [21, 40], // Bottom-center anchor
    popupAnchor: [0, -40]
});

// Component to update map center when properties change
const MapUpdater = ({ properties }) => {
    const map = useMap();

    useEffect(() => {
        if (properties.length > 0) {
            const bounds = L.latLngBounds(properties.map(p => [p.latitude, p.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [properties, map]);

    return null;
};

// Component to fly to a specific property when selected externally
const MapController = ({ centerOn }) => {
    const map = useMap();
    const lastIdRef = useRef(null);

    useEffect(() => {
        if (centerOn && centerOn.latitude && centerOn.longitude) {
            // Only fly if ID changed to prevent jitter/vibration on repeated clicks
            if (lastIdRef.current !== centerOn.id) {
                map.flyTo([centerOn.latitude, centerOn.longitude], 16, { duration: 1.5 });
                lastIdRef.current = centerOn.id;
            }
        }
    }, [centerOn, map]);

    return null;
};

const PropertyMap = ({ properties, onMarkerClick, centerOn }) => {
    const { effectiveTheme } = usePreferences();
    
    // Default center (Manila)
    const defaultCenter = [14.5995, 120.9842]; 

    // Filter properties with valid coordinates
    const validProperties = properties.filter(p => p.latitude && p.longitude);

    // Map tiles based on theme
    const tileUrl = effectiveTheme === 'dark' 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    return (
        <MapContainer 
            center={defaultCenter} 
            zoom={12} 
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
            zoomControl={false} // Disable default zoom controls (+/-)
        >
            <TileLayer
                url={tileUrl}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {/* Only auto-fit bounds if we are NOT focusing on a specific item, or strictly on mount */}
            {!centerOn && <MapUpdater properties={validProperties} />}
            
            <MapController centerOn={centerOn} />

            {validProperties.map((property) => (
                <Marker 
                    key={property.id} 
                    position={[property.latitude, property.longitude]}
                    icon={houseIcon}
                    eventHandlers={{
                        click: (e) => {
                            if (onMarkerClick) onMarkerClick(property);
                        }
                    }}
                />
            ))}
        </MapContainer>
    );
};

export default PropertyMap;
