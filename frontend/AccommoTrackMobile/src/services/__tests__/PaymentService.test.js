import PaymentService from '../PaymentService.js';
import api from '../api.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../api.js', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('PaymentService (mobile)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  it('getPayments uses status query when filter is not all', async () => {
    api.get.mockResolvedValue({ data: [{ id: 1 }] });

    const result = await PaymentService.getPayments('pending');

    expect(api.get).toHaveBeenCalledWith('/tenant/payments?status=pending');
    expect(result).toEqual({ success: true, data: [{ id: 1 }] });
  });

  it('createPaymongoSource includes optional return_url and amount', async () => {
    api.post.mockResolvedValue({ data: { checkout_url: 'https://example.test/pay' } });

    const result = await PaymentService.createPaymongoSource(
      77,
      'gcash',
      'https://app.example.test/return',
      3500,
    );

    expect(api.post).toHaveBeenCalledWith('/tenant/invoices/77/paymongo-source', {
      method: 'gcash',
      return_url: 'https://app.example.test/return',
      amount: 3500,
    });
    expect(result).toEqual({
      success: true,
      data: { checkout_url: 'https://example.test/pay' },
    });
  });

  it('createPaymongoSource returns server error details when provided', async () => {
    api.post.mockRejectedValue({
      response: {
        data: { error: 'Gateway is temporarily unavailable' },
      },
    });

    const result = await PaymentService.createPaymongoSource(99);

    expect(result).toEqual({
      success: false,
      error: 'Gateway is temporarily unavailable',
      raw: { error: 'Gateway is temporarily unavailable' },
    });
  });

  it('recordLandlordPayment stamps payload with current ISO timestamp', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-01T09:30:00.000Z'));
    api.post.mockResolvedValue({ data: { recorded: true } });

    const result = await PaymentService.recordLandlordPayment(12, {
      amount_cents: 5000,
      method: 'cash',
      reference: 'OR-1001',
      notes: 'Paid at desk',
    });

    expect(api.post).toHaveBeenCalledWith('/invoices/12/record', {
      amount_cents: 5000,
      method: 'cash',
      reference: 'OR-1001',
      notes: 'Paid at desk',
      received_at: '2026-04-01T09:30:00.000Z',
    });
    expect(result).toEqual({ success: true, data: { recorded: true } });
  });

  it('getAuthToken prefers user.token then falls back to token key', async () => {
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === 'user') return JSON.stringify({ token: 'user-token-abc' });
      if (key === 'token') return 'legacy-token';
      return null;
    });

    const first = await PaymentService.getAuthToken();
    expect(first).toBe('user-token-abc');

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === 'user') return null;
      if (key === 'token') return 'legacy-token';
      return null;
    });

    const second = await PaymentService.getAuthToken();
    expect(second).toBe('legacy-token');
  });

  it('getInvoiceSummary sends params and unwraps envelope payload', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          range: 'all',
          totals: {
            total_paid_cents: 50000,
          },
        },
        message: '',
      },
    });

    const result = await PaymentService.getInvoiceSummary({ range: 'all' });

    expect(api.get).toHaveBeenCalledWith('/invoices/summary', {
      params: { range: 'all' },
    });
    expect(result).toEqual({
      success: true,
      data: {
        range: 'all',
        totals: {
          total_paid_cents: 50000,
        },
      },
      message: '',
      error: null,
    });
  });
});
