'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { ChargeGroup, ParticipantCharge, Profile } from '@/lib/types';

export function MemberAdditionalCharges({ assignments, profile, onOpenGuide }: {
  assignments: { charge: ParticipantCharge; group: ChargeGroup }[];
  profile: Profile | null;
  onOpenGuide: (name: string, amount: number, label: string) => void;
}) {
  const [tab, setTab] = useState<'UNPAID' | 'PAID'>('UNPAID');
  const visible = assignments.filter(({ charge }) => charge.status === tab);
  return <section id="additional-charges" aria-label="추가 비용 납부 관리" className="mt-7 border-t border-slate-200 pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-base font-semibold">추가 비용 <span className="text-xs font-normal text-slate-500">전체 기간</span></h2>
      <div role="group" aria-label="추가 비용 납부 상태" className="flex gap-4 text-xs">{(['UNPAID', 'PAID'] as const).map((value) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`min-h-10 border-b-2 ${tab === value ? 'border-emerald-700 font-semibold' : 'border-transparent text-slate-500'}`}>{value === 'UNPAID' ? '미납' : '납부 완료'}</button>)}</div>
    </div>
    {visible.length ? <ul className="divide-y divide-slate-100">{visible.map(({ charge, group }) => <li key={charge.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{group.title}</h3><p className="mt-1 text-xs text-slate-500">마감 {group.event_date ?? '미정'}</p></div>
      <div className="flex items-center gap-3"><strong className="text-sm font-semibold tabular-nums">{formatCurrency(charge.amount)}</strong>{charge.status === 'UNPAID' ? <button type="button" onClick={() => onOpenGuide(profile?.full_name ?? charge.member_name, charge.amount, group.title)} className="min-h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">납부하기</button> : <span className="text-xs text-emerald-700">납부 완료</span>}</div>
    </li>)}</ul> : <p className="py-5 text-sm text-slate-500">{tab === 'UNPAID' ? '미납된 추가 비용이 없습니다.' : '납부 완료된 추가 비용이 없습니다.'}</p>}
  </section>;
}
