export interface NotificationRecipient {
  path: string;
  recipientType: 'hos' | 'hod' | 'manco_member' | 'hr_admin' | 'finance_admin' | 'it_admin' | 'security_guard' | 'head_of_purchasing' | 'head_of_finance';
}

interface NotificationContext {
  id?: string;
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
  const id = user.id;
  const data = submission.data || {};

  const isHOS = role === 'hos' || secondaryRoles.includes('hos');
  const isHOD = role === 'hod' || secondaryRoles.includes('hod');
  const isHRAdmin = role === 'hr_admin' || secondaryRoles.includes('hr_admin');
  const isFinanceAdmin = role === 'finance_admin' || secondaryRoles.includes('finance_admin');
  const isITAdmin = role === 'it_admin' || secondaryRoles.includes('it_admin');
  const isSecurityGuard = role === 'security_guard' || secondaryRoles.includes('security_guard');
  const isHOP = role === 'head_of_purchasing' || secondaryRoles.includes('head_of_purchasing');
  const isHOF = role === 'head_of_finance' || secondaryRoles.includes('head_of_finance');
  const isMancoMember = role === 'manco_member' || secondaryRoles.includes('manco_member');

  if (isHOS && submission.status === 'pending' && (data.hosUserId ? data.hosUserId === id : (data.hosName === name || data.hos === name))) {
    return { path: '/admin/approvals', recipientType: 'hos' };
  }

  if (isHOD && submission.status === 'approved_hos' && (data.hodUserId ? data.hodUserId === id : (data.hodName === name || data.hod === name))) {
    return { path: '/admin/approvals', recipientType: 'hod' };
  }

  if (isMancoMember && submission.formType === 'leave' && submission.status === 'approved_hod' && (data.mancoMemberUserId ? data.mancoMemberUserId === id : data.mancoMemberName === name)) {
    return { path: '/admin/approvals', recipientType: 'manco_member' };
  }

  if (isHRAdmin && submission.formType === 'car_rental' && submission.status === 'approved_hod') {
    return { path: '/admin/hr', recipientType: 'hr_admin' };
  }

  if (isFinanceAdmin && submission.formType === 'claim' && ['pending_finance_review', 'approved_hof'].includes(submission.status)) {
    return { path: '/admin/finance', recipientType: 'finance_admin' };
  }

  if (isITAdmin && submission.formType === 'cctv_access_request' && submission.status === 'approved_hod') {
    return { path: '/admin/it', recipientType: 'it_admin' };
  }

  if (isITAdmin && ['it_admin_request', 'it_application_request', 'it_facilities_requisition'].includes(submission.formType) && ['approved_hod', 'reopened'].includes(submission.status)) {
    return { path: '/admin/it/facilities', recipientType: 'it_admin' };
  }

  if (isITAdmin && submission.formType === 'it_help_desk' && ['pending', 'reopened'].includes(submission.status)) {
    return { path: '/admin/it/help-desk', recipientType: 'it_admin' };
  }

  if (isSecurityGuard && submission.formType === 'leave' && submission.status === 'approved_manco') {
    return { path: '/admin/security', recipientType: 'security_guard' };
  }

  if (isHOP && submission.formType === 'claim' && submission.status === 'approved_hod' && (data.hopUserId ? data.hopUserId === id : data.hopName === name)) {
    return { path: '/admin/approvals', recipientType: 'head_of_purchasing' };
  }

  if (isHOF && submission.formType === 'claim' && submission.status === 'approved_hop' && (data.hofUserId ? data.hofUserId === id : data.hofName === name)) {
    return { path: '/admin/approvals', recipientType: 'head_of_finance' };
  }

  return null;
}
