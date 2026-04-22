import React, { useState, useEffect, useCallback, memo } from 'react';
import { X, Loader2, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../utils/api';
import propertyService from '../../services/propertyService';
import StepIndicators from './components/AddProperty/StepIndicators';
import PropertyRoomStep from './components/AddBooking/PropertyRoomStep';
import GuestInfoStep from './components/AddBooking/GuestInfoStep';
import PaymentDatesStep from './components/AddBooking/PaymentDatesStep';

const STEPS = [
  { id: 1, label: 'Property' },
  { id: 2, label: 'Guest' },
  { id: 3, label: 'Dates' }
];

const AddBookingModal = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  
  const [formData, setFormData] = useState({
    property_id: '',
    room_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    require_deposit: true,
    deposit_amount: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchProperties();
      setCurrentStep(1);
    }
  }, [isOpen]);

  const fetchProperties = async () => {
    const res = await propertyService.getProperties();
    if (res.success) setProperties(res.data);
  };

  const fetchRooms = async (propId) => {
    setLoadingRooms(true);
    const res = await propertyService.getRooms(propId, { status: 'available' });
    if (res.success) setRooms(res.data);
    setLoadingRooms(false);
  };

  const handleDataChange = useCallback((field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'property_id') fetchRooms(value);
      if (field === 'room_id') {
         const room = rooms.find(r => String(r.id) === String(value));
         if (room) next.deposit_amount = room.security_deposit || room.price;
      }
      return next;
    });
  }, [rooms]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/landlord/bookings/manual', formData);
      showSuccess('Manual booking created!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedRoom = rooms.find(r => String(r.id) === String(formData.room_id));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">New Manual Booking</h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Step {currentStep} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          <StepIndicators currentStep={currentStep} steps={STEPS} />
          
          <div className="mt-10 min-h-[350px]">
            {currentStep === 1 && (
              <PropertyRoomStep 
                properties={properties} 
                rooms={rooms} 
                selectedPropertyId={formData.property_id}
                selectedRoomId={formData.room_id}
                onPropertyChange={(val) => handleDataChange('property_id', val)}
                onRoomChange={(val) => handleDataChange('room_id', val)}
                loadingRooms={loadingRooms}
              />
            )}
            {currentStep === 2 && (
              <GuestInfoStep data={formData} onDataChange={handleDataChange} />
            )}
            {currentStep === 3 && (
              <PaymentDatesStep 
                data={formData} 
                onDataChange={handleDataChange} 
                roomPrice={selectedRoom?.price} 
              />
            )}
          </div>
        </div>

        <div className="px-8 py-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-white transition-all disabled:opacity-0"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={currentStep === 1 && !formData.room_id}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
            >
              Next Step <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Confirm Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(AddBookingModal);