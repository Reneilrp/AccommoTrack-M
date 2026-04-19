import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { showSuccess } from '../../../utils/toast';
import api from '../../../utils/api';
import Settings from '../Settings';

const mockNavigate = jest.fn();
const mockSetSearchParams = jest.fn();
const mockUpdateData = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

jest.mock('../../../utils/toast', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../contexts/UIStateContext', () => ({
  useUIState: () => ({
    uiState: { data: {} },
    updateData: mockUpdateData,
  }),
}));

jest.mock('../../../components/Settings/landlord/MyProfile', () => () => <div>Profile Tab</div>);
jest.mock('../../../components/Settings/landlord/Notifications', () => () => <div>Notifications Tab</div>);
jest.mock('../../../components/Settings/landlord/Security', () => () => <div>Security Tab</div>);
jest.mock('../../../components/Settings/landlord/PaymentMethods', () => () => <div>Payment Tab</div>);
jest.mock('../../../components/Settings/landlord/SubscriptionPlan', () => () => <div>Subscription Plan Tab</div>);
jest.mock('../../../components/Settings/landlord/BillingCenter', () => () => <div>Billing Center Tab</div>);
jest.mock('../../../components/Settings/AppearanceTab', () => () => <div>Appearance Tab</div>);
jest.mock('../../../components/Settings/SwitchRoleTab', () => () => <div>Switch Role Tab</div>);
jest.mock('../VerificationStatus', () => () => <div>Verification Tab</div>);

const createUser = () => ({
  role: 'landlord',
  preferences: {},
  first_name: 'Lara',
  last_name: 'Owner',
  email: 'lara@example.com',
});

const setupCaretakerApiMocks = () => {
  api.get.mockImplementation((url) => {
    if (url === '/landlord/caretakers') {
      return Promise.resolve({
        data: {
          caretakers: [],
          landlord_properties: [{ id: 1, name: 'Dorm One' }],
        },
      });
    }

    if (url === '/landlord/properties') {
      return Promise.resolve({ data: { data: [{ id: 1, name: 'Dorm One' }] } });
    }

    return Promise.resolve({ data: {} });
  });

  api.post.mockResolvedValue({ data: { success: true } });
  api.put.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
};

const openCaretakerTab = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Caretaker Management/i }));
  await screen.findByRole('button', { name: /Add CareTaker/i });
  fireEvent.click(screen.getByRole('button', { name: /Add CareTaker/i }));
  await screen.findByRole('heading', { name: /Add New Caretaker/i });
};

const fillRequiredCaretakerFields = () => {
  fireEvent.change(screen.getByPlaceholderText('e.g. John'), {
    target: { value: 'John' },
  });
  fireEvent.change(screen.getByPlaceholderText('e.g. Doe'), {
    target: { value: 'Doe' },
  });
  fireEvent.change(screen.getByPlaceholderText('caretaker@example.com'), {
    target: { value: 'john@example.com' },
  });

  const passwordFields = screen.getAllByPlaceholderText('••••••••');
  fireEvent.change(passwordFields[0], { target: { value: 'StrongPass1!' } });
  fireEvent.change(passwordFields[1], { target: { value: 'StrongPass1!' } });
};

describe('Landlord caretaker creation smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    setupCaretakerApiMocks();
  });

  it('creates caretaker with all permissions unchecked by default', async () => {
    render(<Settings user={createUser()} onUserUpdate={jest.fn()} />);

    await openCaretakerTab();
    fillRequiredCaretakerFields();
    fireEvent.click(screen.getByRole('button', { name: /Next: Modules and Properties/i }));

    fireEvent.click(screen.getByText('Dorm One'));
    fireEvent.click(screen.getByRole('button', { name: /Confirm and Add Caretaker/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/landlord/caretakers',
        {
          first_name: 'John',
          middle_name: '',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '',
          date_of_birth: '',
          password: 'StrongPass1!',
          password_confirmation: 'StrongPass1!',
          property_ids: [1],
          permissions: {
            can_view_bookings: true,
            can_approve_bookings: false,
            can_cancel_bookings: false,
            can_add_manual_bookings: false,
            can_manage_add_ons: false,
            can_view_messages: true,
            can_view_tenants: false,
            can_add_tenant_manually: false,
            can_view_rooms: false,
            can_view_properties: false,
            can_manage_maintenance: false,
            can_manage_payments: false,
            can_view_analytics: false,
            can_view_audit_logs: false,
          },
        },
      );
    });

    expect(showSuccess).toHaveBeenCalledWith('Caretaker added!');
  });

  it('creates caretaker with all permissions checked when toggled and confirmed', async () => {
    render(<Settings user={createUser()} onUserUpdate={jest.fn()} />);

    await openCaretakerTab();
    fillRequiredCaretakerFields();
    fireEvent.click(screen.getByRole('button', { name: /Next: Modules and Properties/i }));

    fireEvent.click(screen.getByRole('button', { name: /Select All/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Grant Access' }));

    fireEvent.click(screen.getByText('Dorm One'));
    fireEvent.click(screen.getByRole('button', { name: /Confirm and Add Caretaker/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/landlord/caretakers',
        {
          first_name: 'John',
          middle_name: '',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '',
          date_of_birth: '',
          password: 'StrongPass1!',
          password_confirmation: 'StrongPass1!',
          property_ids: [1],
          permissions: {
            can_view_bookings: true,
            can_approve_bookings: true,
            can_cancel_bookings: true,
            can_add_manual_bookings: true,
            can_manage_add_ons: true,
            can_view_messages: true,
            can_view_tenants: true,
            can_add_tenant_manually: true,
            can_view_rooms: true,
            can_view_properties: true,
            can_manage_maintenance: true,
            can_manage_payments: true,
            can_view_analytics: true,
            can_view_audit_logs: true,
          },
        },
      );
    });

    expect(showSuccess).toHaveBeenCalledWith('Caretaker added!');
  });
});
