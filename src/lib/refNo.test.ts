import { describe, it, expect } from 'vitest';
import { formatSubmissionRefNo } from './refNo';

describe('formatSubmissionRefNo', () => {
  it('formats gate pass numbers with the GP prefix', () => {
    expect(formatSubmissionRefNo('leave', 1)).toBe('GP-0001');
  });

  it('formats petty cash numbers with the HDSB prefix', () => {
    expect(formatSubmissionRefNo('claim', 7)).toBe('HDSB-0007');
  });

  it('formats car booking numbers with the HDSB prefix', () => {
    expect(formatSubmissionRefNo('car_rental', 12)).toBe('HDSB-0012');
  });
});
