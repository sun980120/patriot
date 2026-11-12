import { calculateChargeSettlement } from '@/lib/charge-settlement';
import { formatCurrency } from '@/lib/utils';

export function SettlementBreakdown({ plannedSupport, paidTotal, actualCost, recordedExpense, settled = false }: {
  plannedSupport: number; paidTotal: number; actualCost: number;
  recordedExpense?: number; settled?: boolean;
}) {
  if (!Number.isSafeInteger(actualCost) || actualCost <= 0) return null;
  const result = calculateChargeSettlement(plannedSupport, paidTotal, actualCost);
  return <div aria-label="정산 금액 내역" className="my-4 border-y border-slate-200 py-4">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Value label="실제 총지출" amount={actualCost} />
      <Value label="참가자 실납부" amount={paidTotal} />
      <Value label={result.clubIncome > 0 ? '회비 순유입' : '회비 순부담'} amount={result.clubIncome || result.clubExpense} />
      <Value label="정산 잔액 · 참고" amount={result.surplus} />
    </div>
    <p className="mt-3 break-words text-xs leading-5 text-slate-600">참가자 실납부 {formatCurrency(paidTotal)} − 실제 총지출 {formatCurrency(actualCost)} = 항목 전체 회비 순변동 {result.balanceChange > 0 ? '+' : ''}{formatCurrency(result.balanceChange)}</p>
    <p className="mt-2 break-words text-xs leading-5 text-slate-500">예정 지원 {formatCurrency(plannedSupport)} · 실제 지원 배정 {formatCurrency(result.appliedSupport)} · 참가자 예산 부담 {formatCurrency(result.participantExpense)}</p>
    <p className="mt-1 text-xs leading-5 text-slate-500">정산 잔액은 참가자 수납에 포함된 참고 금액으로, 총세입에 다시 더하지 않습니다.</p>
    {result.extraClubExpense > 0 ? <p className="mt-3 text-sm font-medium text-amber-800">예정 지원을 초과한 회비 부담: {formatCurrency(result.extraClubExpense)}</p> : null}
    {settled && recordedExpense !== undefined && recordedExpense !== actualCost ? <p role="alert" className="mt-3 text-sm leading-6 text-rose-700">기록된 지출 {formatCurrency(recordedExpense)}과 실제 총지출 {formatCurrency(actualCost)}이 다릅니다. 정산 수정 후 금액을 재확인해 주세요.</p> : null}
  </div>;
}

function Value({ label, amount }: { label: string; amount: number }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-base font-semibold tabular-nums text-slate-900">{formatCurrency(amount)}</p></div>;
}
