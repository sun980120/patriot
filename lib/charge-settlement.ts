export function calculateChargeSettlement(plannedSupport: number, paidTotal: number, actualCost: number) {
  if (![plannedSupport, paidTotal, actualCost].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('정산 금액은 0 이상의 정수여야 합니다.');
  }
  const appliedSupport = Math.min(plannedSupport, actualCost);
  const participantExpense = actualCost - appliedSupport;
  const clubExpense = Math.max(actualCost - paidTotal, 0);
  return {
    actualCost, appliedSupport, participantExpense,
    surplus: Math.max(paidTotal - participantExpense, 0),
    clubExpense, clubIncome: Math.max(paidTotal - actualCost, 0),
    extraClubExpense: Math.max(clubExpense - plannedSupport, 0),
    balanceChange: paidTotal - actualCost,
  };
}
