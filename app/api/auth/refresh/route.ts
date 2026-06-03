import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';

type RefreshResponse = {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string | null;
  refreshExpiresIn?: number;
};

function backendUrl(path: string) {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    throw new Error('PATRIOT_API_BASE_URL 환경변수가 필요합니다.');
  }
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
}

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(backendUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      const response = NextResponse.json({ ok: false }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    const payload = (await backendResponse.json()) as RefreshResponse;
    if (!payload.accessToken || !payload.expiresIn || !payload.refreshToken || !payload.refreshExpiresIn) {
      const response = NextResponse.json({ ok: false }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: payload.expiresIn,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, payload.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: payload.refreshExpiresIn,
    });

    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
