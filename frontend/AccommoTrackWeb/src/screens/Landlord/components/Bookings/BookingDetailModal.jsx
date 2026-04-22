import React, { memo } from 'react';
import { X, Users, UserPlus } from 'lucide-react';
import DepositSettlementSection from './DepositSettlementSection';
import ActionButtons from './ActionButtons';

const BookingDetailModal = ({ 
  isOpen, 
  onClose, 
  booking, 
  onConvert, 
  onSettle, 
  submittingSettle,
  settlementForm,
  onSettlementInputChange,
  settlementHistory,
  loadingSettlementHistory,
  canApprove,
  canCancel,
  onUpdateStatus,
  onUpdatePayment,
  onOpenCancelModal,
  onCheckIn,
  formatDate,
  getBookingModeLabel,
  resolveBedCount,
  getOccupancySummary,
  getPaymentColor
}) => {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Booking Details</h2>
          <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Stay Dates */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-2">
                {booking.contract_mode === 'daily' ? 'Check-In' : 'Move-In'}
              </p>
              <p className="font-bold text-lg text-gray-900 dark:text-white">{formatDate(booking.checkIn)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold text-right tracking-wider mb-2">
                {booking.contract_mode === 'daily' ? 'Check-Out' : (booking.checkOut ? 'Move-Out' : 'Planned Move-Out')}
              </p>
              <p className="font-bold text-lg text-right text-gray-900 dark:text-white">{formatDate(booking.checkOut) || 'Open-ended'}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Guest Name</p>
              <p className="font-semibold text-gray-900 dark:text-white text-lg">{booking.guestName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Information</p>
              <p className="font-semibold text-gray-900 dark:text-white">{booking.phone || booking.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property</p>
              <p className="font-semibold text-gray-900 dark:text-white">{booking.propertyTitle}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Room Details</p>
              <p className="font-semibold text-gray-900 dark:text-white">Room {booking.roomNumber} ({booking.roomType})</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Booking Mode</p>
              <p className="font-semibold text-gray-900 dark:text-white">{getBookingModeLabel(booking)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Beds Booked</p>
              <p className="font-semibold text-gray-900 dark:text-white">{resolveBedCount(booking)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Occupancy</p>
              <p className="font-semibold text-gray-900 dark:text-white">{getOccupancySummary(booking)}</p>
            </div>
          </div>

          {/* Proxy Occupants */}
          {(getBookingModeLabel(booking) === 'Proxy' || Array.isArray(booking.occupants)) && (
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Proxy Occupants</p>
              </div>
              {Array.isArray(booking.occupants) && booking.occupants.length > 0 ? (
                <div className="space-y-3">
                  {booking.occupants.map((occupant, index) => {
                    const fullName = [occupant.first_name, occupant.middle_name, occupant.last_name].filter(Boolean).join(' ').trim() || `Occupant ${index + 1}`;
                    return (
                      <div key={occupant.id || `${fullName}-${index}`} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/70 dark:bg-gray-700/40">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{fullName}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                              {occupant.relationship_to_booker || 'Relationship not provided'} · {occupant.sex || 'Sex not provided'}
                            </p>
                            {(occupant.phone || occupant.email) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {[occupant.phone, occupant.email].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          {!occupant.user_id && (
                            <button
                              onClick={() => onConvert(occupant)}
                              className="shrink-0 p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                              title="Register as Tenant"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  No occupant profiles are attached yet for this proxy booking.
                </p>
              )}
            </div>
          )}

          {/* Reservation Details */}
          {(booking.receipt_image_path || booking.reference_number || booking.move_in_date) && (
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Reservation Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {booking.move_in_date && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Move-in Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatDate(booking.move_in_date)}</p>
                  </div>
                )}
                {booking.reference_number && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Ref Number</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{booking.reference_number}</p>
                  </div>
                )}
              </div>
              {booking.receipt_image_path && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Receipt</p>
                  <img 
                    src={booking.receipt_image_path} 
                    alt="Receipt" 
                    className="max-h-64 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => window.open(booking.receipt_image_path, '_blank')} 
                  />
                  <p className="text-xs text-gray-500 mt-1">Click image to enlarge</p>
                </div>
              )}
            </div>
          )}

          {/* Total Amount */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Amount</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">₱{booking.amount.toLocaleString()}</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPaymentColor(booking.paymentStatus)}`}>
                {booking.paymentStatus}
              </span>
            </div>
          </div>

          {/* Deposit Settlement */}
          <DepositSettlementSection 
            booking={booking}
            form={settlementForm}
            onInputChange={onSettlementInputChange}
            onSettle={onSettle}
            submitting={submittingSettle}
            history={settlementHistory}
            loadingHistory={loadingSettlementHistory}
            canApprove={canApprove}
            formatDate={formatDate}
          />

          {/* Action Buttons Section */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
            <ActionButtons 
              booking={booking}
              canApprove={canApprove}
              canCancel={canCancel}
              onUpdateStatus={onUpdateStatus}
              onUpdatePayment={onUpdatePayment}
              onOpenCancelModal={onOpenCancelModal}
              onCheckIn={onCheckIn}
            />
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 dark:bg-gray-700/30 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(BookingDetailModal);