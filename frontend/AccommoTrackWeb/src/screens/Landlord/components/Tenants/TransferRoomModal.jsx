import React, { memo } from 'react';
import { X, Loader2, Shuffle, AlertCircle } from 'lucide-react';

const TransferRoomModal = ({ 
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Room Transfer</h3>
            <p className="text-xs text-gray-500 mt-1">Moving {tenant.first_name} {tenant.last_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Transferring will end the current contract and create a new one for the target room. Prorated credits will be applied automatically.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Target Room *</label>
            {loadingRooms ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
            ) : (
              <select
                value={data.new_room_id}
                onChange={(e) => onDataChange('new_room_id', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
              >
                <option value="">Choose a new room...</option>
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Transfer Fee</label>
              <input
                type="number"
                value={data.transfer_fee}
                onChange={(e) => onDataChange('transfer_fee', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Damage Charge</label>
              <input
                type="number"
                value={data.damage_charge}
                onChange={(e) => onDataChange('damage_charge', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Damage Description</label>
            <textarea
              value={data.damage_description}
              onChange={(e) => onDataChange('damage_description', e.target.value)}
              rows={2}
              placeholder="Detail any damages in current room..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reason for Transfer</label>
            <textarea
              value={data.reason}
              onChange={(e) => onDataChange('reason', e.target.value)}
              rows={2}
              placeholder="Why is this tenant moving?"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={submitting || !data.new_room_id}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shuffle className="w-5 h-5" />}
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(TransferRoomModal);