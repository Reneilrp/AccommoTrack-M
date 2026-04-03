import { BASE_URL } from '../config';

/**
 * Get proper image URL from storage path for Mobile
 * @param {string|object} imageSource - Image path string or image object from database
 * @returns {string|null} Full image URL
 */
export const getImageUrl = (imageSource) => {
    if (!imageSource) return null;

    // Handle object input (e.g. { image_url: '...', image_path: '...', image: '...' })
    let imagePath = '';
    if (typeof imageSource === 'object') {
        imagePath = imageSource.image_url || imageSource.url || imageSource.image_path || imageSource.image || '';
    } else {
        imagePath = imageSource;
    }

    if (!imagePath || typeof imagePath !== 'string') return null;
    
    imagePath = imagePath.trim();

    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    const cleanPath = imagePath.replace(/^\/+/, '');
    
    // Logic for relative paths
    if (cleanPath.startsWith('storage/')) {
        return `${BASE_URL}/${cleanPath}`;
    }
    
    // Default storage prefix
    return `${BASE_URL}/storage/${cleanPath}`;
};

/**
 * Get avatar URL using UI Avatars or profile image
 * @param {string|object} nameOrObj - Name string or user object
 * @param {number} size - Avatar size
 * @returns {string} URL string
 */
export const getAvatarUrl = (nameOrObj, size = 128) => {
    let nameStr = '';
    let profileImage = null;

    if (!nameOrObj) {
        nameStr = 'User';
    } else if (typeof nameOrObj === 'object') {
        profileImage = nameOrObj.profile_image || nameOrObj.image || nameOrObj.avatar;
        
        if (nameOrObj.first_name || nameOrObj.last_name) {
            nameStr = `${nameOrObj.first_name || ''} ${nameOrObj.last_name || ''}`.trim();
        } else {
            nameStr = nameOrObj.name || nameOrObj.username || 'User';
        }
    } else {
        nameStr = String(nameOrObj).trim();
    }

    if (profileImage) {
        const url = getImageUrl(profileImage);
        if (url) return url;
    }

    if (!nameStr) nameStr = 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=random&size=${size}`;
};
