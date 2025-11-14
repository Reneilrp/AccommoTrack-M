import { Home, Mail, Phone, Calendar, Edit2, Trash2, User, FileText } from 'lucide-react';

export default function TenantCard({ tenant, onEdit, onDelete, onAssignRoom, availableRooms }) {
  const profile = tenant.tenantProfile;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      {/* Header: Name + Status */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {tenant.first_name} {tenant.last_name}
          </h3>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Mail className="w-4 h-4" /> {tenant.email}
          </p>
          {tenant.phone && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Phone className="w-4 h-4" /> {tenant.phone}
            </p>
          )}
          {tenant.age && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <User className="w-4 h-4" /> Age: {tenant.age}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize
          ${profile?.status === 'active' ? 'bg-green-100 text-green-700' :
            profile?.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'}`}>
          {profile?.status || 'active'}
        </span>
      </div>

      {/* Room Info */}
      {tenant.room ? (
        <p className="flex items-center gap-1 text-sm text-gray-700 mb-2">
          <Home className="w-4 h-4" />
          Room {tenant.room?.room_number} ({tenant.room?.type_label})
        </p>
      ) : (
        <p className="text-sm text-amber-700 italic mb-2">No room assigned</p>
      )}

      {/* Move-in Date */}
      {profile?.move_in_date && (
        <p className="flex items-center gap-1 text-sm text-gray-600 mb-2">
          <Calendar className="w-4 h-4" />
          Move-in: {new Date(profile.move_in_date).toLocaleDateString()}
        </p>
      )}

      {/* Move-out Date */}
      {profile?.move_out_date && (
        <p className="text-sm text-red-600 italic mb-2">
          Move-out: {new Date(profile.move_out_date).toLocaleDateString()}
        </p>
      )}

      {/* Preference */}
      {profile?.preference && (
        <p className="text-sm italic text-gray-600 mb-2">
          "{profile.preference}"
        </p>
      )}

      {/* Notes */}
      {profile?.notes && (
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer flex items-center gap-1 font-medium">
            <FileText className="w-3 h-3" /> Notes
          </summary>
          <p className="mt-1 pl-4">{profile.notes}</p>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => onEdit(tenant)}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
        >
          <Edit2 className="w-4 h-4" /> Edit
        </button>

        <button
          onClick={() => onDelete(tenant.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Assign Room (only if no room) */}
      {!tenant.room && availableRooms.length > 0 && (
        <select
          onChange={(e) => onAssignRoom(tenant.id, e.target.value)}
          className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          defaultValue=""
        >
          <option value="" disabled>Assign Room...</option>
          {availableRooms.map(room => (
            <option key={room.id} value={room.id}>
              Room {room.room_number} ({room.type_label})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}