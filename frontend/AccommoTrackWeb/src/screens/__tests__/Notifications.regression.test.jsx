import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../utils/api';
import TenantNotifications from '../Tenant/Notifications.jsx';
import LandlordNotificationsPage from '../Landlord/NotificationsPage.jsx';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('Notifications regression (web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tenant view-all notifications handles nested success/data envelope', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          data: [
            {
              id: 101,
              type: 'App\\Notifications\\UpcomingPaymentNotification',
              is_read: false,
              read_at: null,
              created_at: '2026-04-05T10:15:00.000Z',
              data: {
                type: 'payment',
                title: 'Payment Reminder',
                message: 'Your rent is due soon.',
              },
            },
          ],
        },
      },
    });

    render(<TenantNotifications />);

    expect(await screen.findByText('Payment Reminder')).toBeInTheDocument();
    expect(screen.getByText('Your rent is due soon.')).toBeInTheDocument();
  });

  it('landlord unread filter fetches unread_only immediately without reload', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications?role=landlord&per_page=200') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 1,
                type: 'booking',
                is_read: true,
                read_at: '2026-04-05T08:00:00.000Z',
                created_at: '2026-04-05T07:50:00.000Z',
                data: {
                  type: 'booking',
                  title: 'Booking update',
                  message: 'Tenant booking was updated',
                },
              },
            ],
          },
        });
      }

      if (url === '/landlord/dashboard/recent-activities') {
        return Promise.resolve({ data: { activities: [] } });
      }

      if (url === '/notifications?role=landlord&per_page=200&unread_only=true') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 2,
                type: 'payment',
                is_read: false,
                read_at: null,
                created_at: '2026-04-05T09:20:00.000Z',
                data: {
                  type: 'payment',
                  title: 'Payment received',
                  message: 'A tenant submitted a payment',
                },
              },
            ],
          },
        });
      }

      return Promise.resolve({ data: { data: [] } });
    });

    render(<LandlordNotificationsPage />);

    expect(await screen.findByText('Booking update')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unread' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications?role=landlord&per_page=200&unread_only=true');
    });

    expect(await screen.findByText('Payment received')).toBeInTheDocument();
    expect(screen.queryByText('Booking update')).not.toBeInTheDocument();
  });
});
