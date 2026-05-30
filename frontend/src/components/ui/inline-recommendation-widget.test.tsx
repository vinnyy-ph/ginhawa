import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineRecommendationWidget } from './inline-recommendation-widget';

describe('InlineRecommendationWidget (idle state)', () => {
  it('renders the symptom-check entry UI with analysis disabled', () => {
    render(<InlineRecommendationWidget />);
    expect(screen.getByText('Symptom Check')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze symptoms/i })).toBeDisabled();
  });

  it('enables analysis once the symptom text is long enough', () => {
    render(<InlineRecommendationWidget />);
    const box = screen.getByRole('textbox', { name: /describe your symptoms/i });

    fireEvent.change(box, { target: { value: 'short' } });
    expect(screen.getByRole('button', { name: /analyze symptoms/i })).toBeDisabled();

    fireEvent.change(box, { target: { value: 'persistent headache for three days' } });
    expect(screen.getByRole('button', { name: /analyze symptoms/i })).toBeEnabled();
  });
});
