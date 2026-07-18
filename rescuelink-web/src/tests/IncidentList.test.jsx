import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import IncidentList from '../pages/IncidentList';
import { useQuery } from '@tanstack/react-query';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

// Mock Header
vi.mock('../components/layout/Header', () => ({
  default: ({ title, liveCount }) => <div data-testid="header">{title} - Total: {liveCount}</div>,
}));

describe('IncidentList Page', () => {
  const mockData = {
    data: [
      {
        _id: '1',
        type: 'FIRE',
        severity: 4,
        status: 'open',
        createdAt: new Date().toISOString(),
        userId: { name: 'Nguyen Van A', phone: '0901234567' },
        location: { coordinates: [105.8542, 21.0285] },
        batteryAtTime: 90,
      },
    ],
    pages: 3,
    total: 45,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useQuery.mockImplementation(() => ({
      data: mockData,
      isLoading: false,
    }));
  });

  test('renders table headers and rows correctly', () => {
    render(<IncidentList />);

    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByText('Loại')).toBeTruthy();
    expect(screen.getByText('Người báo')).toBeTruthy();
    expect(screen.getByText('Vị trí GPS')).toBeTruthy();
    
    // Row content
    expect(screen.getAllByText('Cháy').length).toBeGreaterThan(0);
    expect(screen.getByText('Nguyen Van A')).toBeTruthy();
    expect(screen.getAllByText('Mức 4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mở').length).toBeGreaterThan(0);
  });

  test('applies filters on dropdown select', () => {
    render(<IncidentList />);

    const selects = screen.getAllByRole('combobox');
    const typeDropdown = selects[0];
    const statusDropdown = selects[1];

    // Select 'FIRE' type
    fireEvent.change(typeDropdown, { target: { value: 'FIRE' } });
    expect(typeDropdown.value).toBe('FIRE');

    // Select 'assigned' status
    fireEvent.change(statusDropdown, { target: { value: 'assigned' } });
    expect(statusDropdown.value).toBe('assigned');
  });

  test('interacts with pagination controls correctly', () => {
    render(<IncidentList />);

    expect(screen.getByText(/Trang 1 \/ 3/)).toBeTruthy();
    
    const nextButton = screen.getByRole('button', { name: 'Trang sau' });
    expect(nextButton).toBeTruthy();
    expect(nextButton.disabled).toBeFalsy();

    // Click Next
    fireEvent.click(nextButton);
  });
});
