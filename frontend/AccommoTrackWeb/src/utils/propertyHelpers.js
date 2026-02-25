import { getImageUrl } from './api';

// Helper: Map backend room to UI room
export const mapRoom = (room) => {
  if (!room) return null;
  // Robust amenity parsing
  let parsedAmenities = [];
  if (Array.isArray(room.amenities)) {
    parsedAmenities = room.amenities;
  } else if (typeof room.amenities === 'string') {
    try {
      const parsed = JSON.parse(room.amenities);
      if (Array.isArray(parsed)) parsedAmenities = parsed;
    } catch (e) { /* ignore */ }
  }

  const status = (room.status || 'available').toString().trim().toLowerCase();

  return {
    id: room.id,
    name: room.room_type || room.type_label || 'Room',
    room_number: room.room_number,
    floor: room.floor,
    floor_label: room.floor_label,
    raw_capacity: room.capacity,
    image: getImageUrl(room.images && room.images.length > 0 ? room.images[0] : null) || 'https://via.placeholder.com/400x200?text=No+Image',
    images: (room.images || []).map(img => getImageUrl(img)),
    // keep `price` for older consumers, but expose canonical fields expected by modal
    price: room.monthly_rate || room.price || 0,
    monthly_rate: room.monthly_rate ?? room.monthlyRate ?? room.price ?? 0,
    daily_rate: room.daily_rate ?? room.dailyRate ?? Math.round((room.monthly_rate || room.price || 0) / 30),
    billing_policy: room.billing_policy || room.billingPolicy || 'monthly',
    status,
    reserved_by_me: room.reserved_by_me || false,
    reservation: room.reservation || null,
    size: room.size || '',
    capacity: room.capacity ? `${room.capacity} Person${room.capacity > 1 ? 's' : ''}` : '',
    description: room.description || '',
    amenities: parsedAmenities,
    rules: room.rules || [],
  };
};

// Helper: Map backend property to UI property
export const mapProperty = (property) => {
  if (!property) return null;
  return {
    id: property.id,
    name: property.title || property.name,
    location: property.full_address || property.city || '',
    address: property.full_address || property.city || '', // For Map
    latitude: property.latitude,
    longitude: property.longitude,
    lowest_price: property.lowest_price || (Array.isArray(property.rooms) && property.rooms.length > 0 ? Math.min(...property.rooms.map(r => r.monthly_rate)) : null),
    type: property.property_type || 'Apartment', // Default to Apartment if missing
    description: property.description || '',
    rating: property.rating || null,
    rooms: Array.isArray(property.rooms) ? property.rooms.map(mapRoom).filter(Boolean) : [],
  };
};
