import { useState } from 'react';
import {
  X,
  AlertCircle,
  Upload,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import api from '../../utils/api';

export default function AddRoomModal({ isOpen, onClose, propertyId, onRoomAdded, propertyType, propertyAmenities = [], onAmenityAdded }) {
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomType: 'single',
    floor: '1',
    monthlyRate: '',
    capacity: '1',
    pricingModel: 'full_room', // 'full_room' or 'per_bed'
    description: '',
    amenities: [],
    images: []
  });

  const [previewImages, setPreviewImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAmenity, setNewAmenity] = useState('');

  // Use property amenities directly
  const amenitiesList = Array.isArray(propertyAmenities) && propertyAmenities.length > 0
    ? propertyAmenities
    : [];

  const allRoomTypes = [
    { value: 'single', label: 'Single Room' },
    { value: 'double', label: 'Double Room' },
    { value: 'quad', label: 'Quad Room' },
    { value: 'bedSpacer', label: 'Bed Spacer' }
  ];

  // Filter room types: exclude Bed Spacer for apartments
  const roomTypes = propertyType?.toLowerCase() === 'apartment'
    ? allRoomTypes.filter(rt => rt.value !== 'bedSpacer')
    : allRoomTypes;

  const floors = Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}${getOrdinalSuffix(i + 1)} Floor`
  }));

  function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  const handleInputChange = (field, value) => {
    let updated = { ...formData, [field]: value };
    
    // Auto-set capacity based on room type (only for fixed room types, not bed spacer)
    if (field === 'roomType') {
      const capacityMap = {
        'single': '1',
        'double': '2',
        'quad': '4'
        // bedSpacer is not auto-filled - user must set it manually
      };
      if (capacityMap[value]) {
        updated.capacity = capacityMap[value];
      }
    }
    
    setFormData(updated);
    if (error) setError('');
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const addNewAmenity = async () => {
    if (!newAmenity.trim()) return;
    
    try {
      // Add amenity to property first
      const token = localStorage.getItem('auth_token');
      await api.post(`/landlord/properties/${propertyId}/amenities`, {
        amenity: newAmenity.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update local amenities list
      propertyAmenities.push(newAmenity.trim());
      
      // Auto-select the newly added amenity for this room
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      
      // Notify parent component to refresh property data
      if (onAmenityAdded) {
        onAmenityAdded();
      }
      
      setNewAmenity('');
    } catch (err) {
      setError('Failed to add amenity: ' + err.message);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.images.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }
    
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviewImages(prev => [...prev, ...newPreviews]);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.roomNumber) {
      setError('Room number is required');
      return;
    }
    if (!formData.monthlyRate || parseFloat(formData.monthlyRate) <= 0) {
      setError('Valid monthly rate is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const payload = new FormData(); 

      // Append non-file fields
      payload.append('property_id', propertyId);
      payload.append('room_number', formData.roomNumber);
      payload.append('room_type', formData.roomType);
      payload.append('floor', parseInt(formData.floor));
      payload.append('monthly_rate', parseFloat(formData.monthlyRate));
      payload.append('capacity', parseInt(formData.capacity));
      payload.append('pricing_model', formData.pricingModel);
      payload.append('description', formData.description || '');
      payload.append('status', 'available');
      formData.amenities.forEach((amenity, idx) => {
        payload.append(`amenities[${idx}]`, amenity);
      });

      // Append image files
      formData.images.forEach((file, idx) => {
        payload.append(`images[${idx}]`, file);
      });

      const result = await api.post('/landlord/rooms', payload, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      });
      const newRoom = result.data;
      
      setFormData({
        roomNumber: '',
        roomType: 'single',
        floor: '1',
        monthlyRate: '',
        capacity: '1',
        pricingModel: 'full_room',
        description: '',
        amenities: [],
        images: []
      });
      setPreviewImages([]);

      if (onRoomAdded) onRoomAdded(newRoom);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
  <div className="flex flex-col fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add New Room</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., 301"
                value={formData.roomNumber}
                onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.roomType}
                onChange={(e) => handleInputChange('roomType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {roomTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₱/month) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="5000"
                value={formData.monthlyRate}
                onChange={(e) => handleInputChange('monthlyRate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.floor}
                onChange={(e) => handleInputChange('floor', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {floors.map(floor => (
                  <option key={floor.value} value={floor.value}>{floor.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 font-normal ml-1">
                  {formData.roomType === 'bedSpacer' ? '(manual set for bed spacer)' : '(auto-set by room type)'}
                </span>
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                min="1"
                max="10"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Pricing Model</h4>
            <p className="text-xs text-gray-600 mb-3">How should tenants pay for this room?</p>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                style={{ backgroundColor: formData.pricingModel === 'full_room' ? '#dbeafe' : 'transparent' }}
              >
                <input
                  type="radio"
                  name="pricingModel"
                  value="full_room"
                  checked={formData.pricingModel === 'full_room'}
                  onChange={(e) => handleInputChange('pricingModel', e.target.value)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Full Room Price</p>
                  <p className="text-xs text-gray-600">
                    {formData.capacity > 1 
                      ? `Tenants divide ₱${formData.monthlyRate || 0} equally (₱${formData.monthlyRate ? Math.round(parseFloat(formData.monthlyRate) / parseInt(formData.capacity)) : 0}/person)`
                      : 'Single tenant pays full price'
                    }
                  </p>
                </div>
              </label>

              {formData.roomType !== 'single' && (
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  style={{ backgroundColor: formData.pricingModel === 'per_bed' ? '#dbeafe' : 'transparent' }}
                >
                  <input
                    type="radio"
                    name="pricingModel"
                    value="per_bed"
                    checked={formData.pricingModel === 'per_bed'}
                    onChange={(e) => handleInputChange('pricingModel', e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Per Bed/Tenant Price</p>
                    <p className="text-xs text-gray-600">
                      Each tenant pays ₱{formData.monthlyRate || 0} for their bed (independent billing)
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Helper text explaining pricing model differences */}
          <div className="mt-3 text-sm text-gray-700">
            {formData.pricingModel === 'per_bed' ? (
              <p>
                Per bed — each tenant pays the listed price for their bed. Use this when beds are rented separately and billed individually.
              </p>
            ) : (
              <>
                <p>
                  Full room — tenants share the listed monthly rent; when multiple tenants occupy the room the amount is split among them.
                </p>
                {formData.capacity && parseInt(formData.capacity) > 1 && formData.monthlyRate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Example: ₱{parseFloat(formData.monthlyRate).toLocaleString()} ÷ {formData.capacity} = ₱{Math.round(parseFloat(formData.monthlyRate) / parseInt(formData.capacity)).toLocaleString()} each
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add room description..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        {/* Amenities */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Room Amenities</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add New Amenity</label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g., Water Heater, Study Lamp"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNewAmenity();
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
              />
              <button
                type="button"
                onClick={addNewAmenity}
                disabled={!newAmenity.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Add amenities that will be available in this room and saved to property</p>
          </div>

          {amenitiesList.length > 0 ? (
            <>
              <p className="text-sm font-medium text-gray-700 mb-3">Property Amenities:</p>
              <div className="grid grid-cols-3 gap-3">
                {amenitiesList.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-4 py-3 rounded-lg border-2 text-left text-sm transition-all ${
                      formData.amenities.includes(amenity)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600 text-sm">No amenities in property yet</p>
              <p className="text-gray-500 text-xs mt-1">Add amenities above to get started</p>
            </div>
          )}
        </div>

        {/* Images */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Room Images</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleImageUpload}
              className="hidden"
              id="room-image-upload"
            />
            
            {previewImages.length === 0 ? (
              <label htmlFor="room-image-upload" className="cursor-pointer block text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm mb-1">Click to upload room images</p>
                <p className="text-gray-500 text-xs">PNG, JPG up to 10MB (Max 10 images)</p>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-3">
                  {previewImages.map((img, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                      <img src={img} alt={`Room ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 10 && (
                    <label
                      htmlFor="room-image-upload"
                      className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <Plus className="w-8 h-8 text-gray-400" />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              Adding...
            </>
          ) : (
            'Add Room'
          )}
        </button>
      </div>
    </div>
  </div>
)};