'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { publicApiFetch, serverApiFetch } from '@/lib/backend-api';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';

type ActionResult = {
  ok: boolean;
  message?: string;
};

type TacticShareActionResult = ActionResult & {
  shareId?: string;
};

type TacticProjectActionResult = ActionResult & {
  projects?: unknown[];
  project?: unknown;
};

function refreshHome() {
  revalidatePath('/');
  revalidatePath('/login');
  revalidatePath('/signup');
  revalidatePath('/dashboard');
  revalidatePath('/member');
  revalidatePath('/admin/members');
  revalidatePath('/admin/finance');
  revalidatePath('/admin/audit-logs');
  revalidatePath('/admin/events');
  revalidatePath('/notifications');
}

export async function loginAction(username: string, password: string, rememberMe = false): Promise<ActionResult> {
  const result = await publicApiFetch<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    refreshToken?: string | null;
    refreshExpiresIn?: number;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, rememberMe }),
  });

  if (!result.ok || !result.data) {
    return { ok: false, message: result.message ?? '로그인에 실패했습니다.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, result.data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: result.data.expiresIn,
  });

  if (rememberMe && result.data.refreshToken && result.data.refreshExpiresIn) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, result.data.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: result.data.refreshExpiresIn,
    });
  } else {
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
  }

  refreshHome();
  return { ok: true };
}

export async function signupAction(input: {
  fullName: string;
  username: string;
  phoneNumber: string;
  address: string;
  addressDetail: string;
  birthDate: string;
  password: string;
}): Promise<ActionResult> {
  const result = await publicApiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '가입 신청에 실패했습니다.' };
  }

  return { ok: true, message: '가입 요청이 접수되었습니다.' };
}

export async function checkUsernameAvailabilityAction(username: string): Promise<ActionResult> {
  const result = await serverApiFetch<{ available: boolean; message: string }>(
    `/api/auth/check-username?username=${encodeURIComponent(username)}`
  );

  if (!result.ok) {
    return { ok: false, message: result.message ?? '아이디 확인에 실패했습니다.' };
  }

  return { ok: Boolean(result.data?.available), message: result.data?.message };
}

export async function updateProfileAction(input: {
  username: string;
  address: string;
  addressDetail: string;
  birthDate: string;
}): Promise<ActionResult> {
  const result = await serverApiFetch('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '사용자 정보 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: '사용자 정보가 변경되었습니다.' };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  refreshHome();
}

