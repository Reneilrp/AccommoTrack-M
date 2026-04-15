import { getImageUrl } from './api';

// Helper: Map backend room to UI room
export const mapRoom = (room) => {
  if (!room) return null;
  const toWholeNumber = (value, fallback = null) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.floor(value) : fallback;
    }

    if (typeof value === 'string') {
      const match = value.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    }

    return fallback;
  };

  const rawCapacity = toWholeNumber(room.capacity ?? room.raw_capacity, 0);
  const availableSlots = toWholeNumber(room.available_slots ?? room.availableSlots, null);
  const explicitOccupied = toWholeNumber(room.occupied_count ?? room.occupied, null);
  const occupiedCount = explicitOccupied !== null
    ? explicitOccupied
    : (availableSlots !== null && rawCapacity > 0 ? Math.max(0, rawCapacity - availableSlots) : 0);

  // Robust amenity parsing
  let parsedAmenities = [];
  if (Array.isArray(room.amenities)) {
    parsedAmenities = room.amenities;
  } else if (typeof room.amenities === 'string') {
    try {
      const parsed = JSON.parse(room.amenities);
      if (Array.isArray(parsed)) parsedAmenities = parsed;
    } catch { /* ignore */ }
  }

  const status = (room.status || 'available').toString().trim().toLowerCase();
  const displayStatus = (room.display_status || room.displayStatus || status).toString().trim().toLowerCase();

  return {
    id: room.id,
    name: room.room_type || room.type_label || 'Room',
    room_type: room.room_type || room.roomType || null,
    type_label: room.type_label || room.typeLabel || null,
    room_number: room.room_number,
    sex_restriction: room.sex_restriction || room.sexRestriction || 'mixed',
    floor: room.floor,
    floor_label: room.floor_label,
    raw_capacity: rawCapacity,
    image: getImageUrl(room.images && room.images.length > 0 ? room.images[0] : null) || 'https://via.placeholder.com/400x200?text=No+Image',
    images: (room.images || []).map(img => getImageUrl(img)),
    // keep `price` for older consumers, but expose canonical fields expected by modal
    price: Number(room.monthly_rate || room.price || 0),
    monthly_rate: Number(room.monthly_rate ?? room.monthlyRate ?? room.price ?? 0),
    daily_rate: Number(room.daily_rate ?? room.dailyRate ?? Math.round((room.monthly_rate || room.price || 0) / 30)),
    billing_policy: room.billing_policy || room.billingPolicy || 'monthly',
    pricing_model: room.pricing_model || room.pricingModel || 'full_room',
    is_available: typeof room.is_available === 'boolean' ? room.is_available : undefined,
    available_slots: availableSlots,
    occupied_count: occupiedCount,
    occupied: occupiedCount,
    status,
    display_status: displayStatus,
    display_status_label: room.display_status_label || room.displayStatusLabel || (displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)),
    reserved_by_me: room.reserved_by_me || false,
    reservation: room.reservation || null,
    size: room.size || '',
    capacity: rawCapacity,
    capacity_label: rawCapacity > 0 ? `${rawCapacity} Person${rawCapacity > 1 ? 's' : ''}` : '',
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
    property_type: property.property_type || property.type || 'apartment',
    location: property.full_address || property.city || '',
    address: property.full_address || property.city || '', // For Map
    latitude: property.latitude,
    longitude: property.longitude,
    lowest_price: property.lowest_price || (Array.isArray(property.rooms) && property.rooms.length > 0 ? Math.min(...property.rooms.map(r => r.monthly_rate)) : null),
    type: property.type || property.property_type || 'Apartment',
    description: property.description || '',
    rating: property.rating || null,
    image: property.image, // Passed from backend map in getAllProperties
    images: property.images || [], // Full array of property images
    video_url: property.video_url, // Passed from backend map in getAllProperties
    rooms: Array.isArray(property.rooms) ? property.rooms.map(mapRoom).filter(Boolean) : [],
  };
};
