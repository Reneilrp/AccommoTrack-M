import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Gift, Loader2, RefreshCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../services/adminService';

const getLocalDateInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const INITIAL_GRANT_FORM = {
  plan_id: '',
  starts_at: getLocalDateInputValue(),
  mode: 'duration_months',
  duration_months: '1',
  ends_at: '',
  auto_renew: false,
  notes: '',
};

const INITIAL_EXTEND_FORM = {
  grant_id: '',
  mode: 'add_months',
  add_months: '1',
  ends_at: '',
  notes: '',
};

const INITIAL_REVOKE_FORM = {
  grant_id: '',
  reason: '',
};

const toPositiveIntegerOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleString();
};

const formatMoneyFromCents = (value, currency = 'PHP') => {
  const amount = Number(value || 0) / 100;
  return amount.toLocaleString('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
  });
};

const formatFeatureLabel = (value) => {
  if (!value) {
    return 'Unknown feature';
  }

  return String(value)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getGrantStatusClasses = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'revoked':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 'expired':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }
};

const extractUsers = (response) => {
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const buildLandlordLabel = (landlord) => {
  if (!landlord) {
    return 'Unknown landlord';
  }

  const first = landlord.first_name || '';
  const last = landlord.last_name || '';
  const fullName = `${first} ${last}`.trim();

  if (fullName) {
    return `${fullName} (${landlord.email || 'no-email'})`;
  }

  return landlord.email || `Landlord #${landlord.id}`;
};

const buildPlanLabel = (plan) => {
  const monthly = formatMoneyFromCents(plan?.monthly_price_cents, plan?.currency || 'PHP');
  const annual = plan?.annual_price_cents === null || plan?.annual_price_cents === undefined
    ? null
    : formatMoneyFromCents(plan.annual_price_cents, plan?.currency || 'PHP');

  return annual
    ? `${plan?.name || 'Plan'} - ${monthly}/month, ${annual}/year`
    : `${plan?.name || 'Plan'} - ${monthly}/month`;
};

export default function SubscriptionGrants() {
  const [plans, setPlans] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [landlordSearch, setLandlordSearch] = useState('');
  const [selectedLandlordId, setSelectedLandlordId] = useState('');

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  const [grantForm, setGrantForm] = useState(INITIAL_GRANT_FORM);
  const [extendForm, setExtendForm] = useState(INITIAL_EXTEND_FORM);
  const [revokeForm, setRevokeForm] = useState(INITIAL_REVOKE_FORM);

  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  const filteredLandlords = useMemo(() => {
    const query = landlordSearch.trim().toLowerCase();

    const sorted = [...landlords].sort((a, b) => {
      const aName = buildLandlordLabel(a).toLowerCase();
      const bName = buildLandlordLabel(b).toLowerCase();
      return aName.localeCompare(bName);
    });

    if (!query) {
      return sorted;
    }

    return sorted.filter((landlord) => {
      const idMatch = String(landlord?.id || '').includes(query);
      const emailMatch = String(landlord?.email || '').toLowerCase().includes(query);
      const nameMatch = buildLandlordLabel(landlord).toLowerCase().includes(query);
      return idMatch || emailMatch || nameMatch;
    });
  }, [landlords, landlordSearch]);

  const selectedLandlord = useMemo(
    () => landlords.find((item) => String(item.id) === String(selectedLandlordId)) || null,
    [landlords, selectedLandlordId],
  );

  const currentSubscription = overview?.current?.subscription || null;
  const currentPlan = overview?.current?.plan || null;
  const usage = overview?.current?.usage || {};
  const grants = Array.isArray(overview?.timeline?.grants) ? overview.timeline.grants : [];
  const events = Array.isArray(overview?.timeline?.events) ? overview.timeline.events : [];

  const refreshOverview = useCallback(async (targetLandlordId) => {
    const landlordId = toPositiveIntegerOrNull(targetLandlordId ?? selectedLandlordId);

    if (!landlordId) {
      setOverview(null);
      setOverviewError('Select a landlord to view subscription overview.');
      return;
    }

    setOverviewLoading(true);
    setOverviewError('');

    const response = await adminService.getSubscriptionOverview(landlordId);
    if (!response.success) {
      setOverview(null);
      setOverviewError(response.error || response.message || 'Failed to load subscription overview.');
      setOverviewLoading(false);
      return;
    }

    setOverview(response.data || null);

    const latestGrantId = response?.data?.timeline?.grants?.[0]?.id;
    if (latestGrantId) {
      const latestGrantIdText = String(latestGrantId);
      setExtendForm((prev) => ({ ...prev, grant_id: prev.grant_id || latestGrantIdText }));
      setRevokeForm((prev) => ({ ...prev, grant_id: prev.grant_id || latestGrantIdText }));
    }

    setOverviewLoading(false);
  }, [selectedLandlordId]);

  const fetchBootstrap = useCallback(async () => {
    setBootstrapLoading(true);

    try {
      const [plansResponse, usersResponse] = await Promise.all([
        adminService.getSubscriptionPlans({ include_inactive: true }),
        adminService.getUsers(),
      ]);

      if (!plansResponse.success) {
        toast.error(plansResponse.error || plansResponse.message || 'Failed to load subscription plans.');
      }

      const availablePlans = Array.isArray(plansResponse.data) ? plansResponse.data : [];
      setPlans(availablePlans);
      setGrantForm((prev) => {
        if (prev.plan_id) {
          return prev;
        }

        const firstPlanId = availablePlans[0]?.id;
        return {
          ...prev,
          plan_id: firstPlanId ? String(firstPlanId) : '',
        };
      });

      const allUsers = extractUsers(usersResponse);
      const landlordsOnly = allUsers.filter((user) => String(user?.role || '').toLowerCase() === 'landlord');
      setLandlords(landlordsOnly);

      setSelectedLandlordId((prev) => {
        if (prev) {
          return prev;
        }

        const firstLandlordId = landlordsOnly[0]?.id;
        return firstLandlordId ? String(firstLandlordId) : '';
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load admin subscription grant data.');
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    if (!selectedLandlordId) {
      setOverview(null);
      setOverviewError('');
      return;
    }

    setExtendForm(INITIAL_EXTEND_FORM);
    setRevokeForm(INITIAL_REVOKE_FORM);
    refreshOverview(selectedLandlordId);
  }, [refreshOverview, selectedLandlordId]);

  const handleGrantSubmit = async (event) => {
    event.preventDefault();

    const landlordId = toPositiveIntegerOrNull(selectedLandlordId);
    const planId = toPositiveIntegerOrNull(grantForm.plan_id);

    if (!landlordId) {
      toast.error('Select a landlord before creating a grant.');
      return;
    }

    if (!planId) {
      toast.error('Select a subscription plan for this grant.');
      return;
    }

    const payload = {
      landlord_id: landlordId,
      plan_id: planId,
      auto_renew: Boolean(grantForm.auto_renew),
    };

    if (grantForm.starts_at) {
      payload.starts_at = grantForm.starts_at;
    }

    if (grantForm.mode === 'duration_months') {
      const durationMonths = toPositiveIntegerOrNull(grantForm.duration_months);
      if (!durationMonths) {
        toast.error('Duration in months must be at least 1.');
        return;
      }

      payload.duration_months = durationMonths;
    } else {
      if (!grantForm.ends_at) {
        toast.error('End date is required when grant mode uses end date.');
        return;
      }

      payload.ends_at = grantForm.ends_at;
    }

    const trimmedNotes = grantForm.notes.trim();
    if (trimmedNotes) {
      payload.notes = trimmedNotes;
    }

    setGrantSubmitting(true);
    const response = await adminService.grantSubscription(payload);
    setGrantSubmitting(false);

    if (!response.success) {
      toast.error(response.error || response.message || 'Failed to create subscription grant.');
      return;
    }

    toast.success(response.message || 'Subscription grant created successfully.');

    const createdGrantId = response?.data?.grant?.id;
    if (createdGrantId) {
      const createdGrantIdText = String(createdGrantId);
      setExtendForm((prev) => ({ ...prev, grant_id: createdGrantIdText }));
      setRevokeForm((prev) => ({ ...prev, grant_id: createdGrantIdText }));
    }

    setGrantForm((prev) => ({
      ...INITIAL_GRANT_FORM,
      plan_id: prev.plan_id,
    }));

    refreshOverview(landlordId);
  };

  const handleExtendSubmit = async (event) => {
    event.preventDefault();

    const landlordId = toPositiveIntegerOrNull(selectedLandlordId);
    const grantId = toPositiveIntegerOrNull(extendForm.grant_id);

    if (!landlordId) {
      toast.error('Select a landlord before extending a grant.');
      return;
    }

    if (!grantId) {
      toast.error('Grant ID is required to extend a grant.');
      return;
    }

    const payload = {};

    if (extendForm.mode === 'add_months') {
      const addMonths = toPositiveIntegerOrNull(extendForm.add_months);
      if (!addMonths) {
        toast.error('Months to add must be at least 1.');
        return;
      }

      payload.add_months = addMonths;
    } else {
      if (!extendForm.ends_at) {
        toast.error('New end date is required when extending by date.');
        return;
      }

      payload.ends_at = extendForm.ends_at;
    }

    const notes = extendForm.notes.trim();
    if (notes) {
      payload.notes = notes;
    }

    setExtendSubmitting(true);
    const response = await adminService.extendSubscriptionGrant(grantId, payload);
    setExtendSubmitting(false);

    if (!response.success) {
      toast.error(response.error || response.message || 'Failed to extend subscription grant.');
      return;
    }

    toast.success(response.message || 'Subscription grant extended successfully.');
    setExtendForm((prev) => ({
      ...INITIAL_EXTEND_FORM,
      grant_id: prev.grant_id,
    }));

    refreshOverview(landlordId);
  };

  const handleRevokeSubmit = async (event) => {
    event.preventDefault();

    const landlordId = toPositiveIntegerOrNull(selectedLandlordId);
    const grantId = toPositiveIntegerOrNull(revokeForm.grant_id);

    if (!landlordId) {
      toast.error('Select a landlord before revoking a grant.');
      return;
    }

    if (!grantId) {
      toast.error('Grant ID is required to revoke a grant.');
      return;
    }

    const payload = {};
    const reason = revokeForm.reason.trim();
    if (reason) {
      payload.reason = reason;
    }

    const confirmed = window.confirm('Proceed with revoking this subscription grant?');
    if (!confirmed) {
      return;
    }

    setRevokeSubmitting(true);
    const response = await adminService.revokeSubscriptionGrant(grantId, payload);
    setRevokeSubmitting(false);

    if (!response.success) {
      toast.error(response.error || response.message || 'Failed to revoke subscription grant.');
      return;
    }

    toast.success(response.message || 'Subscription grant revoked successfully.');
    setRevokeForm((prev) => ({
      ...INITIAL_REVOKE_FORM,
      grant_id: prev.grant_id,
    }));

    refreshOverview(landlordId);
  };

  const useGrantForExtend = (grantId) => {
    setExtendForm((prev) => ({ ...prev, grant_id: String(grantId) }));
  };

  const useGrantForRevoke = (grantId) => {
    setRevokeForm((prev) => ({ ...prev, grant_id: String(grantId) }));
  };

  return (
    <div className="w-full max-w-full px-6 py-6 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Subscription Grants
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Grant, extend, and revoke landlord subscriptions from the admin panel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBootstrap}
            disabled={bootstrapLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
          >
            {bootstrapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Reload Data
          </button>
          <button
            onClick={() => refreshOverview(selectedLandlordId)}
            disabled={overviewLoading || !selectedLandlordId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {overviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
            Refresh Overview
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search landlord</span>
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={landlordSearch}
                onChange={(event) => setLandlordSearch(event.target.value)}
                placeholder="Filter by name, email, or ID"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Select landlord</span>
            <select
              value={selectedLandlordId}
              onChange={(event) => setSelectedLandlordId(event.target.value)}
              className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Choose landlord</option>
              {filteredLandlords.map((landlord) => (
                <option key={landlord.id} value={String(landlord.id)}>
                  {`#${landlord.id} - ${buildLandlordLabel(landlord)}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {bootstrapLoading ? 'Loading landlords and plans...' : `Loaded ${filteredLandlords.length} landlord options and ${plans.length} subscription plans.`}
        </div>

        {selectedLandlord && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{buildLandlordLabel(selectedLandlord)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Landlord ID: {selectedLandlord.id}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Current Plan</p>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{currentPlan?.name || 'None'}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {currentPlan ? buildPlanLabel(currentPlan) : 'No active subscription data yet.'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Subscription Window</p>
          <p className="mt-2 text-sm text-gray-900 dark:text-white">
            Start: <span className="font-medium">{formatDateTime(currentSubscription?.starts_at)}</span>
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            End: <span className="font-medium">{formatDateTime(currentSubscription?.ends_at)}</span>
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            Status: <span className="font-medium">{String(currentSubscription?.status || 'N/A').replace(/_/g, ' ')}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Usage Summary</p>
          <p className="mt-2 text-sm text-gray-900 dark:text-white">
            Properties: <span className="font-medium">{usage.properties_count ?? 0}</span> / {usage.properties_limit ?? 'No Limit'}
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            Rooms: <span className="font-medium">{usage.rooms_count ?? 0}</span> / {usage.rooms_limit ?? 'No Limit'}
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            Restricted: <span className="font-medium">{usage.blocked_by_subscription ? 'Yes' : 'No'}</span>
          </p>
        </div>
      </div>

      {overviewError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {overviewError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <form
          onSubmit={handleGrantSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grant Plan</h2>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan</span>
            <select
              value={grantForm.plan_id}
              onChange={(event) => setGrantForm((prev) => ({ ...prev, plan_id: event.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              required
            >
              <option value="">Select plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={String(plan.id)}>
                  {buildPlanLabel(plan)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Starts At</span>
            <input
              type="date"
              value={grantForm.starts_at}
              onChange={(event) => setGrantForm((prev) => ({ ...prev, starts_at: event.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grant Duration Mode</span>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setGrantForm((prev) => ({ ...prev, mode: 'duration_months' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  grantForm.mode === 'duration_months'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                }`}
              >
                Duration (months)
              </button>
              <button
                type="button"
                onClick={() => setGrantForm((prev) => ({ ...prev, mode: 'ends_at' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  grantForm.mode === 'ends_at'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                }`}
              >
                End date
              </button>
            </div>
          </div>

          {grantForm.mode === 'duration_months' ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Duration Months</span>
              <input
                type="number"
                min="1"
                value={grantForm.duration_months}
                onChange={(event) => setGrantForm((prev) => ({ ...prev, duration_months: event.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                required
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ends At</span>
              <input
                type="date"
                value={grantForm.ends_at}
                onChange={(event) => setGrantForm((prev) => ({ ...prev, ends_at: event.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                required
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={grantForm.auto_renew}
              onChange={(event) => setGrantForm((prev) => ({ ...prev, auto_renew: event.target.checked }))}
              className="rounded border-gray-300 text-blue-600"
            />
            Auto renew
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</span>
            <textarea
              value={grantForm.notes}
              onChange={(event) => setGrantForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              placeholder="Optional grant notes"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </label>

          <button
            type="submit"
            disabled={grantSubmitting || !selectedLandlordId}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {grantSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Grant
          </button>
        </form>

        <form
          onSubmit={handleExtendSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Extend Grant</h2>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grant ID</span>
            <input
              type="number"
              min="1"
              value={extendForm.grant_id}
              onChange={(event) => setExtendForm((prev) => ({ ...prev, grant_id: event.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              required
            />
          </label>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Extension Mode</span>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setExtendForm((prev) => ({ ...prev, mode: 'add_months' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  extendForm.mode === 'add_months'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                }`}
              >
                Add months
              </button>
              <button
                type="button"
                onClick={() => setExtendForm((prev) => ({ ...prev, mode: 'ends_at' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  extendForm.mode === 'ends_at'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                }`}
              >
                Set end date
              </button>
            </div>
          </div>

          {extendForm.mode === 'add_months' ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Months to Add</span>
              <input
                type="number"
                min="1"
                value={extendForm.add_months}
                onChange={(event) => setExtendForm((prev) => ({ ...prev, add_months: event.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                required
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">New End Date</span>
              <input
                type="date"
                value={extendForm.ends_at}
                onChange={(event) => setExtendForm((prev) => ({ ...prev, ends_at: event.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                required
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</span>
            <textarea
              value={extendForm.notes}
              onChange={(event) => setExtendForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              placeholder="Optional extension note"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </label>

          <button
            type="submit"
            disabled={extendSubmitting || !selectedLandlordId}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {extendSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Extend Grant
          </button>
        </form>

        <form
          onSubmit={handleRevokeSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revoke Grant</h2>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grant ID</span>
            <input
              type="number"
              min="1"
              value={revokeForm.grant_id}
              onChange={(event) => setRevokeForm((prev) => ({ ...prev, grant_id: event.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason</span>
            <textarea
              value={revokeForm.reason}
              onChange={(event) => setRevokeForm((prev) => ({ ...prev, reason: event.target.value }))}
              rows={4}
              placeholder="Optional revoke reason"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </label>

          <button
            type="submit"
            disabled={revokeSubmitting || !selectedLandlordId}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
          >
            {revokeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Revoke Grant
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grant Timeline</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Recent grants for the selected landlord. Use quick actions to prefill Extend/Revoke forms.
          </p>
        </div>

        {overviewLoading ? (
          <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading timeline...
          </div>
        ) : grants.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">No grants found for this landlord yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Grant</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Window</th>
                  <th className="text-left px-4 py-3 font-semibold">Limits</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">#{grant.id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Auto renew: {grant.auto_renew ? 'Yes' : 'No'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white font-medium">{grant?.plan?.name || 'Unknown plan'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatMoneyFromCents(grant?.plan?.monthly_price_cents, grant?.plan?.currency || 'PHP')} / month
                      </p>
                      {Array.isArray(grant?.plan?.features) && grant.plan.features.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {grant.plan.features.slice(0, 3).map((feature) => (
                            <span key={`${grant.id}-${feature}`} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">
                              {formatFeatureLabel(feature)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getGrantStatusClasses(grant.status)}`}>
                        {String(grant.status || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      <p>Start: {formatDateTime(grant.starts_at)}</p>
                      <p>End: {formatDateTime(grant.ends_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      <p>Properties: {grant?.plan?.max_properties ?? 'N/A'}</p>
                      <p>Rooms: {grant?.plan?.max_rooms_total ?? 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => useGrantForExtend(grant.id)}
                          className="px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        >
                          Use for Extend
                        </button>
                        <button
                          type="button"
                          onClick={() => useGrantForRevoke(grant.id)}
                          className="px-2.5 py-1 rounded-md border border-red-300 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Use for Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Subscription Events</h2>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">No subscription events found.</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {events.slice(0, 10).map((item) => (
              <li key={item.id} className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.description || item.event || 'Subscription event'}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Event: {item.event || 'N/A'} | At: {formatDateTime(item.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
