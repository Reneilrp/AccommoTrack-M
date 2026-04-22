import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Wrench, X, Loader2 } from 'lucide-react';
import api from '../../../utils/api';
import { showSuccess, showError } from '../../../utils/toast';
import { useUIState } from '../../../contexts/UIStateContext';

const normalizeId = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const extractAssignedPropertyIds = (user) => {
  if (!user || user.role !== 'caretaker') return [];

  const ids = new Set();
  const pushId = (value) => {
    const normalized = normalizeId(value);
    if (normalized) ids.add(normalized);
  };

  pushId(user.assigned_property_id);
  pushId(user.property_id);

  if (Array.isArray(user.assigned_property_ids)) {
    user.assigned_property_ids.forEach(pushId);
  }

  if (Array.isArray(user.assigned_properties)) {
    user.assigned_properties.forEach((property) => {
      if (property && typeof property === 'object') {
        pushId(property.id ?? property.property_id);
      }
    });
  }

  return [...ids];
};

const normalizePropertiesPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const QuickReportModal = ({ isOpen, onClose, user }) => {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { invalidateData } = useUIState();

  const assignedPropertyIds = useMemo(() => extractAssignedPropertyIds(user), [user]);
  const hasSingleProperty = properties.length === 1;
  const singleProperty = hasSingleProperty ? properties[0] : null;

  const resolvePropertyLabel = useCallback((property) => {
    if (!property || typeof property !== 'object') return 'Assigned Property';
    if (property.title) return property.title;
    if (property.name) return property.name;
    const normalized = normalizeId(property.id);
    return normalized ? `Property #${normalized}` : 'Assigned Property';
  }, []);

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/landlord/properties');
      const propertyRows = normalizePropertiesPayload(response?.data);
      setProperties(propertyRows);

      if (propertyRows.length === 0) {
        setPropertyId('');
        return;
      }

      const propertyIdSet = new Set(propertyRows.map((property) => normalizeId(property?.id)).filter(Boolean));

      const assignedDefault = assignedPropertyIds.find((assignedId) => propertyIdSet.has(assignedId));
      const fallbackAssignedId = normalizeId(user?.assigned_property_id || user?.property_id);
      const keeperAssignedId = propertyIdSet.has(fallbackAssignedId) ? fallbackAssignedId : '';
      const firstPropertyId = normalizeId(propertyRows[0]?.id);

      setPropertyId(assignedDefault || keeperAssignedId || firstPropertyId);
    } catch (err) {
      console.error(err);
      showError('Failed to load assigned properties.');
    } finally {
      setIsLoading(false);
    }
  }, [assignedPropertyIds, user]);

  useEffect(() => {
    if (isOpen) {
      loadProperties();
      setDescription('');
      setPropertyId('');
    }
  }, [isOpen, loadProperties]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!description.trim() || !propertyId) {
      showError('Please select a property and enter a report description.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/property-reports', {
        property_id: propertyId,
        description: description.trim()
      });
      showSuccess('Report submitted successfully.');
      onClose();
      invalidateData(['dashboard_stats', 'recent_activities']); // trigger refresh on dashboard
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white">Quick Report</h3>
              <p className="text-sm text-gray-500">Log damage or property activity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
        ) : properties.length === 0 ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 text-sm font-medium">
            No assigned property found. Please ask your landlord to assign a property first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Property</label>
              {hasSingleProperty ? (
                <button
                  type="button"
                  onClick={() => setPropertyId(normalizeId(singleProperty?.id))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-left text-sm dark:text-white cursor-pointer"
                  aria-label="Assigned property"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{resolvePropertyLabel(singleProperty)}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">Assigned</span>
                  </div>
                </button>
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm dark:text-white"
                  required
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{resolvePropertyLabel(property)}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Activity Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm dark:text-white resize-none"
                placeholder="Example: Replaced lightbulb in hallway, fixed door hinge on Room 2, general cleaning completed..."
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !propertyId || !description.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md shadow-green-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default memo(QuickReportModal);