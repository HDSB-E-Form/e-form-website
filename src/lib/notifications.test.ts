import { describe, it, expect } from 'vitest';
import { getNotificationTarget } from './notifications';

describe('getNotificationTarget', () => {
  it('routes approved gate passes to the security guard dashboard', () => {
    const result = getNotificationTarget(
      { role: 'employee', secondary_roles: ['security_guard'], name: 'Guard One' },
      {
        formType: 'leave',
        status: 'approved_hod',
        data: { hosName: 'HOS User', hodName: 'Guard One' },
      }
    );

    expect(result).toMatchObject({ path: '/admin/security', recipientType: 'security_guard' });
  });

  it('routes approved car bookings to the HR admin dashboard', () => {
    const result = getNotificationTarget(
      { role: 'employee', secondary_roles: ['hr_admin'], name: 'HR Admin' },
      {
        formType: 'car_rental',
        status: 'approved_hod',
        data: { hosName: 'HOS User', hodName: 'HOD User' },
      }
    );

    expect(result).toMatchObject({ path: '/admin/hr', recipientType: 'hr_admin' });
  });

  it('does not notify a security guard for a pending gate pass', () => {
    const result = getNotificationTarget(
      { role: 'employee', secondary_roles: ['security_guard'], name: 'Guard One' },
      {
        formType: 'leave',
        status: 'pending',
        data: { hosName: 'Guard One', hodName: 'HOD User' },
      }
    );

    expect(result).toBeNull();
  });
});
