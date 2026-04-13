import React from 'react';
import DashboardPage from './DashboardPage.jsx';

// Dedicated caretaker dashboard entrypoint (mobile) for parity with web role separation.
export default function CaretakerDashboard(props) {
  return <DashboardPage {...props} />;
}