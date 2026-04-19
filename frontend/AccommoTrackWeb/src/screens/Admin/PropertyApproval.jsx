import React, { useEffect, useRef, useState } from 'react';
import { Check, X, Ban, Pencil, Loader2 } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import { showSuccess, showError } from '../../utils/toast';
import ConfirmationModal from '../../components/Shared/ConfirmationModal';

const normalizePropertyStatus = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

const PropertyApproval = ({ isEmbedded = false }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ 
    isOpen: false, title: '', message: '', onConfirm: () => {}, requirePassword: false 
  });
  const [passwordValue, setPasswordValueState] = useState('');
  const passwordValueRef = useRef('');

  const setPasswordValue = (value) => {
    passwordValueRef.current = value;
    setPasswordValueState(value);
  };

  const fetchProperties = async (status = 'pending') => {
    setLoading(true);
    setSelectedIds([]); // Clear selection on tab change
    try {
      const res = await api.get(`/admin/properties/${status}`);
      setProperties(res.data.data || res.data || []);
    } catch (err) {
      console.error(`Failed to fetch ${status} properties`, err);
      showError(err.response?.data?.message || err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(statusFilter);
  }, [statusFilter]);

  const toggleSelection = (id) => {
    const targetProperty = properties.find((item) => item.id === id);
    const targetStatus = normalizePropertyStatus(targetProperty?.current_status || targetProperty?.status || statusFilter);
    if (targetStatus !== 'pending') return;

    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const selectableIds = properties
      .filter((property) => normalizePropertyStatus(property?.current_status || property?.status || statusFilter) === 'pending')
      .map((property) => property.id);

    if (selectedIds.length === selectableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode((prev) => {
      if (prev) {
        setSelectedIds([]);
      }
      return !prev;
    });
  };

  const runBulkAction = async (action) => {
    if (selectedIds.length === 0) return;

    const selectableIds = properties
      .filter((property) => normalizePropertyStatus(property?.current_status || property?.status || statusFilter) === 'pending')
      .map((property) => property.id);
    const pendingSelectedIds = selectedIds.filter((id) => selectableIds.includes(id));

    if (pendingSelectedIds.length === 0) {
      showError('Only pending properties can be selected.');
      setSelectedIds([]);
      return;
    }

    if (pendingSelectedIds.length !== selectedIds.length) {
      setSelectedIds(pendingSelectedIds);
    }

    setConfirmModalState({ isOpen: false });
    setActionLoading(`bulk:${action}`);

    try {
      const res = await api.post(`/admin/properties/bulk-${action}`, { ids: pendingSelectedIds });
      showSuccess(res.data?.message || `Bulk ${action} successful`);
      setProperties(prev => prev.filter(p => !pendingSelectedIds.includes(p.id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(`Failed to bulk ${action}`, err);
      showError(err.response?.data?.message || err.message || `Failed to bulk ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const runAction = async (propertyId, action) => {
    setConfirmModalState({ isOpen: false });
    setActionLoading(propertyId + ':' + action);

    try {
      if (action === 'approve') {
        await api.post(`/admin/properties/${propertyId}/approve`);
        showSuccess('Property approved successfully');
      } else if (action === 'reject') {
        await api.post(`/admin/properties/${propertyId}/reject`);
        showSuccess('Property rejected successfully');
      } else if (action === 'maintenance') {
        await api.post(`/admin/properties/${propertyId}/maintenance`);
        showSuccess('Property put under maintenance');
      } else if (action === 'delete') {
        await api.delete(`/admin/properties/${propertyId}`, {
          data: { password: passwordValueRef.current },
        });
        showSuccess('Property sent to archive');
      }

      setProperties(prev => prev.filter(p => p.id !== propertyId));
      setSelectedIds(prev => prev.filter(id => id !== propertyId)); // Remove from selection
      setShowModal(false);
      setSelectedProperty(null);
      setPasswordValue('');
    } catch (err) {
      console.error(`Failed to ${action} property`, err);
      showError(err.response?.data?.message || err.message || `Failed to ${action}`);
      if (action === 'delete') setPasswordValue('');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAction = (propertyId, action) => {
    setPasswordValue('');
    const isApprove = action === 'approve';
    const isMaintenance = action === 'maintenance';
    const isDelete = action === 'delete';
    setConfirmModalState({
      isOpen: true,
      title: `Confirm ${isApprove ? 'Approval' : isMaintenance ? 'Maintenance' : isDelete ? 'Archive' : 'Rejection'}`,
      message: isDelete
        ? 'Are you sure you want to archive this property? It will be removed from active listings but can be restored later.'
        : `Are you sure you want to ${isMaintenance ? 'put this property under maintenance' : action + ' this property'}?`,
      onConfirm: () => runAction(propertyId, action),
      confirmText: isApprove ? 'Approve' : isMaintenance ? 'Maintenance' : isDelete ? 'Archive Property' : 'Reject',
      confirmButtonClass: isApprove ? 'bg-green-600 hover:bg-green-700' : isMaintenance ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700',
      requirePassword: isDelete
    });
  };
  const handleView = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
  };

  const selectableProperties = properties.filter(
    (property) => normalizePropertyStatus(property?.current_status || property?.status || statusFilter) === 'pending'
  );
  const canShowSelectionColumn = isEditMode && selectableProperties.length > 0;
  const bulkActionLoading = typeof actionLoading === 'string' && actionLoading.startsWith('bulk:');

  return (
    <div className={isEmbedded ? "w-full" : "w-full max-full px-6 py-6"}>
      <ConfirmationModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        confirmButtonClass={confirmModalState.confirmButtonClass}
        requirePassword={confirmModalState.requirePassword}
        passwordValue={passwordValue}
        setPasswordValue={setPasswordValue}
      />
      {!isEmbedded && (
        <>
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Property Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Review and manage property submissions and approvals.</p>
        </>
      )}

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors border ${statusFilter === 'pending'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-700 dark:hover:text-emerald-400'
            }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors border ${statusFilter === 'approved'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-700 dark:hover:text-emerald-400'
            }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('maintenance')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors border ${statusFilter === 'maintenance'
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-800 hover:text-amber-700 dark:hover:text-amber-400'
            }`}
        >
          Maintenance
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors border ${statusFilter === 'rejected'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-700 dark:hover:text-emerald-400'
            }`}
        >
          Rejected
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-4 flex items-center justify-end gap-2">
          {isEditMode ? (
            <>
              <span className="mr-2 text-sm text-gray-600 dark:text-gray-300">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => runBulkAction('approve')}
                disabled={selectedIds.length === 0 || bulkActionLoading}
                className="h-10 w-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Approve selected"
                aria-label="Approve selected"
              >
                {actionLoading === 'bulk:approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setSelectedIds([]);
                  setIsEditMode(false);
                }}
                disabled={bulkActionLoading}
                className="h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancel"
                aria-label="Cancel"
              >
                <Ban className="w-4 h-4" />
              </button>
              <button
                onClick={() => runBulkAction('reject')}
                disabled={selectedIds.length === 0 || bulkActionLoading}
                className="h-10 w-10 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reject selected"
                aria-label="Reject selected"
              >
                {actionLoading === 'bulk:reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <button
              onClick={toggleEditMode}
              className="h-10 w-10 inline-flex items-center justify-center border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Edit"
              aria-label="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              {statusFilter === 'pending' && 'No pending properties.'}
              {statusFilter === 'approved' && 'No approved properties yet.'}
              {statusFilter === 'rejected' && 'No rejected properties.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                <tr>
                  {canShowSelectionColumn && (
                    <th className="px-6 py-4 text-left font-semibold w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectableProperties.length > 0 && selectedIds.length === selectableProperties.length}
                        disabled={selectableProperties.length === 0}
                        onChange={toggleAll}
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-left font-semibold">Title</th>
                  <th className="px-6 py-4 text-left font-semibold">Property Type</th>
                  <th className="px-6 py-4 text-left font-semibold">Location</th>
                  <th className="px-6 py-4 text-left font-semibold">Owner</th>
                  <th className="px-6 py-4 text-left font-semibold">Submitted</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {properties.map(prop => {
                  const isSelectable = normalizePropertyStatus(prop.current_status || prop.status || statusFilter) === 'pending';

                  return (
                  <tr key={prop.id} className={`${isEditMode && selectedIds.includes(prop.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : 'bg-white dark:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/30'} hover:bg-emerald-50/40 dark:hover:bg-emerald-900/20 transition-colors`}>
                    {canShowSelectionColumn && (
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          checked={selectedIds.includes(prop.id)}
                          disabled={!isSelectable}
                          onChange={() => toggleSelection(prop.id)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{prop.title || 'Untitled'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 capitalize">{prop.property_type || '—'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{prop.city || prop.full_address || '—'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {prop.landlord?.first_name
                        ? `${prop.landlord.first_name} ${prop.landlord.last_name || ''}`
                        : prop.owner_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm">
                      {new Date(prop.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          onClick={() => handleView(prop)}
                        >
                          View
                        </button>
                        {statusFilter === 'pending' && (
                          <>
                            <button
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => confirmAction(prop.id, 'reject')}
                              disabled={actionLoading}
                            >
                              {actionLoading === prop.id + ':reject' ? 'Rejecting...' : 'Reject'}
                            </button>
                            <button
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => confirmAction(prop.id, 'approve')}
                              disabled={actionLoading}
                            >
                              {actionLoading === prop.id + ':approve' ? 'Approving...' : 'Approve'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] p-4 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxSrc}
              alt="Full size"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute top-2 right-2 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {showModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <div className="w-10"></div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center flex-1">Property Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold w-10"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Property Images */}
              {selectedProperty.image && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Property Images</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedProperty.images && selectedProperty.images.length > 0 ? (
                      selectedProperty.images.map((img, idx) => {
                        const src = getImageUrl(img.image_url || img.image_path);
                        return (
                          <img
                            key={idx}
                            src={src}
                            alt={`Property ${idx + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxSrc(src)}
                            onError={(e) => e.target.src = '/placeholder.png'}
                          />
                        );
                      })
                    ) : (
                      (() => {
                        const src = getImageUrl(selectedProperty.image);
                        return (
                          <img
                            src={src}
                            alt="Property"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxSrc(src)}
                            onError={(e) => e.target.src = '/placeholder.png'}
                          />
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Property Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedProperty.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Property Type</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{selectedProperty.property_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className="font-semibold text-yellow-600 dark:text-yellow-400 capitalize">{selectedProperty.current_status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Rooms</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedProperty.total_rooms || 0}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProperty.description && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">{selectedProperty.description}</p>
                </div>
              )}

              {/* Location */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Location</h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2 border border-gray-100 dark:border-gray-700">
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Address:</span> {selectedProperty.street_address || 'N/A'}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">City:</span> {selectedProperty.city || 'N/A'}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Province:</span> {selectedProperty.province || 'N/A'}</p>
                  {selectedProperty.barangay && (
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Barangay:</span> {selectedProperty.barangay}</p>
                  )}
                  {selectedProperty.postal_code && (
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Postal Code:</span> {selectedProperty.postal_code}</p>
                  )}
                  {selectedProperty.nearby_landmarks && (
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Nearby Landmarks:</span> {selectedProperty.nearby_landmarks}</p>
                  )}
                </div>
              </div>

              {/* Amenities */}
              {selectedProperty.amenities_list && selectedProperty.amenities_list.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Amenities</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProperty.amenities_list.map((amenity, idx) => (
                      <div key={idx} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100 dark:border-blue-800">
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Property Rules */}
              {selectedProperty.property_rules && selectedProperty.property_rules.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Property Rules</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <ul className="list-disc list-inside space-y-2">
                      {selectedProperty.property_rules.map((rule, idx) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">{rule}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Owner Information */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Owner Information</h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2 border border-gray-100 dark:border-gray-700">
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Name:</span> {selectedProperty.landlord?.first_name} {selectedProperty.landlord?.last_name || 'N/A'}</p>
                  <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Email:</span> {selectedProperty.landlord?.email || 'N/A'}</p>
                  {selectedProperty.landlord?.phone && (
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-semibold">Phone:</span> {selectedProperty.landlord.phone}</p>
                  )}
                </div>
              </div>

              {/* Credentials (Read-only for admin review) */}
              {selectedProperty.credentials && selectedProperty.credentials.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Credentials</h4>
                  <div className="space-y-4">
                    {selectedProperty.credentials.map((cred, idx) => {
                      const url = getImageUrl(cred.file_url || cred.file_path || cred.url);
                      const name = cred.original_name || cred.name || `Document ${idx + 1}`;
                      return (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{name}</div>
                          <div>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View</a>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-500">Unavailable</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-4 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => confirmAction(selectedProperty.id, 'delete')}
                disabled={actionLoading}
                className="px-6 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedProperty.id + ':delete' ? 'Deleting...' : 'Delete Completely'}
              </button>
              {selectedProperty.current_status === 'pending' && (
                <>
                  <button
                    onClick={() => confirmAction(selectedProperty.id, 'reject')}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === selectedProperty.id + ':reject' ? 'Rejecting...' : 'Reject Property'}
                  </button>
                  <button
                    onClick={() => confirmAction(selectedProperty.id, 'maintenance')}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === selectedProperty.id + ':maintenance' ? 'Putting...' : 'Put Under Maintenance'}
                  </button>
                  <button
                    onClick={() => confirmAction(selectedProperty.id, 'approve')}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === selectedProperty.id + ':approve' ? 'Approving...' : 'Approve Property'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyApproval;
