import React from 'react';
import { render, screen } from '@testing-library/react';
import ReservationPolicyNotice from '../components/ReservationPolicyNotice.jsx';

describe('MyBookings ReservationPolicyNotice (web)', () => {
  it('does not render when message is missing', () => {
    const { container } = render(
      <ReservationPolicyNotice policy={{ fee_required: true }} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders required-fee message with amber styling', () => {
    render(
      <ReservationPolicyNotice
        policy={{
          fee_required: true,
          message: 'Reservation fee is required because move-in is 4 days after booking date.',
        }}
      />,
    );

    const message = screen.getByText(/Reservation fee is required/i);
    expect(message).toBeInTheDocument();
    expect(message.className).toContain('text-amber-800');
  });

  it('renders no-fee message with green styling in compact mode', () => {
    render(
      <ReservationPolicyNotice
        compact
        policy={{
          fee_required: false,
          message: 'No reservation fee is required because move-in is within 3 days from booking date.',
        }}
      />,
    );

    const message = screen.getByText(/No reservation fee is required/i);
    expect(message).toBeInTheDocument();
    expect(message.className).toContain('text-green-800');
  });
});
