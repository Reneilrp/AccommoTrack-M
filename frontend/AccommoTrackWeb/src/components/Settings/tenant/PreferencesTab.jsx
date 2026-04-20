import React, { useState, useEffect, useCallback } from "react";
import { tenantService } from "../../../services/tenantService";
import { SkeletonPreferencesTab } from "../../Shared/Skeleton";
import { useUIState } from "../../../contexts/UIStateContext";
import { showSuccess, showError } from "../../../utils/toast";

const PreferencesTab = () => {
  const { uiState, updateData } = useUIState();
  const cachedProfile = uiState.data?.profile;

  const [loading, setLoading] = useState(!cachedProfile);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    room_preference: "",
    budget_range: "",
    attitude: "",
    behavior: "",
    lifestyle_notes: "",
    custom_preferences: [],
  });

  const [newPreference, setNewPreference] = useState("");

  const mapDataToForm = useCallback((data) => {
    let prefs = data.tenant_profile?.preference || {};

    if (typeof prefs === "string") {
      try {
        prefs = JSON.parse(prefs);
      } catch (__e) {
        prefs = {};
      }
    }

    setFormData({
      room_preference: prefs.room_preference || "",
      budget_range: prefs.budget_range || "",
      attitude: prefs.attitude || "",
      behavior: prefs.behavior || "",
      lifestyle_notes: prefs.lifestyle_notes || prefs.lifestyle || "",
      custom_preferences: Array.isArray(prefs.custom_preferences) ? prefs.custom_preferences : [],
    });
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      if (!cachedProfile) setLoading(true);
      const res = await tenantService.getProfile();

      if (res.success) {
        mapDataToForm(res.data);
        updateData("profile", res.data);
      } else {
        throw new Error(res.error || "Failed to fetch profile");
      }
    } catch (error) {
      console.error("Failed to load preferences", error);
      showError("Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  }, [cachedProfile, mapDataToForm, updateData]);

  useEffect(() => {
    if (cachedProfile) {
      mapDataToForm(cachedProfile);
    }
    fetchPreferences();
  }, [cachedProfile, mapDataToForm, fetchPreferences]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addCustomPreference = () => {
    if (newPreference.trim() && isEditing) {
      setFormData((prev) => ({
        ...prev,
        custom_preferences: [...prev.custom_preferences, newPreference.trim()],
      }));
      setNewPreference("");
    }
  };

  const removeCustomPreference = (index) => {
    if (!isEditing) return;
    setFormData((prev) => ({
      ...prev,
      custom_preferences: prev.custom_preferences.filter((_, i) => i !== index),
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomPreference();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      data.append("preference[room_preference]", formData.room_preference);
      data.append("preference[budget_range]", formData.budget_range);
      data.append("preference[attitude]", formData.attitude);
      data.append("preference[behavior]", formData.behavior);
      data.append("preference[lifestyle_notes]", formData.lifestyle_notes);
      data.append("preference[custom_preferences]", JSON.stringify(formData.custom_preferences));

      await tenantService.updateProfile(data);
      showSuccess("Preferences updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Update failed", error);
      showError("Failed to update preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonPreferencesTab />;

  const toggleEdit = () => {
    if (isEditing) {
      fetchPreferences();
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Preferences
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
          >
            Edit Preferences
          </button>
        )}
      </div>


      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Room Preference
            </label>
            <select
              name="room_preference"
              value={formData.room_preference}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            >
              <option value="">Select preference</option>
              <option value="Single">Single Room</option>
              <option value="Double">Double Room</option>
              <option value="Suite">Suite</option>
              <option value="Dormitory">Dormitory</option>
              <option value="Any">Any</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Budget Range (Monthly)
            </label>
            <select
              name="budget_range"
              value={formData.budget_range}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            >
              <option value="">Select budget</option>
              <option value="<2000">Below ₱2,000</option>
              <option value="2000-4000">₱2,000 - ₱4,000</option>
              <option value="4000-6000">₱4,000 - ₱6,000</option>
              <option value="6000+">Above ₱6,000</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Personal Traits (Optional)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Help landlords get to know you better by describing your habits and
            personality.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Attitude
              </label>
              <input
                type="text"
                name="attitude"
                value={formData.attitude}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g., Friendly, Introverted, Outgoing"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Behavior
              </label>
              <input
                type="text"
                name="behavior"
                value={formData.behavior}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g., Quiet, Clean, Early Riser"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Lifestyle
              </label>
              <textarea
                name="lifestyle_notes"
                value={formData.lifestyle_notes}
                onChange={handleChange}
                disabled={!isEditing}
                rows={4}
                placeholder="Tell us about your daily routine, work/study schedule, or hobbies..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Lifestyle Preferences
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add your own lifestyle preferences (e.g., "No smoking", "Pet friendly", "Quiet hours after 10pm")
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPreference}
              onChange={(e) => setNewPreference(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isEditing}
              placeholder="Type a preference..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={addCustomPreference}
              disabled={!isEditing || !newPreference.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.custom_preferences.map((pref, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full text-sm text-green-700 dark:text-green-300"
              >
                <span>{pref}</span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => removeCustomPreference(index)}
                    className="hover:text-green-900 dark:hover:text-green-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end pt-4 gap-4">
            <button
              type="button"
              onClick={toggleEdit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PreferencesTab;
