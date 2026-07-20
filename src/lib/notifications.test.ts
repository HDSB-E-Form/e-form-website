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

  it('routes approved CCTV requests to an IT admin with a secondary role', () => {
    const result = getNotificationTarget(
      { role: 'hod', secondary_roles: ['it_admin'], name: 'IT Reviewer' },
      {
        formType: 'cctv_access_request',
        status: 'approved_hod',
        data: { hodName: 'Department Head' },
      }
    );

    expect(result).toMatchObject({ path: '/admin/it', recipientType: 'it_admin' });
  });

  it('routes a new Help Desk ticket directly to the IT admin dashboard', () => {
    const result = getNotificationTarget(
      { role: 'it_admin', name: 'IT Admin' },
      {
        formType: 'it_help_desk',
        status: 'pending',
        data: {},
      }
    );

    expect(result).toMatchObject({ path: '/admin/it/help-desk', recipientType: 'it_admin' });
  });

  it('routes a reopened Help Desk ticket back to the IT admin dashboard', () => {
    const result = getNotificationTarget(
      { role: 'it_admin', name: 'IT Admin' },
      {
        formType: 'it_help_desk',
        status: 'reopened',
        data: {},
      }
    );

    expect(result).toMatchObject({ path: '/admin/it/help-desk', recipientType: 'it_admin' });
  });

  it('does not send general submission notifications to a super admin', () => {
    const result = getNotificationTarget(
      { role: 'super_admin', name: 'Super Admin' },
      {
        formType: 'car_rental',
        status: 'approved_hod',
        data: {},
      }
    );

    expect(result).toBeNull();
  });
});
