import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import IncidentCard from '../components/incidents/IncidentCard';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('IncidentCard Component', () => {
  const mockIncident = {
    _id: '123',
    type: 'FIRE',
    severity: 4,
    source: 'sms',
    createdAt: new Date().toISOString(),
    userId: { name: 'Nguyen Van A', phone: '0901234567' },
    message: 'Chay rung thong',
    location: { coordinates: [105.8542, 21.0285] },
    batteryAtTime: 85,
  };

  test('renders incident information correctly', () => {
    render(<IncidentCard incident={mockIncident} />);
    
    expect(screen.getByText('Cháy')).toBeTruthy();
    expect(screen.getByText('Mức 4')).toBeTruthy();
    expect(screen.getByText('Nguyen Van A • 0901234567')).toBeTruthy();
    expect(screen.getByText('Chay rung thong')).toBeTruthy();
    expect(screen.getByText('SMS')).toBeTruthy();
    expect(screen.getByText('🔋 85%')).toBeTruthy();
  });

  test('displays correct badge classes based on severity level', () => {
    // Severity 2 (Low)
    const lowInc = { ...mockIncident, severity: 2 };
    const { container: lowContainer } = render(<IncidentCard incident={lowInc} />);
    const lowBadge = lowContainer.querySelector('.badge-low');
    expect(lowBadge).toBeTruthy();
    expect(lowBadge.textContent).toBe('Mức 2');

    // Severity 3 (Medium)
    const medInc = { ...mockIncident, severity: 3 };
    const { container: medContainer } = render(<IncidentCard incident={medInc} />);
    const medBadge = medContainer.querySelector('.badge-med');
    expect(medBadge).toBeTruthy();
    expect(medBadge.textContent).toBe('Mức 3');

    // Severity 5 (High)
    const highInc = { ...mockIncident, severity: 5 };
    const { container: highContainer } = render(<IncidentCard incident={highInc} />);
    const highBadge = highContainer.querySelector('.badge-high');
    expect(highBadge).toBeTruthy();
    expect(highBadge.textContent).toBe('Mức 5');
  });
});
