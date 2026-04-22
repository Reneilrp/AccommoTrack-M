import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { showSuccess, showError } from "../../utils/toast";
import propertyService from "../../services/propertyService";
import LocationSection from "./components/DormProfile/LocationSection";
import AmenitiesSection from "./components/DormProfile/AmenitiesSection";
import HouseRulesSection from "./components/DormProfile/HouseRulesSection";
import GallerySection from "./components/DormProfile/GallerySection";
import LegalDocsSection from "./components/DormProfile/LegalDocsSection";

export default function DormProfileSettings({ propertyId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [dormData, setDormData] = useState(null);

  const fetchDormData = useCallback(async () => {
    setLoading(true);
    const res = await propertyService.getPropertyDetails(propertyId);
    if (res.success) {
      setDormData(res.data);
    } else {
      showError("Failed to load property details");
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchDormData(); }, [fetchDormData]);

  const handleSave = async () => {
    setSubmitting(true);
    const res = await propertyService.updateProperty(propertyId, dormData);
    if (res.success) {
      showSuccess("Property profile updated successfully");
      setIsEditing(false);
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between sticky top-0 z-20 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dormData?.title || "Property Profile"}</h1>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mt-0.5">Settings & Customization</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-green-500/20 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <LocationSection 
            lat={dormData?.latitude} 
            lng={dormData?.longitude} 
            address={dormData?.address}
            onLocationSelect={(lat, lng) => setDormData({ ...dormData, latitude: lat, longitude: lng })}
            onAddressChange={(val) => setDormData({ ...dormData, address: val })}
            isEditing={isEditing}
          />

          <AmenitiesSection 
            selectedAmenities={dormData?.amenities || []}
            customAmenities={dormData?.custom_amenities || []}
            onToggleAmenity={() => {}}
            isEditing={isEditing}
          />

          <HouseRulesSection 
            rules={dormData?.house_rules || []}
            isEditing={isEditing}
          />
        </div>

        <div className="space-y-8">
          <GallerySection 
            images={dormData?.images || []}
            video={dormData?.video}
            isEditing={isEditing}
          />

          <LegalDocsSection 
            docs={dormData?.documents || []}
            isEditing={isEditing}
          />
        </div>
      </div>
    </div>
  );
}