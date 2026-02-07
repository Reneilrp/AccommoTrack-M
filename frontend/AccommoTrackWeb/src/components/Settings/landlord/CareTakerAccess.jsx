import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (typeof fetchCaretakers === 'function') {
      fetchCaretakers();
    }
  }, []);
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

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCaretakerState(prev => ({ ...prev, error: '', message: '' }));
    try {
      await handleCreateCaretaker();
    } catch (err) {
      setCaretakerState(prev => ({ ...prev, error: err?.message || 'Failed to register caretaker.' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Caretaker Access</h2>
        </div>
        <div className="mt-4">
          <label className="block font-medium mb-1 dark:text-gray-200">Caretaker details</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input
              type="text"
              placeholder="First name"
              value={caretakerForm.first_name}
              onChange={(e) => setCaretakerForm(f => ({ ...f, first_name: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
            <input
              type="text"
              placeholder="Last name"
              value={caretakerForm.last_name}
              onChange={(e) => setCaretakerForm(f => ({ ...f, last_name: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
            <input
              type="email"
              placeholder="Email"
              value={caretakerForm.email}
              onChange={(e) => setCaretakerForm(f => ({ ...f, email: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
            <input
              type="text"
              placeholder="Phone (optional)"
              value={caretakerForm.phone}
              onChange={(e) => setCaretakerForm(f => ({ ...f, phone: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
            <input
              type="password"
              placeholder="Password"
              value={caretakerForm.password}
              onChange={(e) => setCaretakerForm(f => ({ ...f, password: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={caretakerForm.password_confirmation}
              onChange={(e) => setCaretakerForm(f => ({ ...f, password_confirmation: e.target.value }))}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          {/* show state messages */}
          {caretakerState.error && (
            <div className="mb-3 text-sm text-red-700 bg-red-50 p-2 rounded">{caretakerState.error}</div>
          )}
          {caretakerState.message && (
            <div className="mb-3 text-sm text-green-700 bg-green-50 p-2 rounded">{caretakerState.message}</div>
          )}

          <label className="block font-medium mb-1 dark:text-gray-200">Allowed modules</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CARETAKER_PERMISSION_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition"
              >
                <input
                  type="checkbox"
                  checked={caretakerPermissions[field.key]}
                  onChange={() => handlePermissionFieldToggle(field.key)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-gray-900 dark:text-white">{field.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{field.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Room Management Permission Modal */}
        {roomPermissionPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Enable Room Management?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Are you sure to enable this? Caretakers will be able to adjust room availability and assignments.</p>
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
                onClick={handleRegister}
                disabled={caretakerState.loading}
                type="button"
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
                {caretakers.map((c) => {
                  const caretakerObj = c.caretaker || {};
                  const name = (caretakerObj.first_name || caretakerObj.last_name)
                    ? `${caretakerObj.first_name || ''} ${caretakerObj.last_name || ''}`.trim()
                    : (c.caretaker_name || c.name || 'Unknown');
                  const email = caretakerObj.email || c.caretaker_email || c.email || '';
                  const assigned = c.assigned_properties || c.assignedProperties || [];
                  const assignedDisplay = Array.isArray(assigned) && assigned.length > 0
                    ? assigned.map(p => p.name || p.title || p.id).join(', ')
                    : '';

                  return (
                    <li key={c.assignment_id || c.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium text-gray-900">{name}</div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {email && <span>{email}</span>}
                          {assignedDisplay && (
                            <span className="ml-2">• {assignedDisplay}</span>
                          )}
                        </div>
                      </div>
                      <button
                        className="px-3 py-1 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-xs"
                        onClick={() => handleRevokeCaretaker(c.assignment_id || c.id)}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
    </div>
  );
}