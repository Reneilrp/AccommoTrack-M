import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { RefreshCw, Plus, Loader2, ArrowLeft, Sparkles, BellRing, Check } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { addonService } from '../../services/addonService';
import landlordService from '../../services/landlordService';
import AddonTable from './components/Addons/AddonTable';
import AddonModal from './components/Addons/AddonModal';
import AddonRequestTable from './components/Addons/AddonRequestTable';
import ActiveAddonTab from './components/Addons/ActiveAddonTab';

const toPropertyList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toAddonList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.addons)) return payload.addons;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toPendingList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.pendingRequests)) return payload.pendingRequests;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toActiveList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.activeAddons)) return payload.activeAddons;
  if (Array.isArray(payload?.data?.activeAddons)) return payload.data.activeAddons;
  return [];
};

const toActiveSummary = (payload) => {
  if (payload?.summary && typeof payload.summary === 'object') return payload.summary;
  if (payload?.data?.summary && typeof payload.data.summary === 'object') return payload.data.summary;
  return {};
};

const toPositivePropertyId = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const mapPendingRequest = (request, propertyTitle = '') => {
  const tenantNameFromUser = [request?.user?.first_name, request?.user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  // Try to find raw cents from the request
  const rawCents = Number(request?.price_cents ?? request?.price_at_booking_cents ?? request?.suggested_price_cents ?? 0);
  const displayPrice = rawCents / 100;

  return {
    id: request?.requestId ?? request?.request_id ?? request?.id,
    booking_id: request?.bookingId ?? request?.booking_id,
    addon_id: request?.addonId ?? request?.addon_id,
    addon_name: request?.addonName ?? request?.addon_name ?? request?.name ?? 'Add-on',
    quantity: request?.quantity ?? 1,
    price: displayPrice,
    suggested_price: displayPrice,
    price_type: request?.priceType ?? request?.price_type ?? 'one_time',
    addon_type: request?.addonType ?? request?.addon_type ?? 'fee',
    stock: request?.stock,
    note: request?.requestNote ?? request?.request_note ?? request?.note ?? '',
    created_at: request?.requestedAt ?? request?.requested_at ?? request?.createdAt ?? request?.created_at,
    tenant_name: request?.tenant?.name ?? request?.tenant_name ?? tenantNameFromUser ?? 'Tenant',
    room_number: request?.roomNumber ?? request?.room_number ?? '-',
    property_title: request?.property_title ?? request?.propertyTitle ?? propertyTitle,
  };
};

const mapActiveAddon = (item) => {
  const tenantNameFromUser = [item?.user?.first_name, item?.user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const rawCents = Number(item?.price_at_booking_cents ?? item?.price_cents ?? item?.price ?? 0);
  const displayPrice = rawCents / 100;

  return {
    id: item?.requestId ?? item?.request_id ?? item?.id,
    booking_id: item?.bookingId ?? item?.booking_id,
    addon_id: item?.addonId ?? item?.addon_id,
    addon_name: item?.addonName ?? item?.addon_name ?? item?.name ?? 'Add-on',
    quantity: item?.quantity ?? 1,
    price: displayPrice,
    price_type: item?.priceType ?? item?.price_type ?? 'monthly',
    addon_type: item?.addonType ?? item?.addon_type ?? 'fee',
    status: item?.status,
    approved_at: item?.approvedAt ?? item?.approved_at,
    tenant_name: item?.tenantName ?? item?.tenant_name ?? tenantNameFromUser ?? 'Tenant',
    room_number: item?.roomNumber ?? item?.room_number ?? '-',
  };
};

export default function AddonManagement({ user: _user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [requests, setRequests] = useState([]);
  const [activeAddons, setActiveAddons] = useState({ activeAddons: [], summary: {} });
  const [activeTab, setActiveTab] = useState('manage'); // manage, requests, active
  const [actionType, setActionType] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const selectedProperty = useMemo(
    () => properties.find((property) => Number(property?.id) === Number(selectedPropertyId)) || null,
    [properties, selectedPropertyId],
  );

  const urlPropertyId = useMemo(
    () => toPositivePropertyId(searchParams.get('property_id')),
    [searchParams],
  );

  const statePropertyId = useMemo(
    () => toPositivePropertyId(location.state?.propertyId),
    [location.state],
  );

  const fetchProperties = useCallback(async () => {
    setLoadingProperties(true);
    try {
      const response = await landlordService.getAccessibleProperties();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load properties');
      }

      const propertyRows = toPropertyList(response.data);
      setProperties(propertyRows);

      const availableIds = new Set(propertyRows.map((property) => Number(property?.id)).filter((id) => Number.isFinite(id) && id > 0));

      setSelectedPropertyId((previous) => {
        const preferredIds = [
          toPositivePropertyId(previous),
          urlPropertyId,
          statePropertyId,
        ].filter((id) => id !== null);

        const matched = preferredIds.find((id) => availableIds.has(id));
        if (matched) return matched;

        const fallback = toPositivePropertyId(propertyRows[0]?.id);
        return fallback;
      });
    } catch (error) {
      showError(error.message || 'Failed to load properties');
      setProperties([]);
      setSelectedPropertyId(null);
    } finally {
      setLoadingProperties(false);
    }
  }, [statePropertyId, urlPropertyId]);

  const fetchData = useCallback(async () => {
    if (!selectedPropertyId) {
      setAddons([]);
      setRequests([]);
      setActiveAddons({ activeAddons: [], summary: {} });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [addonsRes, requestsRes, activeRes] = await Promise.all([
        addonService.getPropertyAddons(selectedPropertyId),
        addonService.getPendingRequests(selectedPropertyId),
        addonService.getActiveAddons(selectedPropertyId),
      ]);

      const firstError = addonsRes.error || requestsRes.error || activeRes.error;
      if (!addonsRes.success || !requestsRes.success || !activeRes.success) {
        throw new Error(firstError || 'Failed to load add-ons');
      }

      const addonRows = toAddonList(addonsRes.data);
      const pendingRows = toPendingList(requestsRes.data).map((request) => mapPendingRequest(request, selectedProperty?.title || ''));
      const activeRows = toActiveList(activeRes.data).map(mapActiveAddon);
      const activeSummary = toActiveSummary(activeRes.data);

      setAddons(addonRows);
      setRequests(pendingRows);
      setActiveAddons({ activeAddons: activeRows, summary: activeSummary });
    } catch (err) {
      showError(err.message || 'Failed to load add-ons');
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId, selectedProperty]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    const current = searchParams.get('property_id');
    const selectedAsString = String(selectedPropertyId);
    if (current === selectedAsString) return;

    const next = new URLSearchParams(searchParams);
    next.set('property_id', selectedAsString);
    setSearchParams(next, { replace: true });
  }, [selectedPropertyId, searchParams, setSearchParams]);

  const openCreateModal = () => {
    if (!selectedPropertyId) {
      showError('Select a property first.');
      return;
    }
    setSelectedAddon(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!selectedPropertyId) {
      showError('Select a property first.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this add-on?')) return;

    try {
      const response = await addonService.deleteAddon(selectedPropertyId, id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete add-on');
      }

      showSuccess('Add-on deleted successfully');
      await fetchData();
    } catch (err) {
      showError(err.message || 'Failed to delete add-on');
    }
  };

  const handleToggleActive = async (addon) => {
    if (!selectedPropertyId) {
      showError('Select a property first.');
      return;
    }

    try {
      const response = await addonService.updateAddon(selectedPropertyId, addon.id, { is_active: !addon.is_active });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update add-on');
      }

      showSuccess(addon.is_active ? 'Add-on deactivated' : 'Add-on activated');
      await fetchData();
    } catch (err) {
      showError(err.message || 'Failed to update add-on');
    }
  };

  const handleSubmit = async (data) => {
    if (!selectedPropertyId) {
      showError('Select a property first.');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        ...data,
        price_cents: Math.round(Number(data?.price ?? 0) * 100),
      };
      // remove legacy price from payload
      delete payload.price;

      const response = selectedAddon
        ? await addonService.updateAddon(selectedPropertyId, selectedAddon.id, payload)
        : await addonService.createAddon(selectedPropertyId, payload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to save add-on');
      }

      if (selectedAddon) {
        showSuccess('Add-on updated successfully');
      } else {
        showSuccess('Add-on created successfully');
      }

      await fetchData();
      setShowModal(false);
    } catch (err) {
      showError(err.message || 'Failed to save add-on');
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestAction = async (id, addonId, action, customPrice = null) => {
    const request = requests.find((item) => Number(item?.id) === Number(id));
    const bookingId = request?.booking_id;
    const resolvedAddonId = addonId || request?.addon_id;

    if (!bookingId || !resolvedAddonId) {
      showError('Add-on request context is incomplete. Please refresh and try again.');
      return;
    }

    setProcessingId(id);
    setActionType(action);

    try {
      const payload = { action };
      if (action === 'approve' && customPrice !== null) {
        const approvedPrice = Number(customPrice);
        if (!Number.isFinite(approvedPrice) || approvedPrice < 0) {
          throw new Error('Please enter a valid approved price.');
        }
        payload.approved_price = approvedPrice;
      }

      const response = await addonService.handleAddonRequest(bookingId, resolvedAddonId, payload);
      if (!response.success) {
        throw new Error(response.error || 'Action failed');
      }

      showSuccess(`Request ${action}d successfully`);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  const handleUpdateActivePrice = async (bookingId, addonId, newPrice) => {
    try {
      const nextPrice = Number(newPrice);
      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        throw new Error('Please enter a valid price');
      }

      const response = await addonService.updateActiveAddonPrice(bookingId, addonId, nextPrice);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update price');
      }

      await fetchData();
    } catch (err) {
      showError(err.message || 'Failed to update price');
      throw err;
    }
  };

  const tabs = [
    { id: "manage", label: "Manage Add-ons", icon: Sparkles, count: addons.length },
    { id: "requests", label: "Pending Requests", icon: BellRing, count: requests.length },
    { id: "active", label: "Active Add-ons", icon: Check, count: activeAddons?.summary?.totalActive || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center relative min-h-[40px]">
            <div className="absolute left-0 flex items-center">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add-on Services</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage extra usage fees and rentals for tenants
              </p>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Property Context</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPropertyId || ''}
                    onChange={(event) => setSelectedPropertyId(toPositivePropertyId(event.target.value))}
                    disabled={loadingProperties || properties.length === 0}
                    className="min-w-[260px] max-w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-100"
                  >
                    {properties.length === 0 && <option value="">No accessible properties</option>}
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title || `Property #${property.id}`}
                      </option>
                    ))}
                  </select>
                  {loadingProperties && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
                </div>
              </div>
            </div>

            <button
              onClick={openCreateModal}
              disabled={!selectedPropertyId}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-500/20"
            >
              <Plus className="w-5 h-5" />
              Add New Usage Fee
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={fetchData}
                disabled={loading || !selectedPropertyId}
                title="Refresh"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          )}

          {!selectedPropertyId && !loadingProperties ? (
            <div className="h-full min-h-[260px] flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
              <div>
                <p className="font-semibold">Select a property to manage add-ons.</p>
                <p className="text-sm mt-2">Add-on routes are property-scoped and require a property context.</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'manage' && (
                <AddonTable
                  addons={addons}
                  onEdit={(a) => { setSelectedAddon(a); setShowModal(true); }}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleActive}
                />
              )}
              {activeTab === 'requests' && (
                <AddonRequestTable
                  requests={requests}
                  onAction={handleRequestAction}
                  processingId={processingId}
                  actionType={actionType}
                />
              )}
              {activeTab === 'active' && (
                <ActiveAddonTab
                  data={activeAddons}
                  onUpdatePrice={handleUpdateActivePrice}
                />
              )}
            </>
          )}
        </div>

        <AddonModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          addon={selectedAddon}
          onSubmit={handleSubmit}
          submitting={processing}
        />
      </div>
    </div>
  );
}