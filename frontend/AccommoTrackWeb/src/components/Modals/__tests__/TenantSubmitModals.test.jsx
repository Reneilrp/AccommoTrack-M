import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ReviewModal from '../ReviewModal.jsx';
import ReportModal from '../ReportModal.jsx';

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('../../../services/reportService', () => ({
  reportService: {
    submitReport: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const api = jest.requireMock('../../../utils/api').default;
const { reportService } = jest.requireMock('../../../services/reportService');

describe('Tenant submit modals (web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.post.mockResolvedValue({ data: { success: true } });
    reportService.submitReport.mockResolvedValue({ data: { success: true } });
  });

  it('submits review payload and triggers callbacks', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    render(
      <ReviewModal
        booking={{ id: 501, property: { title: 'Dorm Prime' } }}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);

    fireEvent.change(
      screen.getByPlaceholderText('What did you like? What could be improved?'),
      { target: { value: 'Quiet room and responsive landlord.' } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reviews', {
        booking_id: 501,
        rating: 1,
        comment: 'Quiet room and responsive landlord.',
        cleanliness_rating: 1,
        location_rating: 1,
        value_rating: 1,
        communication_rating: 1,
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('submits report payload through reportService', async () => {
    const onClose = jest.fn();

    render(
      <ReportModal
        isOpen
        onClose={onClose}
        propertyId={12}
        propertyTitle="Dorm Prime"
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Other' },
    });

    fireEvent.change(
      screen.getByPlaceholderText('Please provide specific details about the issue...'),
      {
        target: {
          value: 'The listing information does not match the actual amenities provided.',
        },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(reportService.submitReport).toHaveBeenCalledWith({
        property_id: 12,
        reason: 'Other',
        description: 'The listing information does not match the actual amenities provided.',
      });
    });

    expect(onClose).toHaveBeenCalled();
  });
});
