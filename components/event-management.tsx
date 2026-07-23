'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  createAdditionalChargeGroupAction,
  createClubEventAction,
  deleteClubEventAction,
  updateClubEventAction,
  updateEventParticipantAttendanceAction,
  updateClubEventStatusAction,
} from '@/app/actions';
import { HIDDEN_PROFILE_EMAILS } from '@/lib/constants';
import type { ClubEvent, ClubEventStatus, ClubEventType, EventAttendanceStatus, FiscalYear, Profile } from '@/lib/types';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

const TYPE_LABELS: Record<ClubEventType, string> = {
  TOURNAMENT: '대회',
  TRAINING: '훈련',
  DINNER: '회식',
  MEETING: '회의',
  ETC: '기타',
};

const STATUS_LABELS: Record<ClubEventStatus, string> = {
  PLANNED: '예정',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const ATTENDANCE_LABELS: Record<EventAttendanceStatus, string> = {
  REGISTERED: '등록',
  PRESENT: '참석',
  ABSENT: '불참',
};

type EventForm = {
  id: string | null;
  title: string;
  type: ClubEventType;
  eventDate: string;
  location: string;
  memo: string;
  participantMemberIds: string[];
};

const emptyForm: EventForm = {
  id: null,
  title: '',
  type: 'TOURNAMENT',
  eventDate: '',
  location: '',
  memo: '',
  participantMemberIds: [],
};

export function EventManagement({
  events,
  profiles,
  fiscalYears,
  selectedFiscalYearId,
}: {
  events: ClubEvent[];
  profiles: Profile[];
  fiscalYears: FiscalYear[];
  selectedFiscalYearId: string | null;
}) {
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [chargeForms, setChargeForms] = useState<Record<string, { fiscalYearId: string; amount: string }>>({});
  const [participantSearch, setParticipantSearch] = useState('');
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [isPending, startTransition] = useTransition();

  const participantCandidates = useMemo(
    () => profiles
      .filter((profile) =>
        profile.approval_status === 'approved' &&
        profile.is_active &&
        profile.app_role !== 'super_admin' &&
        !HIDDEN_PROFILE_EMAILS.includes((profile.email ?? '') as (typeof HIDDEN_PROFILE_EMAILS)[number])
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ko-KR')),
    [profiles]
  );

  const filteredParticipants = useMemo(() => {
    const keyword = participantSearch.trim().toLowerCase();
    if (!keyword) return participantCandidates;
    return participantCandidates.filter((profile) =>
      profile.full_name.toLowerCase().includes(keyword) ||
      (profile.username ?? '').toLowerCase().includes(keyword)
    );
  }, [participantCandidates, participantSearch]);

  const plannedEvents = events.filter((event) => event.status === 'PLANNED');
  const closedEvents = events.filter((event) => event.status !== 'PLANNED');

  const updateForm = (patch: Partial<EventForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const toggleParticipant = (memberId: string) => {
    setForm((current) => ({
      ...current,
      participantMemberIds: current.participantMemberIds.includes(memberId)
        ? current.participantMemberIds.filter((id) => id !== memberId)
        : [...current.participantMemberIds, memberId],
    }));
  };

  const selectAllFiltered = () => {
    setForm((current) => ({
      ...current,
      participantMemberIds: Array.from(new Set([
        ...current.participantMemberIds,
        ...filteredParticipants.map((profile) => profile.id),
      ])),
    }));
  };

  const clearParticipants = () => {
    setForm((current) => ({ ...current, participantMemberIds: [] }));
  };

  const editEvent = (event: ClubEvent) => {
    setForm({
      id: event.id,
      title: event.title,
      type: event.type,
      eventDate: event.event_date,
      location: event.location ?? '',
      memo: event.memo ?? '',
      participantMemberIds: event.participants.map((participant) => participant.member_id),
    });
  };

  const submit = () => {
    const title = form.title.trim();
    if (!title || !form.eventDate) {
      setToastTone('error');
      setMessage('이벤트명과 일자를 입력해 주세요.');
      return;
    }

    setMessage('');
    startTransition(async () => {
      const payload = {
        title,
        type: form.type,
        eventDate: form.eventDate,
        location: form.location.trim() || null,
        memo: form.memo.trim() || null,
        participantMemberIds: form.participantMemberIds,
      };
      const result = form.id
        ? await updateClubEventAction(form.id, payload)
        : await createClubEventAction(payload);

      if (!result.ok) {
        setToastTone('error');
        setMessage(result.message ?? '이벤트 저장에 실패했습니다.');
        return;
      }

      setToastTone('success');
      setMessage(result.message ?? '이벤트가 저장되었습니다.');
      setForm(emptyForm);
    });
  };

  const changeStatus = (eventId: string, status: ClubEventStatus) => {
    startTransition(async () => {
      const result = await updateClubEventStatusAction(eventId, status);
      setToastTone(result.ok ? 'success' : 'error');
      setMessage(result.message ?? (result.ok ? '이벤트 상태가 변경되었습니다.' : '이벤트 상태 변경에 실패했습니다.'));
    });
  };

  const removeEvent = (eventId: string) => {
    startTransition(async () => {
      const result = await deleteClubEventAction(eventId);
      setToastTone(result.ok ? 'success' : 'error');
      setMessage(result.message ?? (result.ok ? '이벤트가 삭제되었습니다.' : '이벤트 삭제에 실패했습니다.'));
    });
  };

  const updateChargeForm = (eventId: string, patch: Partial<{ fiscalYearId: string; amount: string }>) => {
    setChargeForms((current) => ({
      ...current,
      [eventId]: {
        fiscalYearId: current[eventId]?.fiscalYearId ?? selectedFiscalYearId ?? fiscalYears[0]?.id ?? '',
        amount: current[eventId]?.amount ?? '',
        ...patch,
      },
    }));
  };

  const changeAttendance = (eventId: string, memberId: string, attendanceStatus: EventAttendanceStatus) => {
    startTransition(async () => {
      const result = await updateEventParticipantAttendanceAction(eventId, memberId, attendanceStatus);
      setToastTone(result.ok ? 'success' : 'error');
      setMessage(result.message ?? (result.ok ? '출석 상태가 변경되었습니다.' : '출석 상태 변경에 실패했습니다.'));
    });
  };

  const createChargeFromEvent = (event: ClubEvent) => {
    const chargeForm = chargeForms[event.id] ?? {
      fiscalYearId: selectedFiscalYearId ?? fiscalYears[0]?.id ?? '',
      amount: '',
    };
    const amount = Number(chargeForm.amount.replace(/\D/g, ''));
    const presentParticipants = event.participants.filter((participant) => participant.attendance_status === 'PRESENT');

    if (!chargeForm.fiscalYearId || amount <= 0 || presentParticipants.length === 0) {
      setToastTone('error');
      setMessage('기준 연도, 1인당 금액, 참석자를 확인해 주세요.');
      return;
    }

    startTransition(async () => {
      const result = await createAdditionalChargeGroupAction({
        fiscalYearId: chargeForm.fiscalYearId,
        clubEventId: event.id,
        title: event.title,
        category: event.type === 'DINNER' ? 'DINNER_FEE' : event.type === 'TOURNAMENT' ? 'TOURNAMENT_FEE' : 'ETC_FEE',
        eventDate: event.event_date,
        supportAmount: 0,
        actualCost: amount * presentParticipants.length,
        memo: event.memo,
        participantMemberIds: presentParticipants.map((participant) => participant.member_id),
        amountPerParticipant: amount,
      });
      setToastTone(result.ok ? 'success' : 'error');
      setMessage(result.message ?? (result.ok ? '이벤트 추가비용이 생성되었습니다.' : '이벤트 추가비용 생성에 실패했습니다.'));
      if (result.ok) {
        updateChargeForm(event.id, { amount: '' });
      }
    });
  };

  return (
    <>
      <FloatingToast open={Boolean(message)} message={message} tone={toastTone} onClose={() => setMessage('')} />
      <div className="space-y-8">
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Events</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900">대회 / 이벤트 관리</h2>
              <p className="mt-2 text-sm text-slate-500">대회, 훈련, 회식, 회의 일정을 만들고 참가자를 관리합니다.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
              예정 {plannedEvents.length}건 / 종료 {closedEvents.length}건
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-black text-slate-500">
                  이벤트명
                  <input
                    value={form.title}
                    onChange={(event) => updateForm({ title: event.target.value })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">
                  유형
                  <select
                    value={form.type}
                    onChange={(event) => updateForm({ type: event.target.value as ClubEventType })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">
                  일자
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(event) => updateForm({ eventDate: event.target.value })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">
                  장소
                  <input
                    value={form.location}
                    onChange={(event) => updateForm({ location: event.target.value })}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-xs font-black text-slate-500">
                메모
                <textarea
                  value={form.memo}
                  onChange={(event) => updateForm({ memo: event.target.value })}
                  rows={3}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={submit}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-800 disabled:opacity-50"
                >
                  {form.id ? '이벤트 수정' : '이벤트 생성'}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    취소
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <label className="grid flex-1 gap-1 text-xs font-black text-slate-500">
                  참가자 검색
                  <input
                    value={participantSearch}
                    onChange={(event) => setParticipantSearch(event.target.value)}
                    placeholder="이름 또는 아이디"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllFiltered} className="h-11 rounded-xl bg-slate-900 px-3 text-xs font-black text-white">전체 선택</button>
                  <button type="button" onClick={clearParticipants} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700">초기화</button>
                </div>
              </div>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredParticipants.map((profile) => (
                  <label key={profile.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <span>
                      <span className="font-black text-slate-800">{profile.full_name}</span>
                      <span className="ml-2 text-xs font-semibold text-slate-500">{profile.username}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.participantMemberIds.includes(profile.id)}
                      onChange={() => toggleParticipant(profile.id)}
                      className="h-4 w-4 accent-brand-700"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <EventList
          title="예정 이벤트"
          events={plannedEvents}
          fiscalYears={fiscalYears}
          selectedFiscalYearId={selectedFiscalYearId}
          chargeForms={chargeForms}
          onChargeFormChange={updateChargeForm}
          onCreateCharge={createChargeFromEvent}
          onAttendance={changeAttendance}
          onEdit={editEvent}
          onStatus={changeStatus}
          onDelete={removeEvent}
        />
        <EventList
          title="종료 / 취소 이벤트"
          events={closedEvents}
          fiscalYears={fiscalYears}
          selectedFiscalYearId={selectedFiscalYearId}
          chargeForms={chargeForms}
          onChargeFormChange={updateChargeForm}
          onCreateCharge={createChargeFromEvent}
          onAttendance={changeAttendance}
          onEdit={editEvent}
          onStatus={changeStatus}
          onDelete={removeEvent}
        />
      </div>
    </>
  );
}

function EventList({
  title,
  events,
  fiscalYears,
  selectedFiscalYearId,
  chargeForms,
  onChargeFormChange,
  onCreateCharge,
  onAttendance,
  onEdit,
  onStatus,
  onDelete,
}: {
  title: string;
  events: ClubEvent[];
  fiscalYears: FiscalYear[];
  selectedFiscalYearId: string | null;
  chargeForms: Record<string, { fiscalYearId: string; amount: string }>;
  onChargeFormChange: (eventId: string, patch: Partial<{ fiscalYearId: string; amount: string }>) => void;
  onCreateCharge: (event: ClubEvent) => void;
  onAttendance: (eventId: string, memberId: string, attendanceStatus: EventAttendanceStatus) => void;
  onEdit: (event: ClubEvent) => void;
  onStatus: (eventId: string, status: ClubEventStatus) => void;
  onDelete: (eventId: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500">등록된 이벤트가 없습니다.</div>
        ) : events.map((event) => {
          const presentCount = event.participants.filter((participant) => participant.attendance_status === 'PRESENT').length;
          const chargeForm = chargeForms[event.id] ?? {
            fiscalYearId: selectedFiscalYearId ?? fiscalYears[0]?.id ?? '',
            amount: '',
          };

          return (
          <article key={event.id} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2 text-xs font-black text-slate-500">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-800">{TYPE_LABELS[event.type]}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{STATUS_LABELS[event.status]}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{event.event_date}</span>
                </div>
                <h4 className="mt-3 text-lg font-black text-slate-900">{event.title}</h4>
                <p className="mt-1 text-sm text-slate-500">{event.location || '장소 미정'} · 참가 {event.participants.length}명 · 참석 {presentCount}명</p>
                {event.memo ? <p className="mt-2 text-sm leading-6 text-slate-600">{event.memo}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onEdit(event)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">수정</button>
                <button type="button" onClick={() => onStatus(event.id, 'PLANNED')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">예정</button>
                <button type="button" onClick={() => onStatus(event.id, 'COMPLETED')} className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">완료</button>
                <button type="button" onClick={() => onStatus(event.id, 'CANCELLED')} className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-black text-rose-700">취소</button>
                <button type="button" onClick={() => onDelete(event.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">삭제</button>
              </div>
            </div>
            {event.participants.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {event.participants.map((participant) => (
                  <div key={participant.member_id} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                    <span className="min-w-0 truncate">{participant.member_name}</span>
                    <select
                      value={participant.attendance_status}
                      onChange={(changeEvent) => onAttendance(event.id, participant.member_id, changeEvent.target.value as EventAttendanceStatus)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700"
                    >
                      {Object.entries(ATTENDANCE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            ) : null}
            {event.participants.length > 0 ? (
              <div className="mt-4 grid gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  value={chargeForm.fiscalYearId}
                  onChange={(changeEvent) => onChargeFormChange(event.id, { fiscalYearId: changeEvent.target.value })}
                  className="h-11 rounded-xl border border-white bg-white px-3 text-sm font-bold text-slate-700"
                >
                  {fiscalYears.map((year) => (
                    <option key={year.id} value={year.id}>{year.year}년</option>
                  ))}
                </select>
                <input
                  value={chargeForm.amount}
                  onChange={(changeEvent) => onChargeFormChange(event.id, { amount: changeEvent.target.value.replace(/\D/g, '') })}
                  placeholder="참석자 1인당 금액"
                  className="h-11 rounded-xl border border-white bg-white px-3 text-sm font-bold text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => onCreateCharge(event)}
                  className="h-11 rounded-xl bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-800"
                >
                  추가비용 생성
                </button>
              </div>
            ) : null}
          </article>
        );
        })}
      </div>
    </section>
  );
}
