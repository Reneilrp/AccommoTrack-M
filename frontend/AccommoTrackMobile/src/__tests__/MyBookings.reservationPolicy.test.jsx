import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ReservationPolicyNotice from '../features/tenant/screens/Bookings/components/ReservationPolicyNotice.jsx';

describe('ReservationPolicyNotice (mobile)', () => {
  const theme = {
    isDark: false,
  };

  it('does not render when message is missing', () => {
    const { queryByTestId } = render(
      <ReservationPolicyNotice policy={{ fee_required: true }} theme={theme} />,
    );

    expect(queryByTestId('reservation-policy-notice')).toBeNull();
  });

  it('renders fee-required message', () => {
    render(
      <ReservationPolicyNotice
        theme={theme}
        policy={{
          fee_required: true,
          message: 'Reservation fee is required because move-in is 4 days after booking date.',
        }}
      />,
    );

    expect(screen.getByText(/Reservation fee is required/i)).toBeTruthy();
  });

  it('renders no-fee message', () => {
    render(
      <ReservationPolicyNotice
        theme={theme}
        policy={{
          fee_required: false,
          message: 'No reservation fee is required because move-in is within 3 days from booking date.',
        }}
      />,
    );

    expect(screen.getByText(/No reservation fee is required/i)).toBeTruthy();
  });
});
