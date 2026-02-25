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
        imagePath = imageSource.image_url || imageSource.url || imageSource.image_path || '';
    } else {
        imagePath = imageSource;
    }

    if (!imagePath || typeof imagePath !== 'string') return null;
    
    // If it's a full URL, ensure it uses the current BASE_URL domain if it's a local storage link
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        try {
            const url = new URL(imagePath);
            const storageMarker = '/storage/';
            const markerIndex = url.pathname.indexOf(storageMarker);
            
            if (markerIndex !== -1) {
                // Preserving the path after the domain
                const storagePath = url.pathname.substring(markerIndex + 1);
                return `${BASE_URL}/${storagePath}`;
            }
        } catch (err) {
            // fallback to original if parsing fails
        }
        return imagePath;
    }
    
    const cleanPath = imagePath.replace(/^\/+/, '');
    
    // Logic for relative paths
    if (cleanPath.startsWith('storage/')) {
        return `${BASE_URL}/${cleanPath}`;
    }
    
    // Default storage prefix
    return `${STORAGE_URL}/${cleanPath}`;
};
