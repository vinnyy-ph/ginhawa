import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DoctorFilters, defaultFilters, type FilterState } from './DoctorFilters';

function setup(overrides: Partial<FilterState> = {}) {
  const onFiltersChange = vi.fn();
  render(
    <DoctorFilters
      filters={{ ...defaultFilters, ...overrides }}
      onFiltersChange={onFiltersChange}
      availableSpecializations={['Cardiology', 'Pediatrics']}
      availableLanguages={['English', 'Tagalog']}
    />,
  );
  return { onFiltersChange };
}

afterEach(() => vi.restoreAllMocks());

describe('DoctorFilters', () => {
  it('opens the filter dialog and shows every filter section', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.getByText('Specialization')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Consultation Fee')).toBeInTheDocument();
    expect(screen.getByText('Years of Experience')).toBeInTheDocument();
    expect(screen.getByText('Languages Spoken')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Available Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Under ₱1,000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5+ Years' })).toBeInTheDocument();
    expect(screen.getByText('Tagalog')).toBeInTheDocument();
  });

  it('applies the selected filters via Show Results', () => {
    const { onFiltersChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Available Today' }));
    fireEvent.click(screen.getByRole('button', { name: '10+ Years' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show Results' }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ availability: 'today', experience: '10plus' }),
    );
  });

  it('shows the active-filter count on the trigger', () => {
    setup({ availability: 'today', experience: '5plus' });
    expect(screen.getByRole('button', { name: /^Filters/ })).toHaveTextContent('2');
  });
});
