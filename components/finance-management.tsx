'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createExpenseEntryAction,
  createIncomeEntryAction,
  deleteExpenseEntryAction,
  deleteIncomeEntryAction,
} from '@/app/actions';
import { formatCurrency } from '@/lib/utils';
import type { DashboardBundle, ExpenseEntry, IncomeEntry } from '@/lib/types';

export function FinanceManagement({ bundle, source }: { bundle: DashboardBundle; source: 'mock' | 'spring' }) {
  const router = useRouter();
  const [data, setData] = useState(bundle);
  const [selectedYearId, setSelectedYearId] = useState(bundle.selectedYear?.id ?? bundle.fiscalYears[0]?.id ?? '');
  const [incomeForm, setIncomeForm] = useState({ label: '', amount: '' });
  const [expenseForm, setExpenseForm] = useState({ label: '', amount: '' });
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const years = data.fiscalYears;
  const selectedYear = years.find((item) => item.id === selectedYearId) ?? years[0];
  const incomes = useMemo(
    () => data.incomes.filter((item) => item.fiscal_year_id === selectedYear?.id),
    [data.incomes, selectedYear]
  );
  const expenses = useMemo(
    () => data.expenses.filter((item) => item.fiscal_year_id === selectedYear?.id),
    [data.expenses, selectedYear]
  );
  const incomeTotal = incomes.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

  const addEntry = (kind: 'income' | 'expense') => {
    if (!selectedYear) return;

    const form = kind === 'income' ? incomeForm : expenseForm;
    const label = form.label.trim();
    const amount = Number(form.amount);

    if (!label || !amount) {
      setMessage('항목명과 금액을 모두 입력해 주세요.');
      return;
    }

    setMessage('');

    if (kind === 'income') {
      const entry: IncomeEntry = {
        id: `${selectedYear.id}-income-${Date.now()}`,
        fiscal_year_id: selectedYear.id,
        label,
        amount,
        memo: null,
      };

      setData((current) => ({ ...current, incomes: [entry, ...current.incomes] }));
      setIncomeForm({ label: '', amount: '' });

      if (source === 'spring') {
        startTransition(async () => {
          const result = await createIncomeEntryAction({ fiscalYearId: selectedYear.id, label, amount });
          if (!result.ok) {
            setMessage(result.message ?? '세입 추가에 실패했습니다.');
            router.refresh();
          }
        });
      }

      return;
    }

    const entry: ExpenseEntry = {
      id: `${selectedYear.id}-expense-${Date.now()}`,
      fiscal_year_id: selectedYear.id,
      label,
      amount,
      memo: null,
    };

    setData((current) => ({ ...current, expenses: [entry, ...current.expenses] }));
    setExpenseForm({ label: '', amount: '' });

    if (source === 'spring') {
      startTransition(async () => {
        const result = await createExpenseEntryAction({ fiscalYearId: selectedYear.id, label, amount });
        if (!result.ok) {
          setMessage(result.message ?? '지출 추가에 실패했습니다.');
          router.refresh();
        }
      });
    }
  };

  const removeEntry = (kind: 'income' | 'expense', id: string) => {
    setMessage('');
    setData((current) =>
      kind === 'income'
        ? { ...current, incomes: current.incomes.filter((item) => item.id !== id) }
        : { ...current, expenses: current.expenses.filter((item) => item.id !== id) }
    );

    if (source === 'spring') {
      startTransition(async () => {
        const result = kind === 'income'
          ? await deleteIncomeEntryAction(id)
          : await deleteExpenseEntryAction(id);
        if (!result.ok) {
          setMessage(result.message ?? '항목 삭제에 실패했습니다.');
          router.refresh();
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Finance Pages</p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">세입 / 지출 관리 페이지</h2>
        <p className="mt-2 text-sm text-slate-500">세입과 지출의 추가, 삭제는 이 페이지에서만 처리합니다. 통합 대시보드에서는 조회만 할 수 있습니다.</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-2">기준 연도: {selectedYear?.year}년</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">기타 세입 {formatCurrency(incomeTotal)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">지출 {formatCurrency(expenseTotal)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">{source === 'spring' ? 'Spring API' : 'Mock'} {isPending ? '동기화 중' : '연결됨'}</span>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">연도 선택</span>
            <select
              value={selectedYearId}
              onChange={(event) => setSelectedYearId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
            >
              {years.map((year) => (
                <option key={year.id} value={year.id}>{year.year}년</option>
              ))}
            </select>
          </label>
        </div>
        {message ? <p className="mt-4 text-sm text-rose-600">{message}</p> : null}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <CrudFinanceList
          title="기타 세입 관리"
          kind="income"
          total={incomeTotal}
          items={incomes}
          labelValue={incomeForm.label}
          amountValue={incomeForm.amount}
          onLabelChange={(value) => setIncomeForm((current) => ({ ...current, label: value }))}
          onAmountChange={(value) => setIncomeForm((current) => ({ ...current, amount: value }))}
          onAdd={() => addEntry('income')}
          onDelete={(id) => removeEntry('income', id)}
        />
        <CrudFinanceList
          title="지출 관리"
          kind="expense"
          total={expenseTotal}
          items={expenses}
          labelValue={expenseForm.label}
          amountValue={expenseForm.amount}
          onLabelChange={(value) => setExpenseForm((current) => ({ ...current, label: value }))}
          onAmountChange={(value) => setExpenseForm((current) => ({ ...current, amount: value }))}
          onAdd={() => addEntry('expense')}
          onDelete={(id) => removeEntry('expense', id)}
        />
      </div>
    </div>
  );
}

function CrudFinanceList({
  title,
  kind,
  total,
  items,
  labelValue,
  amountValue,
  onLabelChange,
  onAmountChange,
  onAdd,
  onDelete,
}: {
  title: string;
  kind: 'income' | 'expense';
  total: number;
  items: Array<IncomeEntry | ExpenseEntry>;
  labelValue: string;
  amountValue: string;
  onLabelChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
      <div className="flex items-end justify-between border-b border-slate-200/80 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">{kind === 'income' ? 'Income' : 'Expense'}</p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{title}</h3>
        </div>
        <span className="text-sm font-semibold text-slate-500">합계 {formatCurrency(total)}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
        <input
          value={labelValue}
          onChange={(event) => onLabelChange(event.target.value)}
          type="text"
          placeholder={kind === 'income' ? '예: 찬조금, 후원금' : '예: 대관료, 유니폼비'}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        <input
          value={amountValue}
          onChange={(event) => onAmountChange(event.target.value)}
          type="number"
          min="0"
          placeholder="금액"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        <button
          onClick={onAdd}
          className={`rounded-2xl px-4 py-3 text-sm font-bold text-white transition ${kind === 'income' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-900 hover:bg-slate-800'}`}
        >
          추가
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{kind === 'income' ? '세입 항목' : '지출 항목'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-slate-900">{formatCurrency(item.amount)}</span>
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600"
              >
                삭제
              </button>
            </div>
          </div>
        )) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">{`등록된 ${kind === 'income' ? '세입' : '지출'}이 없습니다.`}</div>}
      </div>
    </section>
  );
}
