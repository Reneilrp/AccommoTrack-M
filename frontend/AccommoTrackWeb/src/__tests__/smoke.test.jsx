import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Jest web smoke', () => {
  it('renders a basic element', () => {
    render(<h1>Web Jest Ready</h1>);

    expect(screen.getByText('Web Jest Ready')).toBeInTheDocument();
  });
});
