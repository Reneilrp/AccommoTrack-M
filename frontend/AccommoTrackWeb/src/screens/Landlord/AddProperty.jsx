import { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Loader2, ArrowRight, Check, ShieldAlert, Clock, AlertCircle } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../utils/api';
import { usePreferences } from '../../contexts/PreferencesContext';
import StepIndicators from './components/AddProperty/StepIndicators';
import BasicInfoStep from './components/AddProperty/BasicInfoStep';
import LocationStep from './components/AddProperty/LocationStep';
import AmenitiesStep from './components/AddProperty/AmenitiesStep';
import GalleryStep from './components/AddProperty/GalleryStep';
import RulesStep from './components/AddProperty/RulesStep';

const LANDLORD_ACCESS_STATUSES = ['approved', 'partial_verified', 'pending_documents_review'];

const STEPS = [
  { id: 1, label: 'Info' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Gallery' },
  { id: 4, label: 'Rules' }
];

export default function AddProperty({ onBack, onSave }) {
  const { effectiveTheme } = usePreferences();
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; } }, []);
  const isCaretaker = user?.role === 'caretaker';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isVerified, setIsVerified] = useState(null);
  
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyType: '',
    description: '',
    sexRestriction: 'mixed',
    streetAddress: '',
    barangay: '',
    city: '',
    provinceRegion: 'Zamboanga Del Sur',
    postalCode: '',
    latitude: 14.5995,
    longitude: 120.9842,
    amenities: [],
    customAmenities: [],
    rules: [],
    images: [],
    video: null
  });

  const [newCustomAmenity, setNewCustomAmenity] = useState('');
  const [newRule, setNewRule] = useState('');

  useEffect(() => {
    const checkVerification = async () => {
      if (isCaretaker) { setIsVerified(true); return; }
      try {
        const res = await api.get('/landlord/my-verification');
        setIsVerified(LANDLORD_ACCESS_STATUSES.includes(res.data?.status));
      } catch { setIsVerified(false); }
    };
    checkVerification();
  }, [isCaretaker]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => { const n = {...prev}; delete n[field]; return n; });
  }, [fieldErrors]);

  const handleToggleAmenity = useCallback((amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity) ? prev.amenities.filter(a => a !== amenity) : [...prev.amenities, amenity]
    }));
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'images') {
           formData.images.forEach(img => payload.append('images[]', img.file));
        } else if (key === 'amenities' || key === 'rules') {
           payload.append(key, JSON.stringify(formData[key]));
        } else {
           payload.append(key, formData[key]);
        }
      });

      const res = await api.post('/landlord/properties', payload);
      showSuccess('Property created successfully!');
      if (onSave) onSave(res.data);
      onBack();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const tileUrl = effectiveTheme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">List Your Property</h1>
      </div>

      <StepIndicators currentStep={currentStep} steps={STEPS} />

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px]">
        {currentStep === 1 && (
          <BasicInfoStep 
            data={formData} 
            onChange={handleInputChange} 
            errors={fieldErrors} 
          />
        )}
        {currentStep === 2 && (
          <LocationStep 
            data={formData} 
            onLocationSelect={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
            onDataChange={handleInputChange}
            errors={fieldErrors}
            tileUrl={tileUrl}
          />
        )}
        {currentStep === 3 && (
          <AmenitiesStep
            selectedAmenities={formData.amenities}
            onToggleAmenity={handleToggleAmenity}
            customAmenities={formData.customAmenities}
            onAddCustom={() => {
              if (newCustomAmenity.trim()) {
                setFormData(prev => ({ ...prev, customAmenities: [...prev.customAmenities, newCustomAmenity.trim()] }));
                setNewCustomAmenity('');
              }
            }}
            onRemoveCustom={(idx) => {
              setFormData(prev => ({ ...prev, customAmenities: prev.customAmenities.filter((_, i) => i !== idx) }));
            }}
            newCustomValue={newCustomAmenity}
            onCustomValueChange={setNewCustomAmenity}
          />
        )}
        {currentStep === 4 && (
          <GalleryStep 
            images={formData.images}
            onUploadImage={(file) => setFormData(prev => ({ ...prev, images: [...prev.images, { file, preview: URL.createObjectURL(file) }] }))}
            onRemoveImage={(idx) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
            onSetThumbnail={(idx) => setFormData(prev => ({ ...prev, images: prev.images.map((img, i) => ({ ...img, isThumbnail: i === idx })) }))}
          />
        )}
        {currentStep === 5 && (
          <RulesStep 
            rules={formData.rules}
            newRuleValue={newRule}
            onRuleValueChange={setNewRule}
            onAddRule={() => { if (newRule.trim()) { setFormData(prev => ({ ...prev, rules: [...prev.rules, newRule.trim()] })); setNewRule(''); } }}
            onRemoveRule={(idx) => setFormData(prev => ({ ...prev, rules: prev.rules.filter((_, i) => i !== idx) }))}
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
        {currentStep < 5 ? (
          <button
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !isVerified}
            className="flex items-center gap-2 px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Submit Listing
          </button>
        )}
      </div>

      {!isVerified && isVerified !== null && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Verification Required:</strong> You need to complete your landlord registration before submitting properties for approval.
          </p>
        </div>
      )}
    </div>
  );
}