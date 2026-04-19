import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Loader2, Info, UserSearch, AlertTriangle } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../utils/api';
import PriceRow from '../../components/Shared/PriceRow';
import { normalizeActionError } from '../../utils/error';

export default function AddBookingModal({ isOpen, onClose, onBookingAdded }) {
  const [loading, setLoading] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [pricingPreview, setPricingPreview] = useState(null);

  const [guestSearch, setGuestSearch] = useState('');
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);
  const [guestResults, setGuestResults] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isGuestInputFocused, setIsGuestInputFocused] = useState(false);

  const [formData, setFormData] = useState({
    guestName: '',
    guestId: null,
    propertyId: '',
    roomId: '',
    bedCount: 1,
    checkIn: '',
    checkOut: '',
    amount: '',
    paymentStatus: 'unpaid',
    notes: ''
  });

  const getRoomBillingPolicy = (room) => {
    return String(room?.billing_policy || room?.billingPolicy || room?.contract_mode || 'monthly').toLowerCase();
  };

  const selectedRoomData = rooms.find((r) => String(r.id) === String(formData.roomId));
  const selectedRoomBillingPolicy = getRoomBillingPolicy(selectedRoomData);
  const requiresCheckOut = !selectedRoomData || selectedRoomBillingPolicy === 'daily';
  const maxSelectableBeds = Math.max(
    1,
    parseInt(
      selectedRoomData?.available_slots ?? selectedRoomData?.capacity ?? 1,
      10,
    ) || 1,
  );

  useEffect(() => {
    if (isOpen) {
      loadProperties();
    } else {
      setFormData({
        guestName: '',
        guestId: null,
        propertyId: '',
        roomId: '',
        bedCount: 1,
        checkIn: '',
        checkOut: '',
        amount: '',
        paymentStatus: 'unpaid',
        notes: ''
      });
      setPricingPreview(null);
      setGuestSearch('');
      setGuestResults([]);
      setSelectedGuest(null);
      setIsGuestInputFocused(false);
      setFieldErrors({});
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!guestSearch || guestSearch.trim().length < 2) {
      setGuestResults([]);
      return;
    }

    const searchGuests = async () => {
      setIsSearchingGuests(true);
      try {
        const res = await api.get('/landlord/tenants', { params: { search: guestSearch } });
        setGuestResults(res.data || []);
      } catch (err) {
        console.error('Failed to search for guests', err);
        setGuestResults([]);
      } finally {
        setIsSearchingGuests(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      if (!selectedGuest) {
        searchGuests();
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [guestSearch, selectedGuest]);

  const loadProperties = async () => {
    try {
      const res = await api.get('/properties/accessible');
      setProperties(res.data || []);
    } catch (err) {
      console.error('Failed to load properties', err);
    }
  };

  const loadRooms = async (propertyId) => {
    if (!propertyId) {
      setRooms([]);
      return;
    }
    try {
      const res = await api.get(`/rooms/property/${propertyId}`);
      const roomsData = res.data?.data || res.data || [];
      setRooms(roomsData.filter(r => r.status === 'available' || (r.available_slots > 0 && r.status !== 'maintenance')));
    } catch (err) {
      console.error('Failed to load rooms', err);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchPricing = useCallback(async () => {
    if (!formData.roomId || !formData.checkIn) return;
    if (requiresCheckOut && !formData.checkOut) return;
    if (!formData.checkOut) {
      setPricingPreview(null);
      return;
    }

    setLoadingPricing(true);
    try {
      const params = {
        start: formData.checkIn,
        end: formData.checkOut,
        bed_count: formData.bedCount
      };
      const res = await api.get(`/rooms/${formData.roomId}/pricing`, {
        params
      });
      setPricingPreview(res.data);
      setFormData(prev => ({ ...prev, amount: res.data.total }));
    } catch (err) {
      console.error('Pricing calculation failed', err);
    } finally {
      setLoadingPricing(false);
    }
  }, [formData.roomId, formData.checkIn, formData.checkOut, formData.bedCount, requiresCheckOut]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const handlePropertyChange = (e) => {
    const id = e.target.value;
    setFormData({ ...formData, propertyId: id, roomId: '', bedCount: 1 });
    loadRooms(id);
  };

  const handleRoomChange = (e) => {
    const id = e.target.value;
    const nextRoom = rooms.find((r) => String(r.id) === String(id));
    const nextPolicy = getRoomBillingPolicy(nextRoom);
    setFormData((prev) => ({
      ...prev,
      roomId: id,
      bedCount: 1,
      checkOut: nextPolicy === 'daily' ? prev.checkOut : '',
    }));
    setPricingPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if ((!selectedGuest && !formData.guestName.trim()) || !formData.roomId || !formData.checkIn || (requiresCheckOut && !formData.checkOut)) {
      const msg = requiresCheckOut
        ? 'Please select a Tenant, Room, Check-in Date, and Check-out Date.'
        : 'Please select a Tenant, Room, and Check-in Date.';
      setError(msg);
      showError(msg);
      return;
    }

    if (genderMismatch) {
      const sexRest = selectedRoomData?.sex_restriction ? selectedRoomData.sex_restriction.charAt(0).toUpperCase() + selectedRoomData.sex_restriction.slice(1) : 'specific sex';
      const msg = `Conflict: This tenant cannot be added because the room is restricted to ${sexRest} only.`;
      setError(msg);
      showError(msg);
      return;
    }

    const today = getTodayDate();
    if (formData.checkIn < today) {
      const msg = `${requiresCheckOut ? 'Check-in' : 'Move-in'} date cannot be in the past.`;
      setError(msg);
      showError(msg);
      return;
    }

    if (formData.checkOut && formData.checkOut <= formData.checkIn) {
      const msg = 'Check-out date cannot be earlier than Check-in date.';
      setError(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        room_id: formData.roomId,
        bed_count: formData.bedCount,
        start_date: formData.checkIn,
        end_date: formData.checkOut || null,
        notes: formData.notes,
      };

      if (selectedGuest) {
        payload.tenant_id = selectedGuest.id;
      } else {
        payload.guest_name = formData.guestName.trim();
      }

      await api.post('/bookings', payload);

      showSuccess('Booking added successfully!');
      if (onBookingAdded) onBookingAdded();
      onClose();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errors) {
        setFieldErrors(errData.errors);
        
        // Extract the first error message to show in the toast
        const firstErrorKey = Object.keys(errData.errors)[0];
        const firstErrorMessage = errData.errors[firstErrorKey][0];
        
        setError(`Booking failed: ${firstErrorMessage}`);
        showError(`Booking Rule: ${firstErrorMessage}`);
      } else {
        const msg = normalizeActionError(
          errData?.error || errData?.message || err,
          'Unable to add booking right now.',
        );
        setError(msg);
        showError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const normalizeGender = (g) => {
    if (!g) return null;
    const val = g.toLowerCase().trim();
    if (['male', 'boy', 'boys'].includes(val)) return 'male';
    if (['female', 'girl', 'girls'].includes(val)) return 'female';
    return null;
  };

  const genderMismatch = selectedGuest && selectedRoomData &&
    selectedRoomData.sex_restriction &&
    selectedRoomData.sex_restriction !== 'mixed' &&
    normalizeGender(selectedGuest.sex) !== selectedRoomData.sex_restriction;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Booking</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reserve a room for a guest</p>
            </div>
          </div>
          <button
            className="p-2 text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5" />
              {error}
            </div>
          )}

          {genderMismatch && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Sex Restriction</p>
                <p>This tenant cannot be booked into this room because the room is restricted to <strong>{selectedRoomData.sex_restriction}</strong>.</p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Fields marked with <span className="text-red-500">*</span> are required.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Guest / Tenant Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                required
                className={`w-full border rounded-xl pl-11 pr-4 py-4 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white transition-all ${fieldErrors.guest_name || fieldErrors.tenant_id ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                value={guestSearch}
                onChange={e => {
                  setGuestSearch(e.target.value);
                  setSelectedGuest(null);
                  setFormData(prev => ({ ...prev, guestName: e.target.value, guestId: null }));
                }}
                onFocus={() => setIsGuestInputFocused(true)}
                onBlur={() => setTimeout(() => setIsGuestInputFocused(false), 150)}
                placeholder="Search existing tenant or enter new name"
              />
              {isSearchingGuests && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-500" />}

              {isGuestInputFocused && guestResults.length > 0 && !selectedGuest && (
                <ul className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {guestResults.map(user => (
                    <li
                      key={user.id}
                      className="px-4 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-50 dark:border-gray-600/50 last:border-0"
                      onClick={() => {
                        setSelectedGuest(user);
                        setGuestSearch(user.full_name || user.name);
                        setFormData(prev => ({ ...prev, guestName: user.full_name || user.name, guestId: user.id }));
                        setGuestResults([]);
                        setIsGuestInputFocused(false);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{user.full_name || user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                        {user.sex && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${user.sex.toLowerCase() === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {user.sex}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {fieldErrors.guest_name && <p className="text-red-500 text-xs mt-2">{fieldErrors.guest_name[0]}</p>}
            {fieldErrors.tenant_id && <p className="text-red-500 text-xs mt-2">{fieldErrors.tenant_id[0]}</p>}
            {selectedGuest?.email && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                Selected tenant email: <span className="font-semibold">{selectedGuest.email}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Property <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full border rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white border-gray-200 dark:border-gray-600"
                value={formData.propertyId}
                onChange={handlePropertyChange}
              >
                <option value="">Select Property</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Room <span className="text-red-500">*</span>
              </label>
              <select
                required
                disabled={!formData.propertyId}
                className={`w-full border rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white disabled:opacity-50 ${fieldErrors.room_id ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                value={formData.roomId}
                onChange={handleRoomChange}
              >
                <option value="">Select Room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} ({r.available_slots} slots) {r.sex_restriction && r.sex_restriction !== 'mixed' ? ` - ${r.sex_restriction.toUpperCase()} ONLY` : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.room_id && <p className="text-red-500 text-xs mt-2">{fieldErrors.room_id[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {requiresCheckOut ? 'Check-in' : 'Move-in'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={getTodayDate()}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => e.target.showPicker?.()}
                className={`w-full border rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white cursor-pointer ${fieldErrors.start_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                value={formData.checkIn}
                onChange={e => setFormData({ ...formData, checkIn: e.target.value })}
              />
              {fieldErrors.start_date && <p className="text-red-500 text-xs mt-2">{fieldErrors.start_date[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {requiresCheckOut ? (
                  <>
                    Check-out <span className="text-red-500">*</span>
                  </>
                ) : (
                  'Move-out (Optional)'
                )}
              </label>
              <input
                type="date"
                required={requiresCheckOut}
                min={formData.checkIn || getTodayDate()}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => e.target.showPicker?.()}
                className={`w-full border rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white cursor-pointer ${fieldErrors.end_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                value={formData.checkOut}
                onChange={e => setFormData({ ...formData, checkOut: e.target.value })}
              />
              {fieldErrors.end_date && <p className="text-red-500 text-xs mt-2">{fieldErrors.end_date[0]}</p>}
            </div>
          </div>

          {selectedRoomData && (
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              {requiresCheckOut
                ? 'This room uses daily billing. Check-out date is required.'
                : 'This room uses monthly billing. Check-out can be left blank for open-ended stays.'}
            </p>
          )}

          {selectedRoomData && (selectedRoomData.room_type === 'bedSpacer' || selectedRoomData.room_type === 'bedspacer') && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Number of Beds</label>
              <div className="flex items-center gap-4">
                {maxSelectableBeds > 1 ? (
                  <select
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white"
                    value={formData.bedCount}
                    onChange={e => setFormData({ ...formData, bedCount: parseInt(e.target.value, 10) })}
                  >
                    {[...Array(maxSelectableBeds)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Bed' : 'Beds'}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200">
                    1 Bed
                  </div>
                )}
                <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                  Available: {selectedRoomData.available_slots} / {selectedRoomData.capacity}
                </div>
              </div>
            </div>
          )}

          {formData.roomId && formData.checkIn && formData.checkOut && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/30">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-green-800 dark:text-green-300">Estimated Total</span>
                {loadingPricing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                ) : (
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">
                    <PriceRow amount={pricingPreview?.total || 0} />
                  </span>
                )}
              </div>
              {pricingPreview && (
                <div className="text-xs text-green-600 dark:text-green-500/70 space-y-2">
                  <p>Stay Duration: {pricingPreview.days} days</p>
                  <p>Billing Policy: {pricingPreview.policy?.replace('_', ' ')}</p>
                  <p className="italic">{pricingPreview.breakdown?.months > 0 && `${pricingPreview.breakdown.months} month(s)`} {pricingPreview.breakdown?.remaining_days > 0 && `+ ${pricingPreview.breakdown.remaining_days} day(s)`}</p>
                  
                  {selectedRoomBillingPolicy === 'monthly' && pricingPreview.breakdown?.remaining_days > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>Note: Extra days ({pricingPreview.breakdown.remaining_days}) are charged as a full month under Monthly policy.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {formData.roomId && formData.checkIn && !formData.checkOut && !requiresCheckOut && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-700 dark:text-blue-300">
              Add a check-out date if you want to preview the total. Monthly bookings can stay open-ended.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Internal Notes (Optional)</label>
            <textarea
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white transition-all h-20"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Special requirements, discount info..."
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              className="px-6 py-4 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingPricing || genderMismatch}
              className="px-8 py-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
