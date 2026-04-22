import React, { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Check, ArrowRight } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../utils/api';
import StepIndicators from './components/AddProperty/StepIndicators';
import GeneralRoomStep from './components/AddRoom/GeneralRoomStep';
import ConfigurationStep from './components/AddRoom/ConfigurationStep';
import PricingStep from './components/AddRoom/PricingStep';
import RoomGalleryStep from './components/AddRoom/RoomGalleryStep';

const STEPS = [
  { id: 1, label: 'General' },
  { id: 2, label: 'Config' },
  { id: 3, label: 'Pricing' },
  { id: 4, label: 'Photos' }
];

export default function AddRoom({ propertyId, onBack, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  
  const [formData, setFormData] = useState({
    room_number: '',
    floor_level: '',
    room_type: 'single',
    billing_policy: 'monthly',
    description: '',
    total_beds: 1,
    number_of_bathrooms: 1,
    is_aircon: false,
    has_private_bathroom: true,
    price: '',
    security_deposit: '',
    reservation_fee: '',
    status: 'available',
    images: []
  });

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => { const n = {...prev}; delete n[field]; return n; });
  }, [fieldErrors]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('property_id', propertyId);
      
      Object.keys(formData).forEach(key => {
        if (key === 'images') {
           formData.images.forEach(img => payload.append('images[]', img.file));
        } else {
           payload.append(key, formData[key]);
        }
      });

      const res = await api.post(`/landlord/properties/${propertyId}/rooms`, payload);
      showSuccess('Room added successfully!');
      if (onSave) onSave(res.data);
      onBack();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Room</h1>
      </div>

      <StepIndicators currentStep={currentStep} steps={STEPS} />

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 min-h-[450px]">
        {currentStep === 1 && <GeneralRoomStep data={formData} onChange={handleInputChange} errors={fieldErrors} />}
        {currentStep === 2 && <ConfigurationStep data={formData} onChange={handleInputChange} errors={fieldErrors} />}
        {currentStep === 3 && <PricingStep data={formData} onChange={handleInputChange} errors={fieldErrors} />}
        {currentStep === 4 && (
          <RoomGalleryStep 
            images={formData.images}
            onUploadImage={(file) => setFormData(prev => ({ ...prev, images: [...prev.images, { file, preview: URL.createObjectURL(file) }] }))}
            onRemoveImage={(idx) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
            onSetThumbnail={(idx) => setFormData(prev => ({ ...prev, images: prev.images.map((img, i) => ({ ...img, isThumbnail: i === idx })) }))}
          />
        )}
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 1 || loading}
          className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        >
          Back
        </button>
        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Confirm Room
          </button>
        )}
      </div>
    </div>
  );
}