export async function createFiscalYearAction(year: number): Promise<ActionResult> {
  const result = await serverApiFetch('/api/years', {
    method: 'POST',
    body: JSON.stringify({ year }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '연도 개설에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function togglePaymentAction(args: { fiscalYearId: string; memberId: string; month: number; paid: boolean }): Promise<ActionResult> {
  const result = await serverApiFetch('/api/payments/toggle', {
    method: 'PATCH',
    body: JSON.stringify({
      fiscalYearId: args.fiscalYearId,
      memberId: args.memberId,
      month: args.month,
    }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '납부 상태 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function updateManualPaymentExemptionAction(args: {
  fiscalYearId: string;
  memberId: string;
  month: number;
  exempt: boolean;
  reason?: string;
}): Promise<ActionResult> {
  const result = await serverApiFetch('/api/payments/exemption', {
    method: 'PATCH',
    body: JSON.stringify({
      fiscalYearId: args.fiscalYearId,
      memberId: args.memberId,
      month: args.month,
      exempt: args.exempt,
      reason: args.reason,
    }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '수동 면제 설정 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function getVapidPublicKeyAction(): Promise<ActionResult & { publicKey?: string; configured?: boolean }> {
  const result = await serverApiFetch<{ configured: boolean; publicKey: string | null }>('/api/notifications/vapid-public-key');

  if (!result.ok) {
    return { ok: false, configured: false, message: result.message ?? '알림 설정을 확인할 수 없습니다.' };
  }

  return {
    ok: Boolean(result.data?.configured && result.data.publicKey),
    configured: Boolean(result.data?.configured),
    publicKey: result.data?.publicKey ?? undefined,
    message: result.data?.configured ? undefined : 'VAPID 키가 설정되지 않았습니다.',
  };
}

export async function savePushSubscriptionAction(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}): Promise<ActionResult> {
  const result = await serverApiFetch('/api/notifications/subscriptions', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '알림 구독 저장에 실패했습니다.' };
  }

  return { ok: true, message: '알림 구독이 저장되었습니다.' };
}

export async function sendTestPushNotificationAction(): Promise<ActionResult> {
  const result = await serverApiFetch<{ sentCount: number; failedCount: number; message: string }>('/api/notifications/test', {
    method: 'POST',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '테스트 알림 발송에 실패했습니다.' };
  }

  return {
    ok: (result.data?.sentCount ?? 0) > 0,
    message: result.data?.message ?? '테스트 알림을 발송했습니다.',
  };
}

export async function sendMonthlyDuesPushReminderAction(): Promise<ActionResult> {
  const result = await serverApiFetch<{ targetCount: number; sentCount: number; failedCount: number; message: string }>('/api/notifications/monthly-dues/remind', {
    method: 'POST',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '월회비 푸시 알림 발송에 실패했습니다.' };
  }

  const targetCount = result.data?.targetCount ?? 0;
  const sentCount = result.data?.sentCount ?? 0;
  const failedCount = result.data?.failedCount ?? 0;

  if (targetCount > 0 && sentCount === 0 && failedCount === 0) {
    return {
      ok: true,
      message: `앱 내부 알림 ${targetCount}건을 저장했습니다. 푸시 구독된 기기는 아직 없습니다.`,
    };
  }

  return {
    ok: true,
    message: `${result.data?.message ?? '월회비 알림을 처리했습니다.'} 앱 알림 ${targetCount}건, 푸시 성공 ${sentCount}건, 실패 ${failedCount}건`,
  };
}

export async function getNotificationUnreadCountAction(): Promise<ActionResult & { unreadCount?: number }> {
  const result = await serverApiFetch<{ unreadCount: number }>('/api/app-notifications/unread-count');

  if (!result.ok) {
    return { ok: false, unreadCount: 0, message: result.message ?? '알림 개수를 확인할 수 없습니다.' };
  }

  return { ok: true, unreadCount: result.data?.unreadCount ?? 0 };
}

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/app-notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '알림 읽음 처리에 실패했습니다.' };
  }

  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const result = await serverApiFetch('/api/app-notifications/read-all', {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '알림 읽음 처리에 실패했습니다.' };
  }

  return { ok: true };
}

export async function deleteNotificationAction(notificationId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/app-notifications/${notificationId}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '알림 삭제에 실패했습니다.' };
  }

  return { ok: true, message: result.message ?? '알림을 삭제했습니다.' };
}

export async function deleteAllNotificationsAction(): Promise<ActionResult> {
  const result = await serverApiFetch('/api/app-notifications', {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '알림 전체 삭제에 실패했습니다.' };
  }

  return { ok: true, message: result.message ?? '모든 알림을 삭제했습니다.' };
}

export async function approveMemberAction(memberId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/admin/members/${memberId}/approve`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '회원 승인에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function deletePendingMemberAction(memberId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/admin/members/${memberId}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '가입 신청 삭제에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function deactivateMemberAction(memberId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/admin/members/${memberId}/deactivate`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '회원 비활성화에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function activateMemberAction(memberId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/admin/members/${memberId}/activate`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '회원 활성화에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function promoteToAdminAction(memberId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/admin/members/${memberId}/promote-admin`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '간사 승격에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function adminToPromoteAction(memberId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/admin/members/${memberId}/admin-promote`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '간사 제거에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function resetMemberPasswordAction(memberId: string): Promise<ActionResult> {
  const result = await serverApiFetch<{ message?: string }>(`/api/admin/members/${memberId}/reset-password`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '비밀번호 초기화에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: result.data?.message ?? '비밀번호가 기본값으로 초기화되었습니다.' };
}

export async function updateMemberFeeExemptionAction(memberId: string, months: number): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/admin/members/${memberId}/fee-exemption`, {
    method: 'PATCH',
    body: JSON.stringify({ months }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '회비 면제 설정 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: '회비 면제 설정이 저장되었습니다.' };
}

export async function changePasswordAction(input: { currentPassword: string; newPassword: string }): Promise<ActionResult> {
  const result = await serverApiFetch<{ message?: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '비밀번호 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: result.data?.message ?? '비밀번호가 변경되었습니다.' };
}

export async function createIncomeEntryAction(args: { fiscalYearId: string; label: string; amount: number; memo?: string | null }): Promise<ActionResult> {
  const result = await serverApiFetch('/api/finance/incomes', {
    method: 'POST',
    body: JSON.stringify(args),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '세입 추가에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function createExpenseEntryAction(args: { fiscalYearId: string; label: string; amount: number; memo?: string | null }): Promise<ActionResult> {
  const result = await serverApiFetch('/api/finance/expenses', {
    method: 'POST',
    body: JSON.stringify(args),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '지출 추가에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function deleteIncomeEntryAction(id: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/finance/incomes/${id}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '세입 삭제에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function deleteExpenseEntryAction(id: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/finance/expenses/${id}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '지출 삭제에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function createAdditionalChargeGroupAction(args: {
  fiscalYearId: string;
  clubEventId?: string | null;
  title: string;
  category: 'JOIN_FEE' | 'UNIFORM_FEE' | 'DINNER_FEE' | 'TOURNAMENT_FEE' | 'ETC_FEE';
  eventDate?: string | null;
  supportAmount: number;
  actualCost: number;
  memo?: string | null;
  participantMemberIds: string[];
  amountPerParticipant: number;
}): Promise<ActionResult> {
  const result = await serverApiFetch('/api/additional-charges', {
    method: 'POST',
    body: JSON.stringify(args),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '추가 비용 이벤트 생성에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function toggleAdditionalChargePaidAction(chargeId: string, paid: boolean): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/additional-charges/${chargeId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ paid }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '추가 비용 납부 상태 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function updateAdditionalChargeAmountAction(args: {
  chargeId: string;
  amount: number;
  adjustmentReason?: string | null;
}): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/additional-charges/${args.chargeId}/amount`, {
    method: 'PATCH',
    body: JSON.stringify({
      amount: args.amount,
      adjustmentReason: args.adjustmentReason ?? null,
    }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '참가자별 추가 비용 금액 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function settleAdditionalChargeSurplusAction(chargeGroupId: string, actualCost: number): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/additional-charges/${chargeGroupId}/settle`, {
    method: 'PATCH',
    body: JSON.stringify({ actualCost }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '잔액 세입 처리에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function reopenAdditionalChargeSettlementAction(chargeGroupId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/additional-charges/${chargeGroupId}/reopen`, {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '정산 수정 모드 전환에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function deleteAdditionalChargeGroupAction(chargeGroupId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/additional-charges/${chargeGroupId}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '추가 비용 이벤트 삭제에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
}

export async function sendAdditionalChargeReminderAction(chargeGroupId: string): Promise<ActionResult> {
  const result = await serverApiFetch<{ targetCount: number; sentCount: number; failedCount: number; message: string }>(
    `/api/additional-charges/${chargeGroupId}/remind`,
    { method: 'POST' }
  );

  if (!result.ok) {
    return { ok: false, message: result.message ?? '추가비용 푸시 알림 발송에 실패했습니다.' };
  }

  const targetCount = result.data?.targetCount ?? 0;
  const sentCount = result.data?.sentCount ?? 0;
  const failedCount = result.data?.failedCount ?? 0;

  if (targetCount > 0 && sentCount === 0 && failedCount === 0) {
    return {
      ok: true,
      message: `앱 내부 알림 ${targetCount}건을 저장했습니다. 푸시 구독된 기기는 아직 없습니다.`,
    };
  }

  return {
    ok: true,
    message: `${result.data?.message ?? '추가비용 알림을 처리했습니다.'} 앱 알림 ${targetCount}건, 푸시 성공 ${sentCount}건, 실패 ${failedCount}건`,
  };
}

export async function sendAdditionalChargeFiscalYearReminderAction(fiscalYearId: string): Promise<ActionResult> {
  const result = await serverApiFetch<{ targetCount: number; sentCount: number; failedCount: number; message: string }>(
    `/api/additional-charges/remind?fiscalYearId=${encodeURIComponent(fiscalYearId)}`,
    { method: 'POST' }
  );

  if (!result.ok) {
    return { ok: false, message: result.message ?? '추가비용 푸시 알림 발송에 실패했습니다.' };
  }

  const targetCount = result.data?.targetCount ?? 0;
  const sentCount = result.data?.sentCount ?? 0;
  const failedCount = result.data?.failedCount ?? 0;

  if (targetCount > 0 && sentCount === 0 && failedCount === 0) {
    return {
      ok: true,
      message: `앱 내부 알림 ${targetCount}건을 저장했습니다. 푸시 구독된 기기는 아직 없습니다.`,
    };
  }

  return {
    ok: true,
    message: `${result.data?.message ?? '추가비용 알림을 처리했습니다.'} 앱 알림 ${targetCount}건, 푸시 성공 ${sentCount}건, 실패 ${failedCount}건`,
  };
}

export async function createClubEventAction(args: {
  title: string;
  type: 'TOURNAMENT' | 'TRAINING' | 'DINNER' | 'MEETING' | 'ETC';
  eventDate: string;
  location?: string | null;
  memo?: string | null;
  participantMemberIds: string[];
}): Promise<ActionResult> {
  const result = await serverApiFetch('/api/events', {
    method: 'POST',
    body: JSON.stringify(args),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '이벤트 생성에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: '이벤트가 생성되었습니다.' };
}

export async function updateClubEventAction(eventId: string, args: {
  title: string;
  type: 'TOURNAMENT' | 'TRAINING' | 'DINNER' | 'MEETING' | 'ETC';
  eventDate: string;
  location?: string | null;
  memo?: string | null;
  participantMemberIds: string[];
}): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(args),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '이벤트 수정에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: '이벤트가 수정되었습니다.' };
}

export async function updateClubEventStatusAction(
  eventId: string,
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED'
): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/events/${eventId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '이벤트 상태 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: '이벤트 상태가 변경되었습니다.' };
}

export async function updateEventParticipantAttendanceAction(
  eventId: string,
  memberId: string,
  attendanceStatus: 'REGISTERED' | 'PRESENT' | 'ABSENT'
): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/events/${eventId}/participants/${memberId}/attendance`, {
    method: 'PATCH',
    body: JSON.stringify({ attendanceStatus }),
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '참가자 출석 상태 변경에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: '참가자 출석 상태가 변경되었습니다.' };
}

export async function deleteClubEventAction(eventId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/events/${eventId}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '이벤트 삭제에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true, message: '이벤트가 삭제되었습니다.' };
}

export async function createTacticShareAction(input: {
  title: string;
  snapshot: unknown;
}): Promise<TacticShareActionResult> {
  const result = await serverApiFetch<{ publicId: string }>('/api/tactics/shares', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok || !result.data?.publicId) {
    return { ok: false, message: result.message ?? '공유 링크를 만들지 못했습니다.' };
  }

  return { ok: true, shareId: result.data.publicId };
}

export async function stopTacticShareAction(publicId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/tactics/shares/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '공유를 중단하지 못했습니다.' };
  }

  return { ok: true, message: '전술 보드 공유를 중단했습니다.' };
}

export async function listTacticProjectsAction(): Promise<TacticProjectActionResult> {
  const result = await serverApiFetch<Array<{ snapshot: unknown }>>('/api/tactics/projects');

  if (!result.ok) {
    return { ok: false, message: result.message ?? '저장된 전술을 불러오지 못했습니다.' };
  }

  return {
    ok: true,
    projects: result.data?.map((item) => item.snapshot) ?? [],
  };
}

export async function listDeletedTacticProjectsAction(): Promise<TacticProjectActionResult> {
  const result = await serverApiFetch<Array<{ snapshot: unknown }>>('/api/tactics/projects/trash');

  if (!result.ok) {
    return { ok: false, message: result.message ?? '삭제 보관함을 불러오지 못했습니다.' };
  }

  return {
    ok: true,
    projects: result.data?.map((item) => item.snapshot) ?? [],
  };
}

export async function saveTacticProjectAction(input: {
  projectId: string;
  title: string;
  snapshot: unknown;
}): Promise<TacticProjectActionResult> {
  const result = await serverApiFetch<{ snapshot: unknown }>(
    `/api/tactics/projects/${encodeURIComponent(input.projectId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        title: input.title,
        snapshot: input.snapshot,
      }),
    },
  );

  if (!result.ok || !result.data) {
    return { ok: false, message: result.message ?? '전술을 저장하지 못했습니다.' };
  }

  return { ok: true, project: result.data.snapshot };
}

export async function deleteTacticProjectAction(projectId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/tactics/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '전술을 삭제하지 못했습니다.' };
  }

  return { ok: true, message: '전술을 삭제 보관함으로 이동했습니다.' };
}

export async function restoreTacticProjectAction(projectId: string): Promise<TacticProjectActionResult> {
  const result = await serverApiFetch<{ snapshot: unknown }>(
    `/api/tactics/projects/${encodeURIComponent(projectId)}/restore`,
    { method: 'PATCH' },
  );

  if (!result.ok || !result.data) {
    return { ok: false, message: result.message ?? '전술을 복구하지 못했습니다.' };
  }

  return { ok: true, project: result.data.snapshot };
}

export async function purgeTacticProjectAction(projectId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/tactics/projects/${encodeURIComponent(projectId)}/purge`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '전술을 완전히 삭제하지 못했습니다.' };
  }

  return { ok: true, message: '전술을 완전히 삭제했습니다.' };
}
