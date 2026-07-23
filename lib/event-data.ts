import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/backend-api';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';
import type { ClubEvent } from '@/lib/types';

type ClubEventApiResponse = {
  id: string;
  title: string;
  type: ClubEvent['type'];
  status: ClubEvent['status'];
  eventDate: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  startAt: string | null;
  endAt: string | null;
  recurrenceType: ClubEvent['recurrence_type'];
  recurrenceUntil: string | null;
  recurrenceExclusionDates: string[] | null;
  location: string | null;
  memo: string | null;
  createdAt: string | null;
  participants: Array<{
    memberId: string;
    memberName: string;
    memberUsername: string | null;
    attendanceStatus: ClubEvent['participants'][number]['attendance_status'];
  }>;
};

function toClubEvent(row: ClubEventApiResponse): ClubEvent {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    event_date: row.eventDate,
    start_date: row.startDate,
    end_date: row.endDate,
    start_time: row.startTime,
    end_time: row.endTime,
    start_at: row.startAt,
    end_at: row.endAt,
    recurrence_type: row.recurrenceType,
    recurrence_until: row.recurrenceUntil,
    recurrence_exclusion_dates: row.recurrenceExclusionDates ?? [],
    location: row.location,
    memo: row.memo,
    created_at: row.createdAt,
    participants: row.participants.map((participant) => ({
      member_id: participant.memberId,
      member_name: participant.memberName,
      member_username: participant.memberUsername,
      attendance_status: participant.attendanceStatus,
    })),
  };
}

export async function loadClubEvents(): Promise<{ ok: true; events: ClubEvent[] } | { ok: false; message: string }> {
  if (!getBackendBaseUrl()) {
    return { ok: false, message: 'PATRIOT_API_BASE_URL 환경변수가 필요합니다.' };
  }

  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return { ok: false, message: '로그인이 필요합니다.' };
  }

  const result = await serverApiFetch<ClubEventApiResponse[]>('/api/events');
  if (!result.ok || !result.data) {
    return { ok: false, message: result.message ?? '이벤트 목록을 불러오지 못했습니다.' };
  }

  return { ok: true, events: result.data.map(toClubEvent) };
}
