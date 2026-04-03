const BASE_URL = import.meta.env.VITE_APP_URL;
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || `${BASE_URL}/storage`;

/**
 * Get proper image URL from storage path
 * @param {string|object} imageSource - Image path string or image object from database
 * @returns {string|null} Full image URL
 */
export const getImageUrl = (imageSource) => {
    if (!imageSource) return null;

    // Handle object input (e.g. { image_url: '...', image_path: '...' })
    let imagePath = '';
    if (typeof imageSource === 'object') {
        imagePath = imageSource.image_url || imageSource.url || imageSource.image_path || imageSource.image || '';
    } else {
        imagePath = imageSource;
    }

    if (!imagePath || typeof imagePath !== 'string') return null;
    
    // Reject placeholder URLs
    if (imagePath.includes('via.placeholder.com') || imagePath.includes('placehold.co')) {
        return null;
    }
    
    let finalUrl = '';

    // If it's a full URL, ensure it uses the current BASE_URL domain if it's a local storage link
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        try {
            const url = new URL(imagePath);
            const storageMarker = '/storage/';
            const markerIndex = url.pathname.indexOf(storageMarker);
            
            if (markerIndex !== -1) {
                const storagePath = url.pathname.substring(markerIndex + 1);
                finalUrl = `${BASE_URL}/${storagePath}`;
            } else {
                finalUrl = imagePath;
            }
        } catch (__err) {
            finalUrl = imagePath;
        }
    } else {
        const cleanPath = imagePath.replace(/^\/+/, '');
        
        // Ensure we don't double up on storage/
        if (cleanPath.startsWith('storage/')) {
            finalUrl = `${BASE_URL}/${cleanPath}`;
        } else {
            // Check if it already has property_images or similar prefix
            finalUrl = `${STORAGE_URL}/${cleanPath}`;
        }
    }

    // Add cache buster to force browser to re-check after symlink fix
    return finalUrl ? `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : null;
};
