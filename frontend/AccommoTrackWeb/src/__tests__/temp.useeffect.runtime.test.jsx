import React from 'react';
import { render, waitFor } from '@testing-library/react';
jest.mock('../screens/Landlord/AddProperty', () => () => <div>AddProperty</div>);
jest.mock('swiper/css', () => ({}), { virtual: true });
jest.mock('swiper/css/navigation', () => ({}), { virtual: true });
jest.mock('swiper/css/pagination', () => ({}), { virtual: true });
import MyProperties from '../screens/Landlord/MyProperties';
import PropertySummary from '../screens/Landlord/PropertySummary';
import api from '../utils/api';

const mockNavigate = jest.fn();
const mockUpdateData = jest.fn();
const mockSidebar = {
    collapse: jest.fn(() => Promise.resolve()),
    open: jest.fn(() => Promise.resolve()),
    setIsSidebarOpen: jest.fn(),
    _setIsSidebarOpen: jest.fn(),
    _open: jest.fn(),
};

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

jest.mock('../contexts/SidebarContext', () => ({
    useSidebar: () => mockSidebar,
}));

const cacheStore = {};
jest.mock('../utils/cache', () => ({
    cacheManager: {
        get: jest.fn((key) => cacheStore[key] ?? null),
        set: jest.fn((key, value) => {
            cacheStore[key] = value;
        }),
    },
}));

jest.mock('../contexts/UIStateContext', () => ({
    useUIState: () => ({
        uiState: { data: {} },
        updateData: mockUpdateData,
    }),
}));

jest.mock('../utils/toast', () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showLoading: jest.fn(() => 'toast-id'),
}));

jest.mock('../utils/api', () => ({
    __esModule: true,
    getImageUrl: (value) => value,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('../services/maintenanceService', () => ({
    maintenanceService: {
        updateStatus: jest.fn(() => Promise.resolve({ success: true, data: {} })),
        completeRequest: jest.fn(() => Promise.resolve({ success: true, data: {} })),
        assignWorker: jest.fn(() => Promise.resolve({ success: true, data: {} })),
    },
}));

jest.mock('../components/Maintenance/AssignWorkerModal', () => () => <div>AssignWorkerModal</div>);
jest.mock('../components/Rooms/RoomDetails', () => () => <div>RoomDetails</div>);
jest.mock('../screens/Landlord/PropertyActivityLogs', () => () => <div>PropertyActivityLogs</div>);

jest.mock('swiper/react', () => ({
    Swiper: ({ children }) => <div>{children}</div>,
    SwiperSlide: ({ children }) => <div>{children}</div>,
}));

jest.mock('swiper/modules', () => ({
    Navigation: {},
    Pagination: {},
    Autoplay: {},
    Keyboard: {},
    A11y: {},
}));

const propertyPayload = {
    id: 1,
    title: 'Sample Property',
    street_address: 'Sample Street',
    current_status: 'active',
    total_rooms: 2,
    images: [],
    amenities: [],
    property_rules: [],
};

const setupApi = () => {
    api.get.mockImplementation((url) => {
        if (url === '/landlord/properties') {
            return Promise.resolve({ data: { data: [propertyPayload] } });
        }

        if (url === '/landlord/my-verification') {
            return Promise.resolve({ data: { status: 'approved', user: { is_verified: true } } });
        }

        if (url.startsWith('/landlord/properties/1?t=')) {
            return Promise.resolve({ data: propertyPayload });
        }

        if (url === '/landlord/properties/1/addons/pending') {
            return Promise.resolve({ data: { pendingRequests: [] } });
        }

        if (url === '/landlord/maintenance-requests?property_id=1&status=pending') {
            return Promise.resolve({ data: { data: [] } });
        }

        if (url === '/landlord/transfers?property_id=1&status=pending') {
            return Promise.resolve({ data: { data: [] } });
        }

        if (url === '/bookings?property_id=1&status=pending') {
            return Promise.resolve({ data: { data: [] } });
        }

        if (url === '/invoices?property_id=1&status=overdue') {
            return Promise.resolve({ data: { data: [] } });
        }

        if (url === '/landlord/reviews?property_id=1&limit=3') {
            return Promise.resolve({ data: { data: [] } });
        }

        if (url === '/rooms/property/1') {
            return Promise.resolve({ data: { data: [] } });
        }

        return Promise.resolve({ data: { data: [] } });
    });
};

describe('Landlord top-level useEffect runtime guards', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(cacheStore).forEach((key) => delete cacheStore[key]);
        setupApi();
    });

    it('renders MyProperties without ReferenceError and without fetch loop', async () => {
        render(<MyProperties user={{ id: 7, role: 'landlord' }} />);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/landlord/properties');
            expect(api.get).toHaveBeenCalledWith('/landlord/my-verification');
        });

        const propertyFetchCalls = api.get.mock.calls.filter(([url]) => url === '/landlord/properties').length;
        const verificationCalls = api.get.mock.calls.filter(([url]) => url === '/landlord/my-verification').length;

        expect(propertyFetchCalls).toBe(1);
        expect(verificationCalls).toBe(1);
    });

    it('renders PropertySummary without ReferenceError and without property refetch loop', async () => {
        render(<PropertySummary />);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/landlord\/properties\/1\?t=/));
        });

        const propertyDetailCalls = api.get.mock.calls.filter(([url]) => /\/landlord\/properties\/1\?t=/.test(url)).length;
        expect(propertyDetailCalls).toBe(1);
    });
});
