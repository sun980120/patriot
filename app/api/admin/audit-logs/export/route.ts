import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';

export async function GET(request: NextRequest) {
  const baseUrl = getBackendBaseUrl();
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!baseUrl || !token) {
    return NextResponse.json({ message: '감사 로그 내보내기 권한이 없습니다.' }, { status: 401 });
  }

  const backendUrl = new URL('/api/admin/audit-logs/export', baseUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const response = await fetch(backendUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ message: '감사 로그 CSV를 생성하지 못했습니다.' }, { status: response.status });
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'text/csv; charset=utf-8',
      'Content-Disposition': response.headers.get('Content-Disposition') ?? 'attachment; filename="audit-logs.csv"',
    },
  });
}
