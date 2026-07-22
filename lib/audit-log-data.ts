import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/backend-api';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';
import type { AuditLog } from '@/lib/types';

export type AuditLogFilters = {
  action?: string;
  actorId?: string;
  targetType?: string;
  targetKeyword?: string;
  fromDate?: string;
  toDate?: string;
  limit?: string;
};

type AuditLogApiResponse = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  actorId: string | null;
  actorName: string | null;
  detail: string | null;
  createdAt: string | null;
};

function toAuditLog(row: AuditLogApiResponse): AuditLog {
  return {
    id: row.id,
    action: row.action,
    target_type: row.targetType,
    target_id: row.targetId,
    target_name: row.targetName,
    actor_id: row.actorId,
    actor_name: row.actorName,
    detail: row.detail,
    created_at: row.createdAt,
  };
}

export async function loadAuditLogs(limit = 100): Promise<{ ok: true; logs: AuditLog[] } | { ok: false; message: string }> {
  return loadAuditLogsByFilters({ limit: String(limit) });
}

export async function loadAuditLogsByFilters(filters: AuditLogFilters): Promise<{ ok: true; logs: AuditLog[] } | { ok: false; message: string }> {
  if (!getBackendBaseUrl()) {
    return { ok: false, message: 'PATRIOT_API_BASE_URL 환경변수가 필요합니다.' };
  }

  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return { ok: false, message: '로그인이 필요합니다.' };
  }

  const result = await serverApiFetch<AuditLogApiResponse[]>(`/api/admin/audit-logs?${toQueryString(filters)}`);
  if (!result.ok || !result.data) {
    return { ok: false, message: result.message ?? '감사 로그를 불러오지 못했습니다.' };
  }

  return { ok: true, logs: result.data.map(toAuditLog) };
}

export function buildAuditLogExportPath(filters: AuditLogFilters) {
  return `/api/admin/audit-logs/export?${toQueryString({
    action: filters.action,
    actorId: filters.actorId,
    targetType: filters.targetType,
    targetKeyword: filters.targetKeyword,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  })}`;
}

function toQueryString(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value.trim()) {
      params.set(key, value.trim());
    }
  });
  return params.toString();
}
