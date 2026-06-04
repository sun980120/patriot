'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { publicApiFetch, serverApiFetch } from '@/lib/backend-api';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';

type ActionResult = {
  ok: boolean;
  message?: string;
};

function refreshHome() {
  revalidatePath('/');
  revalidatePath('/login');
  revalidatePath('/signup');
  revalidatePath('/dashboard');
  revalidatePath('/member');
  revalidatePath('/admin/members');
  revalidatePath('/admin/finance');
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

  refreshHome();
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const result = await serverApiFetch('/api/app-notifications/read-all', {
    method: 'PATCH',
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? '알림 읽음 처리에 실패했습니다.' };
  }

  refreshHome();
  return { ok: true };
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


export async function settleAdditionalChargeSurplusAction(chargeGroupId: string): Promise<ActionResult> {
  const result = await serverApiFetch(`/api/additional-charges/${chargeGroupId}/settle`, {
    method: 'PATCH',
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
