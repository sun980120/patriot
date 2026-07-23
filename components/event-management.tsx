'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createClubEventAction,
  deleteClubEventAction,
  updateClubEventAction,
} from '@/app/actions';
import type { ClubEvent, ClubEventDeleteMode, ClubEventType, ScheduleRecurrenceType } from '@/lib/types';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

const TYPE_LABELS: Record<ClubEventType, string> = {
  TOURNAMENT: '대회',
  TRAINING: '훈련',
  DINNER: '회식',
  MEETING: '회의',
  ETC: '기타',
};

const RECURRENCE_LABELS: Record<ScheduleRecurrenceType, string> = {
  NONE: '반복 없음',
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
};

const TYPE_STYLES: Record<ClubEventType, {
  item: string;
  itemSelected: string;
  list: string;
  listSelected: string;
  badge: string;
}> = {
  TOURNAMENT: {
    item: 'bg-rose-600 text-white hover:bg-rose-700',
    itemSelected: 'bg-rose-800 text-white',
    list: 'border-rose-200 bg-rose-50 hover:border-rose-300',
    listSelected: 'border-rose-500 bg-rose-100',
    badge: 'bg-rose-100 text-rose-800',
  },
  TRAINING: {
    item: 'bg-emerald-600 text-white hover:bg-emerald-700',
    itemSelected: 'bg-emerald-800 text-white',
    list: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300',
    listSelected: 'border-emerald-500 bg-emerald-100',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  DINNER: {
    item: 'bg-amber-600 text-white hover:bg-amber-700',
    itemSelected: 'bg-amber-800 text-white',
    list: 'border-amber-200 bg-amber-50 hover:border-amber-300',
    listSelected: 'border-amber-500 bg-amber-100',
    badge: 'bg-amber-100 text-amber-800',
  },
  MEETING: {
    item: 'bg-sky-600 text-white hover:bg-sky-700',
    itemSelected: 'bg-sky-800 text-white',
    list: 'border-sky-200 bg-sky-50 hover:border-sky-300',
    listSelected: 'border-sky-500 bg-sky-100',
    badge: 'bg-sky-100 text-sky-800',
  },
  ETC: {
    item: 'bg-slate-600 text-white hover:bg-slate-700',
    itemSelected: 'bg-slate-800 text-white',
    list: 'border-slate-200 bg-slate-50 hover:border-slate-300',
    listSelected: 'border-slate-500 bg-slate-100',
    badge: 'bg-slate-100 text-slate-800',
  },
};

type ScheduleForm = {
  id: string | null;
  title: string;
  type: ClubEventType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  recurrenceType: ScheduleRecurrenceType;
  recurrenceUntil: string;
  location: string;
  memo: string;
};

type CalendarOccurrence = {
  event: ClubEvent;
  date: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
};

const today = new Date();

const emptyForm: ScheduleForm = {
  id: null,
  title: '',
  type: 'TRAINING',
  startDate: toDateInput(today),
  endDate: toDateInput(today),
  startTime: '',
  endTime: '',
  recurrenceType: 'NONE',
  recurrenceUntil: '',
  location: '',
  memo: '',
};

export function EventManagement({ events, canManage }: { events: ClubEvent[]; canManage: boolean }) {
  const router = useRouter();
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [selectedDate, setSelectedDate] = useState(toDateInput(today));
  const [showSelectedDatePanel, setShowSelectedDatePanel] = useState(false);
  const [selectedOccurrenceKey, setSelectedOccurrenceKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [isPending, startTransition] = useTransition();

  const calendarDays = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const calendarStart = calendarDays[0] ?? new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const calendarEnd = calendarDays[calendarDays.length - 1] ?? new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const occurrences = useMemo(() => expandOccurrences(events, calendarStart, calendarEnd), [events, calendarStart, calendarEnd]);
  const occurrencesByDate = useMemo(() => {
    const grouped = new Map<string, CalendarOccurrence[]>();
    occurrences.forEach((occurrence) => {
      grouped.set(occurrence.date, [...(grouped.get(occurrence.date) ?? []), occurrence]);
    });
    grouped.forEach((items) => items.sort(compareOccurrences));
    return grouped;
  }, [occurrences]);
  const selectedOccurrences = occurrencesByDate.get(selectedDate) ?? [];
  const selectedOccurrence = selectedOccurrences.find((occurrence) => occurrenceKey(occurrence) === selectedOccurrenceKey) ?? null;

  const updateForm = (patch: Partial<ScheduleForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const moveMonth = (delta: number) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDate = (date: string) => {
    if (selectedDate === date && showSelectedDatePanel) {
      setShowSelectedDatePanel(false);
      setSelectedOccurrenceKey(null);
      return;
    }
    setSelectedDate(date);
    setShowSelectedDatePanel(true);
    setSelectedOccurrenceKey(null);
    if (!form.id && canManage) {
      updateForm({ startDate: date, endDate: date });
    }
  };

  const selectOccurrence = (occurrence: CalendarOccurrence) => {
    setSelectedDate(occurrence.date);
    setShowSelectedDatePanel(true);
    setSelectedOccurrenceKey(occurrenceKey(occurrence));
  };

  const editEvent = (event: ClubEvent) => {
    if (!canManage) return;
    setForm({
      id: event.id,
      title: event.title,
      type: event.type,
      startDate: event.start_date,
      endDate: event.end_date,
      startTime: event.start_time ?? '',
      endTime: event.end_time ?? '',
      recurrenceType: event.recurrence_type,
      recurrenceUntil: event.recurrence_until ?? '',
      location: event.location ?? '',
      memo: event.memo ?? '',
    });
    setSelectedDate(event.start_date);
  };

  const submit = () => {
    if (!canManage) return;

    const title = form.title.trim();
    if (!title || !form.startDate || !form.endDate) {
      setToastTone('error');
      setMessage('일정명, 시작일, 종료일을 입력해 주세요.');
      return;
    }

    if (form.endDate < form.startDate) {
      setToastTone('error');
      setMessage('종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    if (form.startTime && !form.endTime) {
      setToastTone('error');
      setMessage('시작 시간이 있으면 종료 시간도 입력해야 합니다.');
      return;
    }

    if (!form.startTime && form.endTime) {
      setToastTone('error');
      setMessage('종료 시간만 단독으로 입력할 수 없습니다.');
      return;
    }

    if (form.startDate === form.endDate && form.startTime && form.endTime && form.endTime <= form.startTime) {
      setToastTone('error');
      setMessage('같은 날짜 일정의 종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    startTransition(async () => {
      const payload = {
        title,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        recurrenceType: form.recurrenceType,
        recurrenceUntil: form.recurrenceType === 'NONE' ? null : form.recurrenceUntil || null,
        location: form.location.trim() || null,
        memo: form.memo.trim() || null,
      };
      const result = form.id
        ? await updateClubEventAction(form.id, payload)
        : await createClubEventAction(payload);

      setToastTone(result.ok ? 'success' : 'error');
      setMessage(result.message ?? (result.ok ? '일정이 저장되었습니다.' : '일정 저장에 실패했습니다.'));
      if (result.ok) {
        setForm({ ...emptyForm, startDate: form.startDate, endDate: form.startDate });
        setShowSelectedDatePanel(true);
        router.refresh();
      }
    });
  };

  const removeEvent = (eventId: string, mode: ClubEventDeleteMode = 'ALL', occurrenceStartDate?: string) => {
    if (!canManage) return;
    startTransition(async () => {
      const result = await deleteClubEventAction(eventId, { mode, occurrenceStartDate: occurrenceStartDate ?? null });
      setToastTone(result.ok ? 'success' : 'error');
      setMessage(result.message ?? (result.ok ? '일정이 삭제되었습니다.' : '일정 삭제에 실패했습니다.'));
      if (result.ok) {
        setSelectedOccurrenceKey(null);
        router.refresh();
      }
    });
  };

  return (
    <>
      <FloatingToast open={Boolean(message)} message={message} tone={toastTone} onClose={() => setMessage('')} />
      <div className="space-y-8">
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Calendar</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900">캘린더</h2>
              <p className="mt-2 text-sm text-slate-500">
                {canManage ? '일정을 등록하고 월간 캘린더에서 확인합니다.' : '동호회 일정을 월간 캘린더에서 확인합니다.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => moveMonth(-1)} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700">이전</button>
              <span className="min-w-32 text-center text-lg font-black text-slate-900">{monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월</span>
              <button type="button" onClick={() => moveMonth(1)} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700">다음</button>
            </div>
          </div>

          <div className={`mt-6 grid gap-4 transition-all duration-300 ease-out ${showSelectedDatePanel ? 'lg:grid-cols-[1.25fr_0.75fr]' : 'lg:grid-cols-1'}`}>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-black">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <div key={day} className={`px-2 py-3 ${weekendTextClass(index)}`}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const date = toDateInput(day);
                  const dayOccurrences = occurrencesByDate.get(date) ?? [];
                  const inMonth = day.getMonth() === monthCursor.getMonth();
                  const selected = selectedDate === date;
                  return (
                    <div
                      key={date}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectDate(date)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectDate(date);
                        }
                      }}
                      className={`min-h-28 cursor-pointer border-t border-slate-100 p-2 text-left transition ${selected && showSelectedDatePanel ? 'bg-brand-50' : inMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 text-slate-400'}`}
                    >
                      <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-black transition ${selected && showSelectedDatePanel ? 'bg-brand-700 text-white' : weekendTextClass(day.getDay())}`}>
                        {day.getDate()}
                      </span>
                      <div className="mt-2 space-y-1">
                        {dayOccurrences.slice(0, 3).map((occurrence) => (
                          <button
                            type="button"
                            key={occurrenceKey(occurrence)}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectOccurrence(occurrence);
                            }}
                            className={`block w-full truncate rounded-lg px-2 py-1 text-left text-[11px] font-bold transition ${
                              selectedOccurrenceKey === occurrenceKey(occurrence)
                                ? TYPE_STYLES[occurrence.event.type].itemSelected
                                : TYPE_STYLES[occurrence.event.type].item
                            }`}
                          >
                            {occurrence.event.title}
                          </button>
                        ))}
                        {dayOccurrences.length > 3 ? <div className="text-[11px] font-bold text-slate-500">+{dayOccurrences.length - 3}개</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              aria-hidden={!showSelectedDatePanel}
              className={`overflow-hidden transition-all duration-300 ease-out ${
                showSelectedDatePanel
                  ? 'max-h-[1600px] opacity-100 translate-x-0'
                  : 'max-h-0 opacity-0 translate-x-4 pointer-events-none lg:max-h-none'
              }`}
            >
              <div className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4">
                <h3 className="text-lg font-black text-slate-900">{selectedDate} 일정</h3>
                <div className="mt-3">
                  {selectedOccurrences.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-500">등록된 일정이 없습니다.</div>
                  ) : (
                    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
                      {selectedOccurrences.map((occurrence) => (
                        <button
                          type="button"
                          key={occurrenceKey(occurrence)}
                          onClick={() => selectOccurrence(occurrence)}
                          className={`min-w-[240px] snap-start rounded-2xl border p-4 text-left transition sm:min-w-[280px] ${
                            selectedOccurrenceKey === occurrenceKey(occurrence)
                              ? TYPE_STYLES[occurrence.event.type].listSelected
                              : TYPE_STYLES[occurrence.event.type].list
                          }`}
                        >
                          <p className="truncate text-base font-black text-slate-900">{occurrence.event.title}</p>
                          <p className="mt-2 text-sm font-bold text-slate-500">{formatOccurrenceTime(occurrence)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              <ScheduleDetailPanel
                occurrence={selectedOccurrence}
                canManage={canManage}
                onEdit={editEvent}
                onDelete={(eventId, mode, occurrenceStartDate) => removeEvent(eventId, mode, occurrenceStartDate)}
              />
              {canManage ? (
                <ScheduleFormPanel
                  form={form}
                  isPending={isPending}
                  onChange={updateForm}
                  onSubmit={submit}
                  onCancel={() => setForm({ ...emptyForm, startDate: selectedDate, endDate: selectedDate })}
                />
              ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function ScheduleDetailPanel({
  occurrence,
  canManage,
  onEdit,
  onDelete,
}: {
  occurrence: CalendarOccurrence | null;
  canManage: boolean;
  onEdit: (event: ClubEvent) => void;
  onDelete: (eventId: string, mode: ClubEventDeleteMode, occurrenceStartDate?: string) => void;
}) {
  if (!occurrence) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
        캘린더의 일정명을 클릭하면 상세 내용을 확인할 수 있습니다.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${TYPE_STYLES[occurrence.event.type].badge}`}>
            {TYPE_LABELS[occurrence.event.type]}
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-900">{occurrence.event.title}</h3>
        </div>
        {canManage && occurrence.event.recurrence_type === 'NONE' ? (
          <div className="flex gap-1">
            <button type="button" onClick={() => onEdit(occurrence.event)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">수정</button>
            <button type="button" onClick={() => onDelete(occurrence.event.id, 'ALL')} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white">삭제</button>
          </div>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-xs font-black text-slate-500">일정 기간</dt>
          <dd className="mt-1 font-bold text-slate-900">{formatDateRange(occurrence)}</dd>
        </div>
        <div>
          <dt className="text-xs font-black text-slate-500">시간</dt>
          <dd className="mt-1 font-bold text-slate-900">{formatOccurrenceTime(occurrence)}</dd>
        </div>
        <div>
          <dt className="text-xs font-black text-slate-500">반복</dt>
          <dd className="mt-1 font-bold text-slate-900">{RECURRENCE_LABELS[occurrence.event.recurrence_type]}</dd>
        </div>
        {occurrence.event.recurrence_until ? (
          <div>
            <dt className="text-xs font-black text-slate-500">반복 종료일</dt>
            <dd className="mt-1 font-bold text-slate-900">{occurrence.event.recurrence_until}</dd>
          </div>
        ) : null}
        {occurrence.event.location ? (
          <div>
            <dt className="text-xs font-black text-slate-500">장소</dt>
            <dd className="mt-1 font-bold text-slate-900">{occurrence.event.location}</dd>
          </div>
        ) : null}
        {occurrence.event.memo ? (
          <div>
            <dt className="text-xs font-black text-slate-500">메모</dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-700">{occurrence.event.memo}</dd>
          </div>
        ) : null}
      </dl>
      {canManage && occurrence.event.recurrence_type !== 'NONE' ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-xs font-black text-slate-500">반복 일정 삭제</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => onDelete(occurrence.event.id, 'ONLY_THIS', occurrence.startDate)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">해당 일정만</button>
            <button type="button" onClick={() => onDelete(occurrence.event.id, 'THIS_AND_FOLLOWING', occurrence.startDate)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">이후 모두</button>
            <button type="button" onClick={() => onDelete(occurrence.event.id, 'ALL')} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">전체 삭제</button>
          </div>
          <button type="button" onClick={() => onEdit(occurrence.event)} className="mt-2 w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">반복 일정 수정</button>
        </div>
      ) : null}
    </section>
  );
}

function ScheduleFormPanel({
  form,
  isPending,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: ScheduleForm;
  isPending: boolean;
  onChange: (patch: Partial<ScheduleForm>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-black text-slate-900">{form.id ? '일정 수정' : '일정 추가'}</h3>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-xs font-black text-slate-500">
          일정명
          <input value={form.title} onChange={(event) => onChange({ title: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">
            유형
            <select value={form.type} onChange={(event) => onChange({ type: event.target.value as ClubEventType })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500">
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500">
            시작일
            <input type="date" value={form.startDate} onChange={(event) => onChange({ startDate: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">
            종료일
            <input type="date" value={form.endDate} onChange={(event) => onChange({ endDate: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500" />
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500">
            반복
            <select value={form.recurrenceType} onChange={(event) => onChange({ recurrenceType: event.target.value as ScheduleRecurrenceType })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500">
              {Object.entries(RECURRENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">
            시작 시간 선택
            <input type="time" value={form.startTime} onChange={(event) => onChange({ startTime: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500" />
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500">
            종료 시간 선택
            <input type="time" value={form.endTime} onChange={(event) => onChange({ endTime: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500" />
          </label>
        </div>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          반복 종료일
          <input type="date" value={form.recurrenceUntil} disabled={form.recurrenceType === 'NONE'} onChange={(event) => onChange({ recurrenceUntil: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500 disabled:bg-slate-100" />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          장소
          <input value={form.location} onChange={(event) => onChange({ location: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500" />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          메모
          <textarea value={form.memo} onChange={(event) => onChange({ memo: event.target.value })} rows={3} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-500" />
        </label>
        <div className="flex gap-2">
          <button type="button" disabled={isPending} onClick={onSubmit} className="h-11 flex-1 rounded-xl bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-800 disabled:opacity-50">{form.id ? '수정' : '추가'}</button>
          {form.id ? <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700">취소</button> : null}
        </div>
      </div>
    </section>
  );
}

function buildCalendarDays(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function weekendTextClass(dayOfWeek: number) {
  if (dayOfWeek === 0) return 'text-rose-600';
  if (dayOfWeek === 6) return 'text-blue-600';
  return 'text-slate-800';
}

function expandOccurrences(events: ClubEvent[], monthStart: Date, monthEnd: Date) {
  const occurrences: CalendarOccurrence[] = [];
  const visibleStart = toDateInput(monthStart);
  const visibleEnd = toDateInput(monthEnd);

  events.forEach((event) => {
    const baseStart = event.start_date ?? event.event_date;
    const baseEnd = event.end_date ?? baseStart;
    const rangeDays = daysBetween(baseStart, baseEnd);
    const recurrenceEnd = event.recurrence_until ?? visibleEnd;
    const excludedStartDates = new Set(event.recurrence_exclusion_dates);
    let occurrenceStart = baseStart;

    while (occurrenceStart <= visibleEnd && occurrenceStart <= recurrenceEnd) {
      const occurrenceEnd = addDays(occurrenceStart, rangeDays);
      if (!excludedStartDates.has(occurrenceStart) && occurrenceEnd >= visibleStart && occurrenceStart <= visibleEnd) {
        let date = maxDateString(occurrenceStart, visibleStart);
        const lastDate = minDateString(occurrenceEnd, visibleEnd);
        while (date <= lastDate) {
          occurrences.push({
            event,
            date,
            startDate: occurrenceStart,
            endDate: occurrenceEnd,
            startTime: event.start_time,
            endTime: event.end_time,
          });
          date = addDays(date, 1);
        }
      }

      if (event.recurrence_type === 'NONE') break;
      occurrenceStart = nextOccurrenceDate(occurrenceStart, event.recurrence_type);
    }
  });

  return occurrences;
}

function compareOccurrences(a: CalendarOccurrence, b: CalendarOccurrence) {
  const aTime = a.startTime ?? '00:00';
  const bTime = b.startTime ?? '00:00';
  if (aTime !== bTime) return aTime.localeCompare(bTime);
  return a.event.title.localeCompare(b.event.title);
}

function nextOccurrenceDate(date: string, recurrenceType: ScheduleRecurrenceType) {
  const next = parseDateInput(date);
  if (recurrenceType === 'DAILY') next.setDate(next.getDate() + 1);
  if (recurrenceType === 'WEEKLY') next.setDate(next.getDate() + 7);
  if (recurrenceType === 'MONTHLY') next.setMonth(next.getMonth() + 1);
  return toDateInput(next);
}

function daysBetween(startDate: string, endDate: string) {
  return Math.max(0, Math.round((parseDateInput(endDate).getTime() - parseDateInput(startDate).getTime()) / 86400000));
}

function addDays(date: string, days: number) {
  const next = parseDateInput(date);
  next.setDate(next.getDate() + days);
  return toDateInput(next);
}

function maxDateString(left: string, right: string) {
  return left > right ? left : right;
}

function minDateString(left: string, right: string) {
  return left < right ? left : right;
}

function parseDateInput(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateRange(occurrence: CalendarOccurrence) {
  return occurrence.startDate === occurrence.endDate ? occurrence.startDate : `${occurrence.startDate}~${occurrence.endDate}`;
}

function formatOccurrenceTime(occurrence: CalendarOccurrence) {
  if (!occurrence.startTime || !occurrence.endTime) {
    return '종일';
  }
  if (occurrence.startDate === occurrence.endDate) {
    return `${occurrence.startTime}-${occurrence.endTime}`;
  }
  if (occurrence.date === occurrence.startDate) {
    return `${occurrence.startTime} 시작`;
  }
  if (occurrence.date === occurrence.endDate) {
    return `${occurrence.endTime} 종료`;
  }
  return '진행 중';
}

function occurrenceKey(occurrence: CalendarOccurrence) {
  return `${occurrence.event.id}-${occurrence.startDate}-${occurrence.date}`;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
