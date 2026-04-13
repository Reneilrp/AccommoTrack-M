const createMockAxiosInstance = () => {
  const requestHandlers = [];
  const responseHandlers = [];

  const instance = {
    defaults: { headers: { common: {} } },
    interceptors: {
      request: {
        use: jest.fn((fulfilled, rejected) => {
          requestHandlers.push({ fulfilled, rejected });
          return requestHandlers.length - 1;
        }),
      },
      response: {
        use: jest.fn((fulfilled, rejected) => {
          responseHandlers.push({ fulfilled, rejected });
          return responseHandlers.length - 1;
        }),
      },
    },
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    __requestHandlers: requestHandlers,
    __responseHandlers: responseHandlers,
  };

  return instance;
};

jest.mock('axios', () => {
  const instances = [];
  const create = jest.fn(() => {
    const instance = createMockAxiosInstance();
    instances.push(instance);
    return instance;
  });

  return {
    __esModule: true,
    default: {
      create,
      isCancel: jest.fn(() => false),
      __instances: instances,
    },
  };
});

describe('web api refresh interceptor', () => {
  let apiInstance;
  let responseRejected;

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();

    process.env.VITE_APP_URL = 'http://localhost:8000';
    process.env.VITE_API_BASE_URL = 'http://localhost:8000/api';
    process.env.VITE_WEB_USE_BEARER_AUTH = 'true';

    const axios = require('axios').default;
    axios.create.mockClear();

    // Loading the module registers interceptors on mocked axios instances.
    require('../api');

    const createdInstances = axios.create.mock.results.map((entry) => entry.value);
    apiInstance = createdInstances[0];
    responseRejected = apiInstance.__responseHandlers[0].rejected;
  });

  afterEach(() => {
    delete process.env.VITE_APP_URL;
    delete process.env.VITE_API_BASE_URL;
    delete process.env.VITE_WEB_USE_BEARER_AUTH;
  });

  it('refreshes token and retries the original request once on 401', async () => {
    localStorage.setItem('authMode', 'token');
    localStorage.setItem('authToken', 'expired-access-token');
    localStorage.setItem('refreshToken', 'valid-refresh-token');
    localStorage.setItem('userData', JSON.stringify({ id: 11 }));

    apiInstance.post.mockResolvedValue({
      data: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: '2026-04-09T00:00:00.000Z',
      },
    });

    const retriedResponse = { data: { ok: true } };
    apiInstance.request.mockResolvedValue(retriedResponse);

    const error = {
      response: { status: 401, data: { message: 'Unauthenticated.' } },
      config: { url: '/me', method: 'get', headers: {} },
    };

    const result = await responseRejected(error);

    expect(apiInstance.post).toHaveBeenCalledWith(
      '/refresh-token',
      { refresh_token: 'valid-refresh-token' },
      expect.objectContaining({
        _skipAuthRefresh: true,
      }),
    );

    expect(apiInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        _retryAfterRefresh: true,
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access-token',
        }),
      }),
    );

    expect(localStorage.getItem('authToken')).toBe('new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    expect(result).toBe(retriedResponse);
  });

  it('clears auth storage and dispatches refresh failure events when refresh fails', async () => {
    localStorage.setItem('authMode', 'token');
    localStorage.setItem('authToken', 'expired-access-token');
    localStorage.setItem('refreshToken', 'stale-refresh-token');
    localStorage.setItem('userData', JSON.stringify({ id: 11 }));

    apiInstance.post.mockRejectedValue(new Error('refresh failed'));

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    const error = {
      response: { status: 401, data: { message: 'Unauthenticated.' } },
      config: { url: '/me', method: 'get', headers: {} },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    const dispatchedEventTypes = dispatchSpy.mock.calls.map(([event]) => event.type);
    expect(dispatchedEventTypes).toContain('auth:refresh-failed');
    expect(dispatchedEventTypes).toContain('auth:unauthorized');

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('userData')).toBeNull();

    dispatchSpy.mockRestore();
  });
});
