import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';

export async function GET(request: NextRequest) {
  const baseUrl = getBackendBaseUrl();
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const fiscalYearId = request.nextUrl.searchParams.get('fiscalYearId');

  if (!baseUrl || !token || !fiscalYearId) {
    return NextResponse.json({ message: '재정 리포트를 내보낼 수 없습니다.' }, { status: 400 });
  }

  const backendUrl = new URL('/api/finance/reports/export.xlsx', baseUrl);
  backendUrl.searchParams.set('fiscalYearId', fiscalYearId);

  const response = await fetch(backendUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ message: '재정 리포트 Excel을 생성하지 못했습니다.' }, { status: response.status });
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': response.headers.get('Content-Disposition') ?? 'attachment; filename="finance-report.xlsx"',
    },
  });
}
