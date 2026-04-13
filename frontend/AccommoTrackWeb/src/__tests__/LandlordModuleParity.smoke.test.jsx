import fs from 'fs';
import path from 'path';

const paymentsPath = path.resolve(__dirname, '../screens/Landlord/Payments.jsx');
const addPropertyPath = path.resolve(__dirname, '../screens/Landlord/AddProperty.jsx');
const dormProfileSettingsPath = path.resolve(
  __dirname,
  '../screens/Landlord/DormProfileSettings.jsx',
);
const propertySummaryPath = path.resolve(
  __dirname,
  '../screens/Landlord/PropertySummary.jsx',
);

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const expectSourceToContain = (source, fragments) => {
  fragments.forEach((fragment) => {
    expect(source).toContain(fragment);
  });
};

describe('Web landlord parity module smoke coverage', () => {
  it('keeps Payments drilldown hydration and cash-verification contracts', () => {
    const source = readSource(paymentsPath);

    expectSourceToContain(source, [
      'new URLSearchParams(location.search || "")',
      'params.get("filter")',
      'params.get("search")',
      'params.get("invoiceId")',
      'setPaymentFilter(filterParam)',
      'setSearchQuery(searchParam)',
      'pending_verification',
      'const handleVerifyCash = async (action) =>',
      'invoiceService.verifyCash(invoiceId, payload)',
      'Cash Verify',
    ]);
  });

  it('keeps AddProperty financial policy payload and PayMongo gate contracts', () => {
    const source = readSource(addPropertyPath);

    expectSourceToContain(source, [
      "require_1month_advance: formData.require1MonthAdvance ? '1' : '0'",
      "allow_partial_payments: formData.allowPartialPayments ? '1' : '0'",
      "require_reservation_fee: formData.requireReservationFee ? '1' : '0'",
      'reservation_fee_amount: formData.requireReservationFee ? formData.reservationFeeAmount : 0',
      'disabled={!user?.is_paymongo_ready}',
      'formData.requireReservationFee && (',
      'Require Instant Reservation Fee',
      'Reservation Fee Amount (₱)',
    ]);
  });

  it('keeps AddProperty staged verification submit messaging', () => {
    const source = readSource(addPropertyPath);

    expectSourceToContain(source, [
      "const LANDLORD_ACCESS_STATUSES = ['approved', 'partial_verified', 'pending_documents_review'];",
      'setVerificationStatus(status || null);',
      'Submit for approval and publishing unlock after partial verification or full approval.',
      'Complete partial verification to submit',
    ]);
  });

  it('keeps DormProfileSettings reservation/GCash/transfer payload contracts', () => {
    const source = readSource(dormProfileSettingsPath);

    expectSourceToContain(source, [
      'require_reservation_fee: parseBooleanFlag(data.require_reservation_fee, false)',
      'reservation_fee_gap_days:',
      "gcash_name: data.gcash_name || ''",
      "gcash_number: data.gcash_number || ''",
      'transfer_fee: data.transfer_fee || 0',
      'require_reservation_fee: dormData.require_reservation_fee ? 1 : 0',
      'gcash_name: dormData.require_reservation_fee ? dormData.gcash_name : ""',
      'gcash_number: dormData.require_reservation_fee ? dormData.gcash_number : ""',
      'transfer_fee: parseFloat(dormData.transfer_fee) || 0',
    ]);
  });

  it('keeps DormProfileSettings save-refresh persistence contract for financial settings', () => {
    const source = readSource(dormProfileSettingsPath);

    expectSourceToContain(source, [
      'toast.success("Property updated successfully!");',
      'setIsEditing(false);',
      'fetchPropertyDetails();',
      "reservation_fee_amount: data.reservation_fee_amount || ''",
      'transfer_fee: data.transfer_fee || 0',
      'reservation_fee_amount: dormData.require_reservation_fee ? dormData.reservation_fee_amount : 0',
      'transfer_fee: parseFloat(dormData.transfer_fee) || 0',
    ]);
  });

  it('keeps DormProfileSettings draft submit backend error surfacing', () => {
    const source = readSource(dormProfileSettingsPath);

    expectSourceToContain(source, [
      'const backendMessage = err?.response?.data?.message;',
      'const message = backendMessage || err.message || "Failed to submit draft";',
      'toast.error(message);',
    ]);
  });

  it('keeps PropertySummary payment activity drilldown to overdue payments', () => {
    const source = readSource(propertySummaryPath);

    expectSourceToContain(source, [
      "if (item.type === 'payment') navigate(`/payments?property_id=${propertyId}&status=overdue`);",
    ]);
  });
});
