import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Key, Loader2, RefreshCcw, Search, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../services/adminService';

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

const getVerificationStatusBadge = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

export default function PaymongoBypassManagement() {
  const [landlords, setLandlords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [landlordSearch, setLandlordSearch] = useState('');
  const [selectedLandlordId, setSelectedLandlordId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const landlordsWithBypass = useMemo(
    () => landlords.filter((l) => l.paymongo_verification_bypass),
    [landlords],
  );

  const fetchLandlords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getUsers();
      const allUsers = extractUsers(response);
      const landlordsOnly = allUsers.filter((user) => String(user?.role || '').toLowerCase() === 'landlord');
      setLandlords(landlordsOnly);

      if (!selectedLandlordId && landlordsOnly.length > 0) {
        setSelectedLandlordId(String(landlordsOnly[0].id));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load landlords.');
    } finally {
      setLoading(false);
    }
  }, [selectedLandlordId]);

  useEffect(() => {
    fetchLandlords();
  }, [fetchLandlords]);

  const handleEnableBypass = async () => {
    if (!selectedLandlordId) {
      toast.error('Please select a landlord first.');
      return;
    }

    const confirmed = window.confirm(
      `Enable PayMongo verification bypass for ${buildLandlordLabel(selectedLandlord)}?\n\n` +
      'This will allow them to accept payments without merchant verification. ' +
      'Only use this for testing purposes.'
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await adminService.enablePaymongoBypass(selectedLandlordId);
      
      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to enable bypass');
      }

      toast.success(response.message || 'PayMongo verification bypass enabled successfully.');
      await fetchLandlords();
    } catch (error) {
      toast.error(error?.message || 'Failed to enable bypass.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableBypass = async () => {
    if (!selectedLandlordId) {
      toast.error('Please select a landlord first.');
      return;
    }

    const confirmed = window.confirm(
      `Disable PayMongo verification bypass for ${buildLandlordLabel(selectedLandlord)}?\n\n` +
      'They will need proper merchant verification to accept payments again.'
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await adminService.disablePaymongoBypass(selectedLandlordId);
      
      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to disable bypass');
      }

      toast.success(response.message || 'PayMongo verification bypass disabled successfully.');
      await fetchLandlords();
    } catch (error) {
      toast.error(error?.message || 'Failed to disable bypass.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickToggle = async (landlordId, currentStatus) => {
    const landlord = landlords.find((l) => l.id === landlordId);
    if (!landlord) return;

    const action = currentStatus ? 'disable' : 'enable';
    const confirmed = window.confirm(
      `${action === 'enable' ? 'Enable' : 'Disable'} PayMongo bypass for ${buildLandlordLabel(landlord)}?`
    );

    if (!confirmed) return;

    setActionLoading(true);
    try {
      const response = currentStatus
        ? await adminService.disablePaymongoBypass(landlordId)
        : await adminService.enablePaymongoBypass(landlordId);

      if (!response.success) {
        throw new Error(response.error || response.message || `Failed to ${action} bypass`);
      }

      toast.success(`PayMongo bypass ${action}d successfully.`);
      await fetchLandlords();
    } catch (error) {
      toast.error(error?.message || `Failed to ${action} bypass.`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full px-6 py-6 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            PayMongo Verification Bypass
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Temporarily allow specific landlords to accept payments without merchant verification (for testing only).
          </p>
        </div>

        <button
          onClick={fetchLandlords}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          Reload Data
        </button>
      </div>

      {/* Warning Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 px-4 py-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Testing Feature Only</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              This bypass should only be used for testing purposes with test PayMongo keys. 
              Never enable this for production landlords accepting real payments.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Landlords</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{landlords.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Bypass Enabled</p>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{landlordsWithBypass.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Verified Landlords</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {landlords.filter((l) => l.paymongo_verification_status === 'verified').length}
          </p>
        </div>
      </div>

      {/* Landlord Selection */}
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
          {loading ? 'Loading landlords...' : `Showing ${filteredLandlords.length} of ${landlords.length} landlords.`}
        </div>

        {selectedLandlord && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{buildLandlordLabel(selectedLandlord)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Landlord ID: {selectedLandlord.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Verification Status</p>
                <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-semibold ${getVerificationStatusBadge(selectedLandlord.paymongo_verification_status)}`}>
                  {selectedLandlord.paymongo_verification_status || 'Not Started'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Bypass Status</p>
                <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  selectedLandlord.paymongo_verification_bypass
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {selectedLandlord.paymongo_verification_bypass ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {selectedLandlord.paymongo_verification_bypass ? (
                <button
                  onClick={handleDisableBypass}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Disable Bypass
                </button>
              ) : (
                <button
                  onClick={handleEnableBypass}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Enable Bypass
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Landlords with Bypass Enabled */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Landlords with Bypass Enabled</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            These landlords can currently accept payments without merchant verification.
          </p>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading landlords...
          </div>
        ) : landlordsWithBypass.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
            No landlords currently have bypass enabled.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Landlord</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Verification Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {landlordsWithBypass.map((landlord) => (
                  <tr key={landlord.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {landlord.first_name} {landlord.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ID: {landlord.id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{landlord.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getVerificationStatusBadge(landlord.paymongo_verification_status)}`}>
                        {landlord.paymongo_verification_status || 'Not Started'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleQuickToggle(landlord.id, landlord.paymongo_verification_bypass)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-md bg-gray-600 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-60"
                      >
                        Disable
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Landlords List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Landlords</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Complete list of landlords with their verification and bypass status.
          </p>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading landlords...
          </div>
        ) : filteredLandlords.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
            No landlords found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Landlord</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Verification</th>
                  <th className="text-left px-4 py-3 font-semibold">Bypass</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLandlords.map((landlord) => (
                  <tr key={landlord.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {landlord.first_name} {landlord.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ID: {landlord.id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{landlord.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getVerificationStatusBadge(landlord.paymongo_verification_status)}`}>
                        {landlord.paymongo_verification_status || 'Not Started'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        landlord.paymongo_verification_bypass
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {landlord.paymongo_verification_bypass ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleQuickToggle(landlord.id, landlord.paymongo_verification_bypass)}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 rounded-md text-white text-xs font-semibold disabled:opacity-60 ${
                          landlord.paymongo_verification_bypass
                            ? 'bg-gray-600 hover:bg-gray-700'
                            : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                      >
                        {landlord.paymongo_verification_bypass ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
