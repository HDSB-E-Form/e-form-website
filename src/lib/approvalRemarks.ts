export interface ApprovalRemarkEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: "approved" | "rejected" | "payment_processed";
  remark: string;
  createdAt: string;
}

export const appendApprovalRemark = (
  existing: unknown,
  entry: Omit<ApprovalRemarkEntry, "id" | "createdAt">,
): ApprovalRemarkEntry[] => {
  const history = Array.isArray(existing) ? existing : [];
  const createdAt = new Date().toISOString();
  return [
    ...history,
    {
      ...entry,
      id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
    },
  ];
};
