import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AutoLoginRedirect } from '@/components/auto-login-redirect';
import { AuthCard } from '@/components/auth-card';
import { SiteNav } from '@/components/site-nav';
import { loadCurrentProfile } from '@/lib/profile-data';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const hasAccessToken = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);
  const hasRefreshToken = Boolean(cookieStore.get(REFRESH_TOKEN_COOKIE)?.value);
  const data = hasAccessToken && !hasRefreshToken
    ? await loadCurrentProfile()
    : { mode: 'guest' as const };

  if (data.mode === 'app') {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AutoLoginRedirect enabled={hasRefreshToken}>
        <SiteNav profile={null} />
        <AuthCard />
      </AutoLoginRedirect>
    </main>
  );
}
