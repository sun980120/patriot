export const ACCESS_TOKEN_COOKIE = 'patriot_access_token';

export function getBackendBaseUrl() {
  return process.env.PATRIOT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
}
