import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';

import SwitchRoleTab from '../SwitchRoleTab';
import api from '../../../utils/api';
import { authService } from '../../../services/authService';

const realConsoleError = console.error;

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../services/authService', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    switchRole: jest.fn(),
  },
}));

describe('SwitchRoleTab role switching', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      const firstArg = args[0];
      const message = typeof firstArg === 'string'
        ? firstArg
        : firstArg?.message;

      if (typeof message === 'string' && message.includes('Not implemented: navigation')) {
        return;
      }

      realConsoleError(...args);
    });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('allows approved tenant to switch to landlord mode', async () => {
    api.get.mockResolvedValue({
      data: {
        status: 'approved',
      },
    });
    authService.switchRole.mockResolvedValue({
      user: { id: 15, role: 'landlord' },
      message: 'Role switched to landlord',
    });

    render(<SwitchRoleTab user={{ id: 15, role: 'tenant' }} />);

    const switchRoleButton = await screen.findByRole('button', {
      name: /switch to landlord mode/i,
    });
    fireEvent.click(switchRoleButton);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(authService.switchRole).toHaveBeenCalledWith('landlord');
    });

    expect(toast.success).toHaveBeenCalledWith('Role switched to landlord');
    expect(localStorage.getItem('userData')).toBe(
      JSON.stringify({ id: 15, role: 'landlord' }),
    );
  });

  it('shows disabled pending gate while waiting for admin partial verification', async () => {
    api.get.mockResolvedValue({
      data: {
        status: 'pending',
      },
    });

    render(<SwitchRoleTab user={{ id: 20, role: 'tenant' }} />);

    const waitingButton = await screen.findByRole('button', {
      name: /awaiting admin partial verification/i,
    });
    expect(waitingButton).toBeDisabled();

    expect(toast.error).not.toHaveBeenCalled();
    expect(authService.switchRole).not.toHaveBeenCalled();
  });

  it('allows landlord to switch back to tenant mode', async () => {
    authService.switchRole.mockResolvedValue({
      user: { id: 31, role: 'tenant' },
      message: 'Role switched to tenant',
    });

    render(<SwitchRoleTab user={{ id: 31, role: 'landlord' }} />);

    fireEvent.click(screen.getByRole('button', { name: /switch to tenant mode/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(authService.switchRole).toHaveBeenCalledWith('tenant');
    });

    expect(toast.success).toHaveBeenCalledWith('Role switched to tenant');
  });
});
