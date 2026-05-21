import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
};

function normalizeUrl(path: string) {
  const base = getBackendBaseUrl();
  if (!base) {
    throw new Error('PATRIOT_API_BASE_URL 환경변수가 필요합니다.');
  }
  return `${base.replace(/\/$/, '')}${path}`;
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function serverApiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
    const headers = new Headers(init.headers ?? {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(normalizeUrl(path), {
      ...init,
      headers,
      cache: 'no-store',
    });

    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: payload?.message ?? payload?.error ?? '요청 처리에 실패했습니다.',
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload as T,
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      message: error instanceof Error ? error.message : '백엔드 서버에 연결할 수 없습니다.',
    };
  }
}

export async function publicApiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init.headers ?? {});
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(normalizeUrl(path), {
      ...init,
      headers,
      cache: 'no-store',
    });

    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: payload?.message ?? payload?.error ?? '요청 처리에 실패했습니다.',
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload as T,
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      message: error instanceof Error ? error.message : '백엔드 서버에 연결할 수 없습니다.',
    };
  }
}
