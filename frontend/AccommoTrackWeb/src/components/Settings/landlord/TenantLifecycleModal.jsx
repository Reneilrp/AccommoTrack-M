import { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  X, CalendarClock, FileText, Send, Printer, Copy, ChevronRight,
  ChevronLeft, AlertTriangle, CheckCircle, Clock, Loader2, RotateCcw,
  XCircle, ShieldOff,
} from 'lucide-react';
import { showSuccess, showError } from '../../../utils/toast';
import landlordService from '../../../services/landlordService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const PRESET_REASONS = [
  'Non-payment of rent',
  'Violation of house rules',
  'End of lease contract',
  'Property redevelopment',
  'Owner personal use',
  'Custom reason…',
];

const STEP_LABELS = ['Schedule', 'Customize Notice', 'Preview & Send'];

// ─── Status Badge ──────────────────────────────────────────────────────────────
function EvictionStatusBadge({ eviction }) {
  if (!eviction) return null;
  const statusMap = {
    scheduled: { label: 'Scheduled Move-out', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
    finalized: { label: 'Eviction Finalized', cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
    cancelled: { label: 'Schedule Cancelled', cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
    reverted: { label: 'Eviction Reverted', cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
  };
  const s = statusMap[eviction.status] ?? statusMap['cancelled'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEP_LABELS.map((label, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              idx < step ? 'bg-emerald-600 border-emerald-600 text-white' :
              idx === step ? 'bg-white dark:bg-gray-800 border-emerald-500 text-emerald-600 dark:text-emerald-400' :
              'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
            }`}>
              {idx < step ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            <span className={`text-[10px] font-semibold whitespace-nowrap ${
              idx === step ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{label}</span>
          </div>
          {idx < STEP_LABELS.length - 1 && (
            <div className={`w-10 h-0.5 mb-4 rounded-full transition-all ${
              idx < step ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Print Stylesheet ──────────────────────────────────────────────────────────
const PRINT_STYLE = `
  @media print {
    body > *:not(#lifecycle-notice-printable) { display: none !important; }
    #lifecycle-notice-printable { display: block !important; }
    .no-print { display: none !important; }
  }
`;

// ─── Main Modal ────────────────────────────────────────────────────────────────
export default function TenantLifecycleModal({
  tenant,
  onClose,
  onScheduled,
  onCancelled,
  onFinalized,
  onUndone,
}) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Schedule form state
  const [reasonChoice, setReasonChoice] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [moveOutDate, setMoveOutDate] = useState('');
  const [gracePeriodPreset, setGracePeriodPreset] = useState('');

  // Step 1: Notice template
  const [noticeBody, setNoticeBody] = useState('');
  const [sendBroadcast, setSendBroadcast] = useState(true);

  // Eviction state from existing data derived from tenant prop
  const hasPendingEviction = Boolean(tenant?.pending_eviction);
  const canUndoEviction = Boolean(tenant?.can_undo_eviction);
  const pendingEviction = tenant?.pending_eviction ?? null;

  const isEvictionDue = (() => {
    const scheduledFor = pendingEviction?.scheduled_for;
    if (!scheduledFor) return false;
    return new Date(scheduledFor).getTime() <= Date.now();
  })();

  const printRef = useRef(null);

  const effectiveReason = reasonChoice === 'Custom reason…' ? customReason : reasonChoice;

  // Load notice preview when entering step 1
  const loadNoticePreview = useCallback(async () => {
    setNoticeLoading(true);
    try {
      const res = await landlordService.getEvictionNotice(tenant.id);
      if (res.success) {
        setNoticeBody(res.data.notice_body || '');
      } else {
        showError(res.error || 'Failed to load notice template.');
      }
    } catch {
      showError('Failed to load notice template.');
    } finally {
      setNoticeLoading(false);
    }
  }, [tenant.id]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step === 0) {
      if (!effectiveReason.trim()) {
        showError('Please provide a reason for the notice.');
        return;
      }
      if (!moveOutDate && !gracePeriodPreset) {
        showError('Please set a move-out date or select a grace period.');
        return;
      }
      await loadNoticePreview();
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleScheduleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        reason: effectiveReason.trim(),
        send_broadcast: sendBroadcast,
        notice_body: sendBroadcast ? noticeBody : undefined,
      };

      if (moveOutDate) {
        payload.effective_at = moveOutDate;
      } else if (gracePeriodPreset) {
        payload.grace_hours = Number(gracePeriodPreset);
      }

      const res = await landlordService.scheduleEviction(tenant.id, payload);
      if (!res.success) {
        throw new Error(res.error || 'Failed to schedule eviction.');
      }
      showSuccess(`Eviction scheduled for ${tenant.first_name}.${sendBroadcast ? ' Notice sent to tenant.' : ''}`);
      onScheduled?.();
      onClose();
    } catch (err) {
      showError(err.message || 'Failed to schedule eviction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEviction = async () => {
    if (!window.confirm(`Cancel the pending eviction schedule for ${tenant.first_name}?`)) return;
    setLoading(true);
    try {
      const res = await landlordService.cancelEviction(tenant.id);
      if (!res.success) throw new Error(res.error || 'Failed to cancel.');
      showSuccess('Eviction schedule cancelled.');
      onCancelled?.();
      onClose();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeEviction = async () => {
    if (!window.confirm(`Finalize the eviction for ${tenant.first_name} ${tenant.last_name}? This cannot be undone immediately.`)) return;
    setLoading(true);
    try {
      const res = await landlordService.finalizeEviction(tenant.id);
      if (!res.success) throw new Error(res.error || 'Failed to finalize.');
      showSuccess('Eviction finalized.');
      onFinalized?.();
      onClose();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoEviction = async () => {
    const note = window.prompt('Optional note for undoing this eviction:', '') ?? '';
    setLoading(true);
    try {
      const res = await landlordService.undoEviction(tenant.id, { reason: note.trim() || undefined });
      if (!res.success) throw new Error(res.error || 'Failed to undo.');
      showSuccess('Eviction undone. Tenant restored.');
      onUndone?.();
      onClose();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const style = document.createElement('style');
    style.innerHTML = PRINT_STYLE;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 1000);
  };

  const handleCopyNotice = async () => {
    try {
      await navigator.clipboard.writeText(noticeBody);
      showSuccess('Notice copied to clipboard.');
    } catch {
      showError('Unable to copy notice automatically.');
    }
  };

  // ── Existing eviction management panel (shown when eviction already scheduled) ─
  const renderManagePanel = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">Active Eviction Schedule</p>
          <EvictionStatusBadge eviction={pendingEviction} />
          {pendingEviction?.scheduled_for && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Move-out on:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200 ml-1">
                {new Date(pendingEviction.scheduled_for).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </span>
            </p>
          )}
          {pendingEviction?.reason && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span className="font-semibold">Reason:</span> {pendingEviction.reason}
            </p>
          )}
        </div>
      </div>

      {/* Notice preview for existing schedule */}
      <button
        onClick={async () => { await loadNoticePreview(); setStep(2); }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm text-gray-700 dark:text-gray-300 font-medium"
      >
        <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> View Notice to Vacate</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>

      {/* Finalize */}
      <button
        onClick={handleFinalizeEviction}
        disabled={!isEvictionDue || loading}
        title={!isEvictionDue ? 'Grace period has not passed yet.' : undefined}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white text-sm font-bold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
        Finalize Eviction Now
      </button>
      {!isEvictionDue && pendingEviction?.scheduled_for && (
        <p className="text-center text-[11px] text-amber-600 dark:text-amber-400">
          Finalization available after {new Date(pendingEviction.scheduled_for).toLocaleString()}
        </p>
      )}

      {/* Cancel schedule */}
      <button
        onClick={handleCancelEviction}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm text-gray-600 dark:text-gray-400 font-semibold"
      >
        <XCircle className="w-4 h-4 text-amber-500" /> Cancel Schedule
      </button>
    </div>
  );

  // ── Step 0: Schedule Form ──────────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-5">
      {/* Reason */}
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Reason for Notice
        </label>
        <select
          value={reasonChoice}
          onChange={(e) => setReasonChoice(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {PRESET_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {reasonChoice === 'Custom reason…' && (
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Describe the reason for the eviction notice…"
            rows={3}
            className="mt-2 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          />
        )}
      </div>

      {/* Date selection */}
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Move-out Date
        </label>
        <input
          type="date"
          value={moveOutDate}
          min={getTomorrowDateString()}
          onChange={(e) => { setMoveOutDate(e.target.value); setGracePeriodPreset(''); }}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">— or use a grace period preset —</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[['24 hrs', '24'], ['7 days', '168'], ['30 days', '720']].map(([label, val]) => (
            <button
              key={val}
              type="button"
              onClick={() => { setGracePeriodPreset(val); setMoveOutDate(''); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                gracePeriodPreset === val
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="flex gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          The tenant will retain their room assignment until the eviction is <strong>finalized</strong>. You can cancel the schedule at any time before that.
        </p>
      </div>
    </div>
  );

  // ── Step 1: Customize Notice ───────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      {noticeLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-3 text-sm text-gray-500">Generating template…</span>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Notice Body <span className="text-gray-400 normal-case font-normal">(editable)</span>
            </label>
            <textarea
              value={noticeBody}
              onChange={(e) => setNoticeBody(e.target.value)}
              rows={14}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-y leading-relaxed"
            />
          </div>

          {/* Broadcast toggle */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer select-none w-full">
              <div
                onClick={() => setSendBroadcast((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${sendBroadcast ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sendBroadcast ? 'translate-x-5' : ''}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Send as In-App Message
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                  Tenant will receive this notice via the AccommoTrack mobile app.
                </p>
              </div>
            </label>
          </div>
        </>
      )}
    </div>
  );

  // ── Step 2: Preview & Print ───────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-4">
      {noticeLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {/* Document preview */}
          <div
            id="lifecycle-notice-printable"
            ref={printRef}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-h-72 overflow-y-auto"
          >
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-800 dark:text-gray-200">
              {noticeBody || 'No notice content generated.'}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Notice
            </button>
            <button
              onClick={handleCopyNotice}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy Text
            </button>
          </div>

          {/* Broadcast reminder */}
          {sendBroadcast && (
            <div className="flex gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <Send className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                This notice will be sent to <strong>{tenant.first_name}</strong>'s mobile app when you confirm.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ─── Modal Shell ─────────────────────────────────────────────────────────────
  const tenantName = `${tenant.first_name} ${tenant.last_name}`;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Tenant Lifecycle Manager</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tenantName} &middot; {tenant.room?.room_number ?? 'No Room'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* If there's already a pending eviction, show management panel */}
          {hasPendingEviction && step === 0 ? (
            renderManagePanel()
          ) : (
            <>
              {/* Only show stepper if not in "view notice" mode from management panel */}
              {!hasPendingEviction && <StepIndicator step={step} />}
              {step === 0 && renderStep0()}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
            </>
          )}

          {/* Undo eviction option - shown at bottom when applicable regardless of step */}
          {canUndoEviction && !hasPendingEviction && step === 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Recent Eviction</p>
              <button
                onClick={handleUndoEviction}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Undo Last Eviction (24h window)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-100 dark:border-gray-700 shrink-0">
          {/* Left: Back */}
          {step > 0 && !hasPendingEviction ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {/* Right: Primary action */}
          {hasPendingEviction && step === 0 ? (
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Done
            </button>
          ) : step < 2 ? (
            <button
              onClick={handleNext}
              disabled={noticeLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleScheduleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm &amp; Schedule
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
