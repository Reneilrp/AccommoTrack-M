export const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const getImageUrl = (path) => {
  // This works because Laravel has a symlink from public/storage → storage/app/public
  return `${import.meta.env.VITE_STORAGE_URL}/${path}`;
};

export const apiUrl = (endpoint) => {
  return `${import.meta.env.VITE_API_BASE_URL}${endpoint}`;
};