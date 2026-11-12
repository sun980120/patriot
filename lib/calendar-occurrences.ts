import type { ClubEvent, ScheduleRecurrenceType } from '@/lib/types';

export type CalendarOccurrence = {
  event: ClubEvent;
  date: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
};

export function expandOccurrences(events: ClubEvent[], monthStart: Date, monthEnd: Date) {
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

export function compareOccurrences(a: CalendarOccurrence, b: CalendarOccurrence) {
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

export function addDays(date: string, days: number) {
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

export function parseDateInput(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateRange(occurrence: CalendarOccurrence) {
  return occurrence.startDate === occurrence.endDate ? occurrence.startDate : `${occurrence.startDate}~${occurrence.endDate}`;
}

export function formatOccurrenceTime(occurrence: CalendarOccurrence) {
  if (!occurrence.startTime || !occurrence.endTime) {
    return '종일';
  }
  const startTime = formatTime(occurrence.startTime);
  const endTime = formatTime(occurrence.endTime);
  if (occurrence.startDate === occurrence.endDate) {
    return `${startTime}-${endTime}`;
  }
  if (occurrence.date === occurrence.startDate) {
    return `${startTime} 시작`;
  }
  if (occurrence.date === occurrence.endDate) {
    return `${endTime} 종료`;
  }
  return '진행 중';
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

export function occurrenceKey(occurrence: CalendarOccurrence) {
  return `${occurrence.event.id}-${occurrence.startDate}-${occurrence.date}`;
}

export function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validCalendarDate(input?: string) {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return undefined;
  const date = parseDateInput(input);
  return Number.isFinite(date.getTime()) && toDateInput(date) === input ? input : undefined;
}
