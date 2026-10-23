export interface CloseoutPayload {
  yearMonth: string;
  accountBalances: Array<{ accountId: number; balance: number | string }>;
  totalIncome: number | string;
  expenseBreakdown?: Array<{ category: string; amount: number; percentage: number }>;
  notes?: string;
}

export function validateCloseoutPayload(payload: any): { isValid: boolean; error?: string; yearMonth?: string } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'Payload must be an object' };
  }

  const ym = String(payload.yearMonth || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) {
    return { isValid: false, error: 'Invalid yearMonth format (expected YYYY-MM)' };
  }

  if (!Array.isArray(payload.accountBalances)) {
    return { isValid: false, error: 'accountBalances must be an array' };
  }

  for (const acc of payload.accountBalances) {
    if (!acc || typeof acc !== 'object') {
      return { isValid: false, error: 'Each account balance item must be an object' };
    }
    const accId = Number(acc.accountId);
    const bal = Number(acc.balance);
    if (!Number.isInteger(accId) || accId <= 0 || !Number.isFinite(bal)) {
      return { isValid: false, error: 'Each account balance item must contain valid accountId and balance' };
    }
  }

  return { isValid: true, yearMonth: ym };
}
