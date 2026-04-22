import React, { memo } from 'react';
import { X, Loader2, UserPlus, Mail, Phone, Calendar } from 'lucide-react';

const CreateTenantModal = ({ 
  isOpen, 
  onClose, 
  rooms, 
  loadingRooms, 
  data, 
  onDataChange, 
  onSubmit, 
  submitting 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-green-600" />
              Add New Tenant
            </h3>
            <p className="text-xs text-gray-500 mt-1">Create an account and optionally assign a room immediately.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">First Name *</label>
                <input
                  type="text"
                  value={data.first_name}
                  onChange={(e) => onDataChange('first_name', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Last Name *</label>
                <input
                  type="text"
                  value={data.last_name}
                  onChange={(e) => onDataChange('last_name', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  placeholder="Doe"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => onDataChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => onDataChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="0917XXXXXXX"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Initial Assignment */}
          <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initial Room Assignment (Optional)</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Room</label>
                {loadingRooms ? (
                  <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-green-600" /></div>
                ) : (
                  <select
                    value={data.room_id}
                    onChange={(e) => onDataChange('room_id', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  >
                    <option value="">No assignment for now</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} — {room.room_type} (₱{Number(room.price).toLocaleString()}/mo)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {data.room_id && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Move-in Date</label>
                    <input
                      type="date"
                      value={data.move_in_date}
                      onChange={(e) => onDataChange('move_in_date', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">Contract End</label>
                    <input
                      type="date"
                      value={data.end_date}
                      onChange={(e) => onDataChange('end_date', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={submitting || !data.first_name || !data.last_name || !data.email}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Create Tenant
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(CreateTenantModal);