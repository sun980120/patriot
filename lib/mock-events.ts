import type { ClubEvent } from '@/lib/types';

export const mockEvents: ClubEvent[] = [
  { id: 'sample-training', title: '정기운동', type: 'TRAINING', status: 'PLANNED', event_date: '2026-05-03', start_date: '2026-05-03', end_date: '2026-05-03', start_time: '19:00:00', end_time: '21:00:00', start_at: null, end_at: null, recurrence_type: 'WEEKLY', recurrence_until: null, recurrence_exclusion_dates: [], location: '체육관', memo: null, created_at: null, participants: [] },
  { id: 'sample-tournament', title: '동호회 대회', type: 'TOURNAMENT', status: 'PLANNED', event_date: '2026-11-21', start_date: '2026-11-21', end_date: '2026-11-22', start_time: null, end_time: null, start_at: null, end_at: null, recurrence_type: 'NONE', recurrence_until: null, recurrence_exclusion_dates: [], location: '장소 추후 안내', memo: null, created_at: null, participants: [] },
];
