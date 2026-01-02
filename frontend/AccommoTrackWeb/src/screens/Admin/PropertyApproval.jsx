import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';

const PropertyApproval = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchProperties = async (status = 'pending') => {
    setLoading(true);
    setError('');
    try {
      // Backend endpoints: GET /admin/properties/pending, /approved, /rejected
      const res = await api.get(`/admin/properties/${status}`);
      setProperties(res.data.data || res.data || []);
    } catch (err) {
      console.error(`Failed to fetch ${status} properties`, err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(statusFilter);
  }, [statusFilter]);

  const handleAction = async (propertyId, action) => {
    setActionLoading(propertyId + ':' + action);
    setError('');

    try {
      if (action === 'approve') {
        await api.post(`/admin/properties/${propertyId}/approve`);
      } else if (action === 'reject') {
        await api.post(`/admin/properties/${propertyId}/reject`);
      }

      // Remove property from pending list
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      setShowModal(false);
      setSelectedProperty(null);
    } catch (err) {
      console.error(`Failed to ${action} property`, err);
      setError(err.response?.data?.message || err.message || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleView = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
  };

  return (
    <div className="w-full max-w-full px-6 py-6">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Property Management</h2>
      <p className="text-sm text-gray-600 mb-6">Review and manage property submissions and approvals.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors border ${statusFilter === 'pending'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
            }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors border ${statusFilter === 'approved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
            }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors border ${statusFilter === 'rejected'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
            }`}
        >
          Rejected
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600">
              {statusFilter === 'pending' && 'No pending properties.'}
              {statusFilter === 'approved' && 'No approved properties yet.'}
              {statusFilter === 'rejected' && 'No rejected properties.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto shadow-sm rounded-2xl border border-gray-100 bg-white">
            <table className="w-full">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Title</th>
                  <th className="px-6 py-3 text-left font-semibold">Property Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Location</th>
                  <th className="px-6 py-3 text-left font-semibold">Owner</th>
                  <th className="px-6 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-6 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {properties.map(prop => (
                  <tr key={prop.id} className="bg-white even:bg-gray-50 hover:bg-emerald-50/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{prop.title || 'Untitled'}</td>
                    <td className="px-6 py-4 text-gray-700 capitalize">{prop.property_type || '—'}</td>
                    <td className="px-6 py-4 text-gray-700">{prop.city || prop.full_address || '—'}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {prop.landlord?.first_name
                        ? `${prop.landlord.first_name} ${prop.landlord.last_name || ''}`
                        : prop.owner_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-sm">
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
                              onClick={() => handleAction(prop.id, 'reject')}
                              disabled={actionLoading}
                            >
                              {actionLoading === prop.id + ':reject' ? 'Rejecting...' : 'Reject'}
                            </button>
                            <button
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleAction(prop.id, 'approve')}
                              disabled={actionLoading}
                            >
                              {actionLoading === prop.id + ':approve' ? 'Approving...' : 'Approve'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Property Details Modal */}
      {showModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Property Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Property Images */}
              {selectedProperty.image_url && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Property Images</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedProperty.images && selectedProperty.images.length > 0 ? (
                      selectedProperty.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img.image_path ? `${window.location.origin}/storage/${img.image_path}` : img.image_url}
                          alt={`Property ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                          onError={(e) => e.target.src = '/placeholder.png'}
                        />
                      ))
                    ) : (
                      <img
                        src={selectedProperty.image_url}
                        alt="Property"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        onError={(e) => e.target.src = '/placeholder.png'}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Property Name</p>
                    <p className="font-semibold text-gray-900">{selectedProperty.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Property Type</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedProperty.property_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold text-yellow-600 capitalize">{selectedProperty.current_status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Rooms</p>
                    <p className="font-semibold text-gray-900">{selectedProperty.total_rooms || 0}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProperty.description && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Description</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedProperty.description}</p>
                </div>
              )}

              {/* Location */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Location</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-gray-700"><span className="font-semibold">Address:</span> {selectedProperty.street_address || 'N/A'}</p>
                  <p className="text-gray-700"><span className="font-semibold">City:</span> {selectedProperty.city || 'N/A'}</p>
                  <p className="text-gray-700"><span className="font-semibold">Province:</span> {selectedProperty.province || 'N/A'}</p>
                  {selectedProperty.barangay && (
                    <p className="text-gray-700"><span className="font-semibold">Barangay:</span> {selectedProperty.barangay}</p>
                  )}
                  {selectedProperty.postal_code && (
                    <p className="text-gray-700"><span className="font-semibold">Postal Code:</span> {selectedProperty.postal_code}</p>
                  )}
                  {selectedProperty.nearby_landmarks && (
                    <p className="text-gray-700"><span className="font-semibold">Nearby Landmarks:</span> {selectedProperty.nearby_landmarks}</p>
                  )}
                </div>
              </div>

              {/* Amenities */}
              {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Amenities</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProperty.amenities.map((amenity, idx) => (
                      <div key={idx} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Property Rules */}
              {selectedProperty.rules && selectedProperty.rules.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Property Rules</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="list-disc list-inside space-y-2">
                      {selectedProperty.rules.map((rule, idx) => (
                        <li key={idx} className="text-gray-700">{rule}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Owner Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Owner Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-gray-700"><span className="font-semibold">Name:</span> {selectedProperty.landlord?.first_name} {selectedProperty.landlord?.last_name || 'N/A'}</p>
                  <p className="text-gray-700"><span className="font-semibold">Email:</span> {selectedProperty.landlord?.email || 'N/A'}</p>
                  {selectedProperty.landlord?.phone && (
                    <p className="text-gray-700"><span className="font-semibold">Phone:</span> {selectedProperty.landlord.phone}</p>
                  )}
                </div>
              </div>

              {/* Credentials (Read-only for admin review) */}
              {selectedProperty.credentials && selectedProperty.credentials.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Credentials</h4>
                  <div className="space-y-3">
                    {selectedProperty.credentials.map((cred, idx) => {
                      const url = cred.file_url || (cred.file_path ? `${window.location.origin}/storage/${cred.file_path}` : null) || cred.url || null;
                      const name = cred.original_name || cred.name || `Document ${idx + 1}`;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-700">{name}</div>
                          <div>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">View</a>
                            ) : (
                              <span className="text-sm text-gray-400">Unavailable</span>
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
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => handleAction(selectedProperty.id, 'reject')}
                disabled={actionLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedProperty.id + ':reject' ? 'Rejecting...' : 'Reject Property'}
              </button>
              <button
                onClick={() => handleAction(selectedProperty.id, 'approve')}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedProperty.id + ':approve' ? 'Approving...' : 'Approve Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyApproval;
