import { describe, it, expect } from 'vitest';
import { buildReceiptRefNoMap } from './ReceiptUploadForm';

describe('Receipt upload ref number map', () => {
  it('maps actual stored HDSB refNo values to submission IDs', () => {
    const submissions = [
      { id: 'sub1', formType: 'claim', submittedAt: '2026-07-14T10:00:00Z', data: { refNo: 'HDSB-260000' } },
      { id: 'sub2', formType: 'claim', submittedAt: '2026-07-15T10:00:00Z', data: { refNo: 'HDSB-260001' } },
    ];

    const map = buildReceiptRefNoMap(submissions);

    expect(map.get('HDSB-260000')).toBe('sub1');
    expect(map.get('HDSB-260001')).toBe('sub2');
  });

  it('falls back to generated HDSB-000x when stored refNo is missing', () => {
    const submissions = [
      { id: 'sub1', formType: 'claim', submittedAt: '2026-07-14T10:00:00Z', data: {} },
      { id: 'sub2', formType: 'claim', submittedAt: '2026-07-15T10:00:00Z', data: {} },
    ];

    const map = buildReceiptRefNoMap(submissions);

    expect(map.get('HDSB-0001')).toBe('sub1');
    expect(map.get('HDSB-0002')).toBe('sub2');
  });
});
