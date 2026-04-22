import React, { memo } from 'react';
import { X, Loader2, Calendar } from 'lucide-react';

const AssignRoomModal = ({ 
  isOpen, 
  onClose, 
  tenant, 
  rooms, 
  loadingRooms, 
  data, 
  onDataChange, 
  onSubmit, 
  submitting 
}) => {
  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Assign Room</h3>
            <p className="text-xs text-gray-500 mt-1">Assigning {tenant.first_name} {tenant.last_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Select Room *</label>
            {loadingRooms ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
            ) : (
              <select
                value={data.room_id}
                onChange={(e) => onDataChange('room_id', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              >
                <option value="">Choose an available room...</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} — {room.room_type} (₱{Number(room.price).toLocaleString()}/mo)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Move-in Date *</label>
              <input
                type="date"
                value={data.move_in_date}
                onChange={(e) => onDataChange('move_in_date', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contract End (Optional)</label>
              <input
                type="date"
                value={data.end_date}
                onChange={(e) => onDataChange('end_date', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Internal Notes</label>
            <textarea
              value={data.notes}
              onChange={(e) => onDataChange('notes', e.target.value)}
              rows={3}
              placeholder="Any special instructions or terms..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={submitting || !data.room_id || !data.move_in_date}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(AssignRoomModal);