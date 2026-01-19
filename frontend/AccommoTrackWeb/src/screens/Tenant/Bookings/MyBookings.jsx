import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';
import { getImageUrl } from '../../../utils/api';
import { 
  HomeIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const MyBookings = () => {
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'financials', 'history'
  const [currentStay, setCurrentStay] = useState(null);
  const [history, setHistory] = useState({ bookings: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [requestingAddon, setRequestingAddon] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'current' || activeTab === 'financials') {
        const data = await tenantService.getCurrentStay();
        setCurrentStay(data);
      } else if (activeTab === 'history') {
        const data = await tenantService.getHistory();
        setHistory(data);
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAddon = async (addon) => {
    setRequestingAddon(addon.id);
    try {
      await tenantService.requestAddon(addon.id, 1);
      // Refresh data
      fetchData();
      setShowAddonModal(false);
    } catch (err) {
      console.error('Failed to request addon:', err);
      alert(err.response?.data?.message || 'Failed to request addon');
    } finally {
      setRequestingAddon(null);
    }
  };

  const handleCancelAddonRequest = async (addonId) => {
    if (!confirm('Cancel this addon request?')) return;
    try {
      await tenantService.cancelAddonRequest(addonId);
      fetchData();
    } catch (err) {
      console.error('Failed to cancel addon request:', err);
      alert('Failed to cancel request');
    }
  };

  const tabs = [
    { id: 'current', label: 'My Stay', icon: HomeIcon },
    { id: 'financials', label: 'Financials', icon: CurrencyDollarIcon },
    { id: 'history', label: 'History', icon: ClockIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-500 mt-1">Manage your current stay, payments, and add-ons</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
          {error}
          <button onClick={fetchData} className="ml-2 underline">Retry</button>
        </div>
      ) : (
        <>
          {activeTab === 'current' && (
            <CurrentStayTab 
              data={currentStay} 
              onRequestAddon={() => setShowAddonModal(true)}
              onCancelAddon={handleCancelAddonRequest}
            />
          )}
          {activeTab === 'financials' && (
            <FinancialsTab data={currentStay} />
          )}
          {activeTab === 'history' && (
            <HistoryTab data={history} onLoadMore={() => {}} />
          )}
        </>
      )}

      {/* Addon Request Modal */}
      {showAddonModal && currentStay?.hasActiveStay && (
        <AddonModal
          availableAddons={currentStay.addons.available}
          onClose={() => setShowAddonModal(false)}
          onRequest={handleRequestAddon}
          requestingId={requestingAddon}
        />
      )}
    </div>
  );
};

// ==================== Current Stay Tab ====================
const CurrentStayTab = ({ data, onRequestAddon, onCancelAddon }) => {
  if (!data?.hasActiveStay) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm">
        <HomeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Stay</h3>
        <p className="text-gray-500 mb-4">You don't have an active booking at the moment.</p>
        {data?.upcomingBooking && (
          <div className="inline-block bg-green-50 text-green-700 px-4 py-2 rounded-lg">
            <CalendarIcon className="w-5 h-5 inline mr-2" />
            Upcoming: {data.upcomingBooking.property} - {data.upcomingBooking.room}
            <br />
            <span className="text-sm">Starts in {data.upcomingBooking.daysUntil} days</span>
          </div>
        )}
      </div>
    );
  }

  const { booking, room, property, landlord, addons } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Room Details Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="relative h-48 bg-gray-200">
            <img
              src={getImageUrl(property.image) || 'https://via.placeholder.com/800x400?text=No+Image'}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h2 className="text-xl font-bold text-white">{property.title}</h2>
              <p className="text-white/80 text-sm flex items-center">
                <MapPinIcon className="w-4 h-4 mr-1" />
                {property.address}
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Room" value={room.roomNumber} icon="🚪" />
              <StatCard label="Monthly Rent" value={`₱${booking.monthlyRent.toLocaleString()}`} icon="💰" />
              <StatCard label="Days Left" value={booking.daysRemaining} icon="📅" />
              <StatCard 
                label="Status" 
                value={booking.paymentStatus} 
                icon={booking.paymentStatus === 'paid' ? '✅' : '⏳'} 
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Lease Period:</span> {booking.startDate} to {booking.endDate}
                <span className="ml-4 font-medium">Duration:</span> {booking.totalMonths} months
              </p>
            </div>
          </div>
        </div>

        {/* Add-ons Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add-ons & Extras</h3>
            <button
              onClick={onRequestAddon}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Request Add-on
            </button>
          </div>

          {/* Active Add-ons */}
          {addons.active.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Active</h4>
              <div className="space-y-2">
                {addons.active.map((addon) => (
                  <AddonItem key={addon.pivotId} addon={addon} status="active" />
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {addons.pending.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-amber-600 mb-2">Pending Approval</h4>
              <div className="space-y-2">
                {addons.pending.map((addon) => (
                  <AddonItem 
                    key={addon.pivotId} 
                    addon={addon} 
                    status="pending"
                    onCancel={() => onCancelAddon(addon.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {addons.active.length === 0 && addons.pending.length === 0 && (
            <p className="text-gray-400 text-center py-4">No add-ons yet. Request one to get started!</p>
          )}

          {addons.monthlyTotal > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Add-on Total:</span>
              <span className="font-semibold text-green-600">+₱{addons.monthlyTotal.toLocaleString()}/mo</span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Landlord Contact Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Landlord Contact</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">{landlord.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{landlord.name}</p>
              <p className="text-sm text-gray-500">Property Owner</p>
            </div>
          </div>
          <div className="space-y-2">
            <a href={`mailto:${landlord.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600">
              <EnvelopeIcon className="w-4 h-4" />
              {landlord.email}
            </a>
            {landlord.phone && (
              <a href={`tel:${landlord.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600">
                <PhoneIcon className="w-4 h-4" />
                {landlord.phone}
              </a>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Rent</span>
              <span className="font-medium">₱{booking.monthlyRent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Add-ons</span>
              <span className="font-medium">₱{addons.monthlyTotal.toLocaleString()}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total Monthly</span>
              <span className="font-bold text-green-600">
                ₱{(booking.monthlyRent + addons.monthlyTotal).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Financials Tab ====================
const FinancialsTab = ({ data }) => {
  if (!data?.hasActiveStay) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm">
        <CurrencyDollarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">No Active Booking</h3>
        <p className="text-gray-500">Financial details will appear when you have an active stay.</p>
      </div>
    );
  }

  const { financials, booking } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Monthly Rent</p>
          <p className="text-2xl font-bold text-gray-900">₱{financials.monthlyRent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Monthly Add-ons</p>
          <p className="text-2xl font-bold text-amber-600">+₱{financials.monthlyAddons.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Total Monthly</p>
          <p className="text-2xl font-bold text-green-600">₱{financials.monthlyTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
        {financials.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Method</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {financials.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm font-medium">₱{payment.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{payment.paymentMethod || '-'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No payments recorded yet.</p>
        )}
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h3>
        {financials.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {financials.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{invoice.description || 'Monthly Rent'}</td>
                    <td className="py-3 px-4 text-sm font-medium">₱{invoice.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No invoices generated yet.</p>
        )}
      </div>
    </div>
  );
};

// ==================== History Tab ====================
const HistoryTab = ({ data, onLoadMore }) => {
  const { bookings, pagination } = data;

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm">
        <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">No History Yet</h3>
        <p className="text-gray-500">Your past bookings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={getImageUrl(booking.property.image) || 'https://via.placeholder.com/64'}
                  alt={booking.property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{booking.property.title}</h4>
                <p className="text-sm text-gray-500">Room {booking.room.roomNumber}</p>
                <p className="text-xs text-gray-400">{booking.period.startDate} - {booking.period.endDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Paid</p>
                <p className="font-semibold text-green-600">₱{booking.financials.totalPaid.toLocaleString()}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          </div>
          {booking.addons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2">Add-ons used:</p>
              <div className="flex flex-wrap gap-2">
                {booking.addons.map((addon, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {addon.name} ({addon.priceType === 'monthly' ? '₱' + addon.price + '/mo' : '₱' + addon.price})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {pagination && pagination.currentPage < pagination.lastPage && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-green-600 font-medium hover:bg-green-50 rounded-lg transition-colors"
        >
          Load More
        </button>
      )}
    </div>
  );
};

// ==================== Helper Components ====================
const StatCard = ({ label, value, icon }) => (
  <div className="text-center p-3 bg-gray-50 rounded-lg">
    <div className="text-2xl mb-1">{icon}</div>
    <p className="text-lg font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    paid: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    unpaid: 'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-600',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const AddonItem = ({ addon, status, onCancel }) => (
  <div className={`flex items-center justify-between p-3 rounded-lg ${
    status === 'active' ? 'bg-green-50' : 'bg-amber-50'
  }`}>
    <div className="flex items-center gap-3">
      <SparklesIcon className={`w-5 h-5 ${status === 'active' ? 'text-green-600' : 'text-amber-600'}`} />
      <div>
        <p className="font-medium text-gray-900">{addon.name}</p>
        <p className="text-xs text-gray-500">
          {addon.priceTypeLabel} • {addon.addonType === 'rental' ? 'Provided' : 'Usage Fee'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-gray-900">
        ₱{addon.price.toLocaleString()}
        {addon.priceType === 'monthly' && <span className="text-xs text-gray-500">/mo</span>}
      </span>
      {status === 'pending' && onCancel && (
        <button
          onClick={onCancel}
          className="text-red-500 hover:text-red-700 p-1"
          title="Cancel Request"
        >
          <XCircleIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  </div>
);

const AddonModal = ({ availableAddons, onClose, onRequest, requestingId }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Available Add-ons</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        {availableAddons.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No add-ons available for this property.</p>
        ) : (
          <div className="space-y-3">
            {availableAddons.map((addon) => (
              <div key={addon.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{addon.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        addon.priceType === 'monthly' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {addon.priceTypeLabel}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        addon.addonType === 'rental' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {addon.addonTypeLabel}
                      </span>
                    </div>
                    {addon.description && (
                      <p className="text-sm text-gray-500 mt-1">{addon.description}</p>
                    )}
                    <p className="text-lg font-semibold text-green-600 mt-2">
                      ₱{addon.price.toLocaleString()}
                      {addon.priceType === 'monthly' && <span className="text-sm font-normal">/month</span>}
                    </p>
                    {addon.stock !== null && (
                      <p className="text-xs text-gray-400 mt-1">
                        {addon.hasStock ? `${addon.stock} available` : 'Out of stock'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRequest(addon)}
                    disabled={!addon.hasStock || requestingId === addon.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      addon.hasStock && requestingId !== addon.id
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {requestingId === addon.id ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      'Request'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default MyBookings;
