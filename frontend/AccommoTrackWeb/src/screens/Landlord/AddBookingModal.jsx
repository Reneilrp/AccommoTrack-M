import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Loader2, Info, UserSearch, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import PriceRow from '../../components/Shared/PriceRow';

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
      if (!formData.roomId || !formData.checkIn || !formData.checkOut) return;
      
      setLoadingPricing(true);
      try {
        const res = await api.get(`/rooms/${formData.roomId}/pricing`, {
          params: {
            start: formData.checkIn,
            end: formData.checkOut,
            bed_count: formData.bedCount
          }
        });
        setPricingPreview(res.data);
        setFormData(prev => ({ ...prev, amount: res.data.total }));
      } catch (err) {
        console.error('Pricing calculation failed', err);
      } finally {
        setLoadingPricing(false);
      }
    }, [formData.roomId, formData.checkIn, formData.checkOut, formData.bedCount]);

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
        setFormData({ ...formData, roomId: id, bedCount: 1 });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setFieldErrors({});

      if ((!selectedGuest && !formData.guestName.trim()) || !formData.roomId || !formData.checkIn || !formData.checkOut) {
        setError('Please fill in all required fields.');
        return;
      }

      if (genderMismatch) {
        setError('Selected tenant is not eligible for this room because of the room gender restriction.');
        return;
      }

      const today = getTodayDate();
      if (formData.checkIn < today) {
        setError('Check-in date cannot be in the past.');
        return;
      }

      if (formData.checkOut <= formData.checkIn) {
        setError('Check-out date must be after check-in date.');
        return;
      }

      setLoading(true);
      try {
        const payload = {
          room_id: formData.roomId,
          bed_count: formData.bedCount,
          start_date: formData.checkIn,
          end_date: formData.checkOut,
          notes: formData.notes,
        };

        if (selectedGuest) {
          payload.tenant_id = selectedGuest.id;
        } else {
          payload.guest_name = formData.guestName.trim();
        }

        await api.post('/bookings', payload);

        toast.success('Booking added successfully!');
        if (onBookingAdded) onBookingAdded();
        onClose();
      } catch (err) {
        const errData = err.response?.data;
        if (errData?.errors) {
          setFieldErrors(errData.errors);
          setError('Booking failed. Please review the errors below.');
          toast.error('Please fix the validation errors.');
        } else {
          const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to add booking';
          setError(msg);
          toast.error(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    const selectedRoomData = rooms.find(r => String(r.id) === String(formData.roomId));

    const normalizeGender = (g) => {
      if (!g) return null;
      const val = g.toLowerCase().trim();
      if (['male', 'boy', 'boys'].includes(val)) return 'male';
      if (['female', 'girl', 'girls'].includes(val)) return 'female';
      return null;
    };

    const genderMismatch = selectedGuest && selectedRoomData &&
                          selectedRoomData.gender_restriction &&
                          selectedRoomData.gender_restriction !== 'mixed' &&
                          normalizeGender(selectedGuest.gender) !== selectedRoomData.gender_restriction;

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
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

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  <p className="font-bold">Gender Restriction</p>
                  <p>This tenant cannot be booked into this room because the room is restricted to <strong>{selectedRoomData.gender_restriction}</strong>.</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Guest / Tenant Name</label>
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
                          {user.gender && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${user.gender.toLowerCase() === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                              {user.gender}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Property</label>
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
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Room</label>
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
                      Room {r.room_number} ({r.available_slots} slots) {r.gender_restriction && r.gender_restriction !== 'mixed' ? ` - ${r.gender_restriction.toUpperCase()} ONLY` : ''}
                    </option>
                  ))}
                </select>
                {fieldErrors.room_id && <p className="text-red-500 text-xs mt-2">{fieldErrors.room_id[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Check-in</label>
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
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Check-out</label>
                <input
                  type="date"
                  required
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

            {selectedRoomData && (selectedRoomData.room_type === 'bedSpacer' || selectedRoomData.room_type === 'bedspacer') && (
              <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Number of Beds</label>
                  <div className="flex items-center gap-4">
                      <select
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 dark:text-white"
                          value={formData.bedCount}
                          onChange={e => setFormData({ ...formData, bedCount: parseInt(e.target.value) })}
                      >
                          {[...Array(Math.max(1, selectedRoomData.available_slots || 1))].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Bed' : 'Beds'}</option>
                          ))}
                      </select>
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
                  </div>
                )}
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
