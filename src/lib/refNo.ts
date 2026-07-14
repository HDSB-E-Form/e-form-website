export function formatSubmissionRefNo(formType: string, sequenceNumber: number): string {
  const prefix = formType === 'leave' ? 'GP' : 'HDSB';
  return `${prefix}-${String(sequenceNumber).padStart(4, '0')}`;
}

export function getNextSequenceNumber(submissions: Array<{ data?: { refNo?: string } }>, formType: string): number {
  const prefix = formType === 'leave' ? 'GP' : 'HDSB';
  const highest = submissions.reduce((max, submission) => {
    const refNo = submission.data?.refNo;
    if (!refNo || !refNo.startsWith(prefix)) return max;

    const numericPart = Number(refNo.replace(`${prefix}-`, '').trim());
    if (Number.isNaN(numericPart)) return max;

    return Math.max(max, numericPart);
  }, 0);

  return highest + 1;
}
