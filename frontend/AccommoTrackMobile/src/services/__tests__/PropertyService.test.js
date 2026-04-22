import PropertyService from '../PropertyService.js';
import api from '../api.js';

jest.mock('../api.js', () => ({
  __esModule: true,
  normalizeResponse: jest.fn((res) => ({ success: true, data: res?.data?.data ?? res?.data ?? null, error: null })),
  normalizeError: jest.fn((err) => ({ success: false, data: null, error: err?.message || 'error' })),
  normalizePaginatedResponse: jest.fn(() => ({ items: [], pagination: {} })),
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// ---------- helpers to mirror AddProperty.jsx buildPayload() ----------

const BACKEND_REQUIRED_FIELDS = ['title', 'property_type', 'street_address', 'city', 'province'];
const BACKEND_BOOLEAN_FIELDS = [
  'is_draft', 'is_eligible',
  'require_1month_advance', 'allow_partial_payments',
  'force_wallet_refunds', 'require_reservation_fee',
];
const BACKEND_ACCEPTED_PAYMENTS_VALUES = ['cash', 'online'];

/**
 * Mirrors AddProperty.jsx initialForm
 */
const buildMinimalForm = (overrides = {}) => ({
  title: 'Test Property',
  propertyType: 'dormitory',
  otherType: '',
  sexRestriction: 'mixed',
  description: 'A test property',
  street: '123 Test Street',
  barangay: 'Barangay Test',
  city: 'Zamboanga City',
  province: 'Zamboanga Del Sur',
  postalCode: '7000',
  country: 'Philippines',
  latitude: 6.921,
  longitude: 122.079,
  nearbyLandmarks: '',
  totalRooms: '10',
  maxOccupants: '20',
  totalFloors: '2',
  floorLevel: ['1', '2'],
  amenities: ['WiFi', 'Air Conditioning'],
  rules: ['No smoking'],
  isEligible: false,
  acceptedPayments: ['cash'],
  require1MonthAdvance: false,
  allowPartialPayments: true,
  forceWalletRefunds: true,
  requireReservationFee: false,
  reservationFeeAmount: '',
  normalBookingLimit: '1',
  proxyBookingLimit: '3',
  minPartialPaymentPct: '20',
  ...overrides,
});

/**
 * Mirrors AddProperty.jsx buildPayload() exactly
 */
const buildPayloadLikeApp = (form, isDraft = false, selectedImages = [], selectedVideo = null, credentials = []) => {
  const payload = new FormData();
  const propertyType = form.propertyType === 'others' ? form.otherType : form.propertyType;
  const parsedTotalRooms = Number.parseInt(String(form.totalRooms || '').trim(), 10);
  const parsedMaxOccupants = Number.parseInt(String(form.maxOccupants || '').trim(), 10);
  const parsedTotalFloors = Number.parseInt(String(form.totalFloors || '').trim(), 10);

  const entries = {
    title: form.title.trim(),
    description: form.description.trim(),
    property_type: propertyType,
    sex_restriction: form.sexRestriction,
    current_status: isDraft ? 'draft' : 'pending',
    street_address: form.street.trim(),
    barangay: form.barangay.trim(),
    city: form.city.trim(),
    province: form.province.trim(),
    postal_code: form.postalCode.trim(),
    country: form.country.trim() || 'Philippines',
    latitude: form.latitude,
    longitude: form.longitude,
    nearby_landmarks: form.nearbyLandmarks.trim(),
    total_rooms: Number.isNaN(parsedTotalRooms) || parsedTotalRooms < 1 ? null : parsedTotalRooms,
    max_occupants: Number.isNaN(parsedMaxOccupants) || parsedMaxOccupants < 1 ? null : parsedMaxOccupants,
    total_floors: Number.isNaN(parsedTotalFloors) || parsedTotalFloors < 1 ? 1 : parsedTotalFloors,
    floor_level: form.floorLevel.length > 0 ? form.floorLevel.join(',') : '',
    property_rules: form.rules.length ? JSON.stringify(form.rules) : null,
    is_eligible: form.isEligible ? '1' : '0',
    is_draft: isDraft ? '1' : '0',
    require_1month_advance: form.require1MonthAdvance ? '1' : '0',
    allow_partial_payments: form.allowPartialPayments ? '1' : '0',
    force_wallet_refunds: form.forceWalletRefunds ? '1' : '0',
    require_reservation_fee: form.requireReservationFee ? '1' : '0',
    reservation_fee_amount: form.requireReservationFee ? (form.reservationFeeAmount || '0') : '0',
    normal_booking_limit: form.normalBookingLimit || '1',
    proxy_booking_limit: form.proxyBookingLimit || '3',
    min_partial_payment_pct: form.minPartialPaymentPct || '20',
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      payload.append(key, String(value));
    }
  });

  const methods = form.acceptedPayments.length ? form.acceptedPayments : ['cash'];
  methods.forEach((method, index) => {
    payload.append(`accepted_payments[${index}]`, method);
  });

  form.amenities.forEach((amenity, index) => {
    payload.append(`amenities[${index}]`, amenity);
  });

  selectedImages.forEach((image, index) => {
    payload.append(`images[${index}]`, { uri: image.uri, name: image.name, type: image.type });
  });

  if (selectedVideo) {
    payload.append('video', { uri: selectedVideo.uri, name: selectedVideo.name, type: selectedVideo.type });
  }

  credentials.forEach((file, index) => {
    payload.append(`credentials[${index}]`, { uri: file.uri, name: file.name, type: file.type });
  });

  return payload;
};

// ---------- extract FormData fields for assertions ----------
const getFormDataFields = (formData) => {
  const fields = {};
  // FormData in RN/Jest uses _parts array
  const parts = formData._parts || [];
  parts.forEach(([key, value]) => {
    if (fields[key] === undefined) {
      fields[key] = value;
    }
  });
  return fields;
};

describe('AddProperty – buildPayload() field validation', () => {
  it('✅ all required backend fields are present in payload', () => {
    const form = buildMinimalForm();
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    BACKEND_REQUIRED_FIELDS.forEach((field) => {
      expect(fields[field]).toBeDefined();
      expect(fields[field]).not.toBe('');
    });
  });

  it('✅ property_type is never "others" – resolved to otherType value', () => {
    const form = buildMinimalForm({ propertyType: 'others', otherType: 'Studio' });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    expect(fields['property_type']).toBe('Studio');
    expect(fields['property_type']).not.toBe('others');
  });

  it('❌ property_type is empty when propertyType=others and otherType is blank – causes 422', () => {
    const form = buildMinimalForm({ propertyType: 'others', otherType: '' });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    // The field will be missing because empty strings are filtered out by buildPayload
    expect(fields['property_type']).toBeUndefined();
  });

  it('✅ boolean fields are sent as "0" or "1" strings (not true/false)', () => {
    const form = buildMinimalForm({
      isEligible: true,
      require1MonthAdvance: true,
      allowPartialPayments: false,
      forceWalletRefunds: false,
      requireReservationFee: false,
    });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    expect(fields['is_eligible']).toBe('1');
    expect(fields['require_1month_advance']).toBe('1');
    expect(fields['allow_partial_payments']).toBe('0');
    expect(fields['force_wallet_refunds']).toBe('0');
    expect(fields['require_reservation_fee']).toBe('0');
  });

  it('✅ accepted_payments values are valid (cash/online only)', () => {
    const form = buildMinimalForm({ acceptedPayments: ['cash', 'online'] });
    const payload = buildPayloadLikeApp(form);
    const parts = payload._parts || [];
    const paymentValues = parts
      .filter(([k]) => k.startsWith('accepted_payments'))
      .map(([, v]) => v);

    paymentValues.forEach((val) => {
      expect(BACKEND_ACCEPTED_PAYMENTS_VALUES).toContain(val);
    });
  });

  it('✅ floor_level is comma-separated string (not an array)', () => {
    const form = buildMinimalForm({ floorLevel: ['1', '2', '3'], totalFloors: '3' });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    expect(fields['floor_level']).toBe('1,2,3');
    expect(typeof fields['floor_level']).toBe('string');
  });

  it('✅ property_rules is JSON-encoded string when rules exist', () => {
    const form = buildMinimalForm({ rules: ['No smoking', 'No pets'] });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    expect(typeof fields['property_rules']).toBe('string');
    const parsed = JSON.parse(fields['property_rules']);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toContain('No smoking');
  });

  it('✅ latitude and longitude are numeric-castable strings', () => {
    const form = buildMinimalForm({ latitude: 6.921, longitude: 122.079 });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    expect(Number.isNaN(parseFloat(fields['latitude']))).toBe(false);
    expect(Number.isNaN(parseFloat(fields['longitude']))).toBe(false);
  });

  it('❌ missing latitude / longitude when user skips map pin – causes 422 on strict backend configs', () => {
    const form = buildMinimalForm({ latitude: null, longitude: null });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    // null is filtered out, so the fields won't exist
    expect(fields['latitude']).toBeUndefined();
    expect(fields['longitude']).toBeUndefined();
  });

  it('✅ credential file objects have uri, name, and type', () => {
    const credentials = [
      { uri: 'file:///tmp/doc.pdf', name: 'doc.pdf', type: 'application/pdf' },
      { uri: 'file:///tmp/img.jpg', name: 'img.jpg', type: 'image/jpeg' },
    ];
    const form = buildMinimalForm();
    const payload = buildPayloadLikeApp(form, false, [], null, credentials);
    const parts = payload._parts || [];
    const credParts = parts.filter(([k]) => k.startsWith('credentials'));

    expect(credParts.length).toBe(2);
    credParts.forEach(([, fileObj]) => {
      expect(fileObj).toHaveProperty('uri');
      expect(fileObj).toHaveProperty('name');
      expect(fileObj).toHaveProperty('type');
    });
  });

  it('❌ credential file without extension in name – potential Android Network Error', () => {
    // React Native's FormData network layer can fail if name has no extension
    const credentials = [
      { uri: 'file:///tmp/document', name: 'document', type: 'application/pdf' },
    ];
    const form = buildMinimalForm();
    const payload = buildPayloadLikeApp(form, false, [], null, credentials);
    const parts = payload._parts || [];
    const credParts = parts.filter(([k]) => k.startsWith('credentials'));

    const fileObj = credParts[0]?.[1];
    const hasExtension = fileObj?.name?.includes('.');
    // This assertion FAILS to document the bug – name has no extension
    expect(hasExtension).toBe(false); // proves the problem
  });

  it('✅ credential file WITH extension – safe for Android upload', () => {
    const credentials = [
      { uri: 'file:///tmp/document.pdf', name: 'document.pdf', type: 'application/pdf' },
    ];
    const form = buildMinimalForm();
    const payload = buildPayloadLikeApp(form, false, [], null, credentials);
    const parts = payload._parts || [];
    const credParts = parts.filter(([k]) => k.startsWith('credentials'));

    const fileObj = credParts[0]?.[1];
    expect(fileObj?.name?.includes('.')).toBe(true);
  });

  it('✅ mobile-only fields (booking limits, partial %) are within backend-accepted ranges', () => {
    // Backend: normal_booking_limit: sometimes|integer|min:1|max:4
    //          proxy_booking_limit: sometimes|integer|min:1|max:4
    //          min_partial_payment_pct: sometimes|integer|min:1|max:100
    const form = buildMinimalForm({
      normalBookingLimit: '1',
      proxyBookingLimit: '3',
      minPartialPaymentPct: '20',
    });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    const normalLimit = parseInt(fields['normal_booking_limit'], 10);
    const proxyLimit = parseInt(fields['proxy_booking_limit'], 10);
    const minPct = parseInt(fields['min_partial_payment_pct'], 10);

    expect(normalLimit).toBeGreaterThanOrEqual(1);
    expect(normalLimit).toBeLessThanOrEqual(4);
    expect(proxyLimit).toBeGreaterThanOrEqual(1);
    expect(proxyLimit).toBeLessThanOrEqual(4);
    expect(minPct).toBeGreaterThanOrEqual(1);
    expect(minPct).toBeLessThanOrEqual(100);
  });

  it('❌ booking limit > 4 exceeds backend max – triggers 422 validation error', () => {
    const form = buildMinimalForm({ normalBookingLimit: '5', proxyBookingLimit: '5' });
    const payload = buildPayloadLikeApp(form);
    const fields = getFormDataFields(payload);

    // The app doesn't clamp before building the payload – it only validates in the UI onChangeText
    // but the clamping only prevents typing > 4 via UI, not initial state or programmatic changes
    expect(parseInt(fields['normal_booking_limit'], 10)).toBeGreaterThan(4); // proves the gap
  });
});

describe('PropertyService.createProperty()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('✅ sends POST /landlord/properties with multipart/form-data header', async () => {
    api.post.mockResolvedValue({ data: { data: { id: 1, title: 'Test' } } });

    const form = buildMinimalForm();
    const payload = buildPayloadLikeApp(form);

    await PropertyService.createProperty(payload);

    expect(api.post).toHaveBeenCalledWith(
      '/landlord/properties',
      payload,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }),
      })
    );
  });

  it('✅ handles 422 validation error from backend', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'Validation failed',
          errors: { property_type: ['The property type field is required.'] },
        },
      },
    });

    const form = buildMinimalForm({ propertyType: 'others', otherType: '' });
    const payload = buildPayloadLikeApp(form);
    const result = await PropertyService.createProperty(payload);

    expect(result.success).toBe(false);
  });

  it('✅ handles generic 500 server error gracefully', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 500,
        data: { message: 'Server Error' },
      },
    });

    const form = buildMinimalForm();
    const payload = buildPayloadLikeApp(form);
    const result = await PropertyService.createProperty(payload);

    expect(result.success).toBe(false);
  });
});
