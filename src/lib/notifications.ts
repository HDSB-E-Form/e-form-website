export interface NotificationRecipient {
  path: string;
  recipientType: 'hos' | 'hod' | 'hr_admin' | 'finance_admin' | 'security_guard' | 'head_of_purchasing' | 'head_of_finance';
}

interface NotificationContext {
  role: string;
  secondary_roles?: string[];
  name?: string;
}

interface NotificationPayload {
  formType: string;
  status: string;
  data?: Record<string, any>;
}

export function getNotificationTarget(user: NotificationContext, submission: NotificationPayload): NotificationRecipient | null {
  const role = user.role;
  const secondaryRoles = user.secondary_roles || [];
  const name = user.name;
  const data = submission.data || {};

  const isHOS = role === 'hos' || secondaryRoles.includes('hos');
  const isHOD = role === 'hod' || secondaryRoles.includes('hod');
  const isHRAdmin = role === 'hr_admin' || secondaryRoles.includes('hr_admin');
  const isFinanceAdmin = role === 'finance_admin' || secondaryRoles.includes('finance_admin');
  const isSecurityGuard = role === 'security_guard' || secondaryRoles.includes('security_guard');
  const isHOP = role === 'head_of_purchasing' || secondaryRoles.includes('head_of_purchasing');
  const isHOF = role === 'head_of_finance' || secondaryRoles.includes('head_of_finance');

  if (isHOS && submission.status === 'pending' && (data.hosName === name || data.hos === name)) {
    return { path: '/admin/approvals', recipientType: 'hos' };
  }

  if (isHOD && submission.status === 'approved_hos' && (data.hodName === name || data.hod === name)) {
    return { path: '/admin/approvals', recipientType: 'hod' };
  }

  if (isHRAdmin && ['car_rental', 'leave'].includes(submission.formType) && submission.status === 'approved_hod') {
    return { path: '/admin/hr', recipientType: 'hr_admin' };
  }

  if (isFinanceAdmin && submission.formType === 'claim' && submission.status === 'approved_hof') {
    return { path: '/admin/finance', recipientType: 'finance_admin' };
  }

  if (isSecurityGuard && submission.formType === 'leave' && submission.status === 'approved_hod') {
    return { path: '/admin/security', recipientType: 'security_guard' };
  }

  if (isHOP && submission.formType === 'claim' && submission.status === 'approved_hod' && data.hopName === name) {
    return { path: '/admin/approvals', recipientType: 'head_of_purchasing' };
  }

  if (isHOF && submission.formType === 'claim' && submission.status === 'approved_hop' && data.hofName === name) {
    return { path: '/admin/approvals', recipientType: 'head_of_finance' };
  }

  return null;
}
