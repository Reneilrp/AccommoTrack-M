import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

describe('Jest mobile smoke', () => {
  it('renders a basic element', () => {
    render(<Text>Mobile Jest Ready</Text>);

    expect(screen.getByText('Mobile Jest Ready')).toBeTruthy();
  });
});