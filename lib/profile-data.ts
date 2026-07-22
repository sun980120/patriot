import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/backend-api';
import { mockBundle } from '@/lib/mock-data';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';
import type { Profile } from '@/lib/types';

export type MemberSummaryApiResponse = {
  id: string;
  fullName: string;
  email: string | null;
  username: string | null;
  phoneNumber: string | null;
  address: string | null;
  addressDetail: string | null;
  birthDate: string | null;
  appRole: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  memberGrade: Profile['member_grade'];
  gradeSource: 'AUTO' | 'MANUAL';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  active: boolean;
  feeExemptionMonths: number;
  feeExemptionStartDate: string | null;
  joinedAt: string | null;
};

export function toProfile(row: MemberSummaryApiResponse): Profile {
  const baseAddress = row.address ?? null;
  const detailAddress = row.addressDetail ?? null;

  return {
    id: row.id,
    full_name: row.fullName,
    email: row.email ?? null,
    username: row.username ?? null,
    phone_number: row.phoneNumber ?? null,
    address: [baseAddress, detailAddress].filter(Boolean).join(', ') || null,
    base_address: baseAddress,
    detail_address: detailAddress,
    birth_date: row.birthDate ?? null,
    app_role: row.appRole.toLowerCase() as Profile['app_role'],
    member_grade: row.memberGrade,
    grade_source: row.gradeSource.toLowerCase() as Profile['grade_source'],
    approval_status: row.approvalStatus.toLowerCase() as Profile['approval_status'],
    is_active: row.active,
    fee_exemption_months: row.feeExemptionMonths ?? 0,
    fee_exemption_start_date: row.feeExemptionStartDate ?? null,
    joined_at: row.joinedAt ?? null,
  };
}

export async function loadCurrentProfile(): Promise<
  { mode: 'guest' } | { mode: 'app'; profile: Profile; source: 'mock' | 'spring' }
> {
  if (!getBackendBaseUrl()) {
    return process.env.ENABLE_MOCK_FALLBACK === 'true' && mockBundle.profile
      ? { mode: 'app', profile: mockBundle.profile, source: 'mock' }
      : { mode: 'guest' };
  }

  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return { mode: 'guest' };
  }

  const result = await serverApiFetch<MemberSummaryApiResponse>('/api/auth/me');
  if (!result.ok || !result.data) {
    return { mode: 'guest' };
  }

  return {
    mode: 'app',
    profile: toProfile(result.data),
    source: 'spring',
  };
}
