import React, { useState } from 'react';

export default function CareTakerAccess({
  caretakers,
  setCaretakers,
  caretakerForm,
  setCaretakerForm,
  caretakerPermissions,
  setCaretakerPermissions,
  landlordProperties,
  selectedPropertyIds,
  setSelectedPropertyIds,
  caretakerState,
  setCaretakerState,
  handleCreateCaretaker,
  handleRevokeCaretaker,
  fetchCaretakers,
  resetCaretakerPermissions,
  handlePermissionToggle
}) {
  const [roomPermissionPrompt, setRoomPermissionPrompt] = useState(false);
  const CARETAKER_PERMISSION_FIELDS = [
    {
      key: 'bookings',
      label: 'Bookings',
      description: 'View booking requests, statuses, and payment updates.',
      defaultValue: true,
    },
    {
      key: 'tenants',
      label: 'Tenants',
      description: 'See tenant profiles, room assignments, and contact info.',
      defaultValue: true,
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'Monitor inbox conversations with prospects and tenants.',
      defaultValue: true,
    },
    {
      key: 'rooms',
      label: 'Room Management',
      description: 'Allow caretakers to edit room availability and assignments.',
      defaultValue: false,
    },
  ];

  const handlePermissionFieldToggle = (key) => {
    if (key === 'rooms' && !caretakerPermissions.rooms) {
      setRoomPermissionPrompt(true);
    } else {
      handlePermissionToggle(key);
    }
  };

  const confirmRoomPermission = () => {
    setRoomPermissionPrompt(false);
    handlePermissionToggle('rooms');
  };

  const cancelRoomPermission = () => {
    setRoomPermissionPrompt(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6 border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Caretaker Access</h2>
        </div>
        <div className="mt-4">
          <label className="block font-medium mb-1">Allowed modules</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CARETAKER_PERMISSION_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-green-50 transition"
              >
                <input
                  type="checkbox"
                  checked={caretakerPermissions[field.key]}
                  onChange={() => handlePermissionFieldToggle(field.key)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-gray-900">{field.label}</span>
                  <span className="block text-xs text-gray-500">{field.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Room Management Permission Modal */}
        {roomPermissionPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enable Room Management?</h3>
              <p className="text-sm text-gray-600 mb-6">Are you sure to enable this? Caretakers will be able to adjust room availability and assignments.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelRoomPermission}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoomPermission}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Enable Access
                </button>
              </div>
            </div>
          </div>
        )}
          {/* Property selection */}
          {landlordProperties.length > 0 && (
            <div className="mt-4">
              <label className="block font-medium mb-1">Assign Properties</label>
              <div className="flex flex-wrap gap-2">
                {landlordProperties.map((property) => (
                  <label key={property.id} className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPropertyIds.includes(property.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedPropertyIds(ids => [...ids, property.id]);
                        } else {
                          setSelectedPropertyIds(ids => ids.filter(id => id !== property.id));
                        }
                      }}
                    />
                    <span>{property.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
            <div className="mt-6 flex gap-3">
              <button
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                onClick={handleCreateCaretaker}
                disabled={caretakerState.loading}
              >
                {caretakerState.loading ? 'Adding...' : 'Add Caretaker'}
              </button>
              <button
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                onClick={resetCaretakerPermissions}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
          {/* List of caretakers */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Current Caretakers</h3>
            {caretakerState.loading ? (
              <div className="text-gray-500">Loading caretakers...</div>
            ) : caretakers.length === 0 ? (
              <div className="text-gray-500">No caretakers added yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {caretakers.map((c) => (
                  <li key={c.assignment_id || c.id} className="flex items-center justify-between py-3">
                    <div>
                      <span className="font-medium text-gray-900">{c.caretaker_name || c.name}</span>
                      <span className="ml-2 text-xs text-gray-500">{c.caretaker_email || c.email}</span>
                    </div>
                    <button
                      className="px-3 py-1 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-xs"
                      onClick={() => handleRevokeCaretaker(c.assignment_id || c.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
    </div>
  );
}
