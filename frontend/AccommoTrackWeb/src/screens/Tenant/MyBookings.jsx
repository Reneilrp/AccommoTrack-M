import React, { useState, useCallback, memo } from 'react';
import {
  useTenantStayBundle,
  useTenantHistory,
  useTenantTransfers
} from '../../hooks/useTenantQueries';
import { tenantService } from '../../services/tenantService';
import { SkeletonMyBookings, SkeletonHistory } from '../../components/Shared/Skeleton';
import { useUIState } from "../../contexts/UIStateContext";
import { showSuccess, showError } from '../../utils/toast';
import { RefreshCw } from 'lucide-react';

import ActiveStayDetail from './components/Bookings/ActiveStayDetail';
import StayHistoryList from './components/Bookings/StayHistoryList';
import FinancialSummary from './components/Bookings/FinancialSummary';
import TransferModal from './components/Bookings/TransferModal';
import MoveOutModal from './components/Bookings/MoveOutModal';
import ExtensionModal from './components/Bookings/ExtensionModal';

const MyBookings = () => {
  const { uiState, updateScreenState } = useUIState();
  const activeTab = uiState.bookings?.activeTab || 'current';

  // --- Queries ---
  const stayBundleQuery = useTenantStayBundle();
  const transferQuery = useTenantTransfers();
  const [historyPage, setHistoryPage] = useState(1);
  const historyQuery = useTenantHistory(historyPage);

  const { data: bundleData, isLoading: bundleLoading, refetch: refetchBundle } = stayBundleQuery;
  const { data: _transfersData, isLoading: transfersLoading, refetch: refetchTransfers } = transferQuery;
  const { data: historyData, isFetching: historyFetching } = historyQuery;

  const cachedData = uiState.data?.bookings;

  // --- Derived Data ---
  const activeStays = bundleData?.stays || cachedData?.activeStays || [];
  const [selectedStayIndex, setSelectedStayIndex] = useState(0);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    await Promise.all([refetchBundle(), refetchTransfers()]);
  }, [refetchBundle, refetchTransfers]);

  const handleAction = async (type, payload) => {
    setProcessing(true);
    let res;
    if (type === 'transfer') res = await tenantService.requestTransfer(payload);
    if (type === 'move_out') res = await tenantService.requestMoveOut(payload.booking_id, payload.move_out_date, payload.reason);
    if (type === 'extension') res = await tenantService.requestExtension(payload.booking_id, payload);

    if (res?.success) {
      showSuccess('Request submitted successfully');
      fetchData();
      setShowTransferModal(false);
      setShowMoveOutModal(false);
      setShowExtensionModal(false);
    } else {
      showError(res?.error || 'Operation failed');
    }
    setProcessing(false);
  };

  const handleLoadMoreHistory = () => setHistoryPage(prev => prev + 1);

  if ((bundleLoading || transfersLoading) && !cachedData) return <SkeletonMyBookings />;

  const currentStay = activeStays[selectedStayIndex];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">My Bookings</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage your active residence and history.</p>
        </div>
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
          <button
            onClick={() => updateScreenState('bookings', { activeTab: 'current' })}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'current' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-lg shadow-green-500/10' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active Stay
          </button>
          <button
            onClick={() => updateScreenState('bookings', { activeTab: 'history' })}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-lg shadow-green-500/10' : 'text-gray-500 hover:text-gray-700'}`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'current' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {currentStay ? (
              <ActiveStayDetail
                stay={currentStay}
                onTransfer={() => setShowTransferModal(true)}
                onMoveOut={() => setShowMoveOutModal(true)}
                onExtend={() => setShowExtensionModal(true)}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-20 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                <p className="text-gray-500 font-black uppercase tracking-[0.2em]">No active stays found.</p>
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <FinancialSummary stay={currentStay} />
            {activeStays.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Switch Stay</h3>
                <div className="space-y-2">
                  {activeStays.map((s, i) => (
                    <button
                      key={s.booking.id}
                      onClick={() => setSelectedStayIndex(i)}
                      className={`w-full p-4 rounded-2xl text-left text-sm font-bold border-2 transition-all ${selectedStayIndex === i ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                    >
                      {s.property.title} · Room {s.room.room_number}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <StayHistoryList
          history={historyData}
          onLoadMore={handleLoadMoreHistory}
          loading={historyFetching}
        />
      )}

      {showTransferModal && currentStay && (
        <TransferModal
          booking={currentStay.booking}
          onClose={() => setShowTransferModal(false)}
          onSubmit={(p) => handleAction('transfer', p)}
          isSubmitting={processing}
        />
      )}
      {showMoveOutModal && currentStay && (
        <MoveOutModal
          booking={currentStay.booking}
          onClose={() => setShowMoveOutModal(false)}
          onSubmit={(p) => handleAction('move_out', p)}
          isSubmitting={processing}
        />
      )}
      {showExtensionModal && currentStay && (
        <ExtensionModal
          booking={currentStay.booking}
          onClose={() => setShowExtensionModal(false)}
          onSubmit={(p) => handleAction('extension', p)}
          isSubmitting={processing}
        />
      )}
    </div>
  );
};

export default memo(MyBookings);