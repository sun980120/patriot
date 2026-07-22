import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { TacticsCommunityList, type TacticCommunityShare } from '@/components/tactics/tactics-community-list';
import { publicApiFetch } from '@/lib/backend-api';
import { loadCurrentProfile } from '@/lib/profile-data';
import { isTacticProject, type TacticProject } from '@/lib/tactics';

type TacticShareApiResponse = {
  publicId: string;
  projectId: string;
  title: string;
  authorName: string;
  active: boolean;
  snapshot: TacticProject;
  createdAt: string;
};

export default async function TacticsCommunityPage() {
  const [profileData, result] = await Promise.all([
    loadCurrentProfile(),
    publicApiFetch<TacticShareApiResponse[]>('/api/tactics/shares'),
  ]);
  const shares = result.ok && result.data
    ? result.data.filter((share): share is TacticCommunityShare => share.active && isTacticProject(share.snapshot))
    : [];
  const profile = profileData.mode === 'app' ? profileData.profile : null;
  const canModerate =
    profile?.app_role === 'admin' ||
    profile?.app_role === 'super_admin' ||
    profile?.member_grade === '간사';

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout={Boolean(profile)} profile={profile} />

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-soft sm:rounded-[36px] sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">
              Patriot Playbook
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              전술 보드 공유 게시판
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              공유 시작된 전술만 읽기 전용으로 표시됩니다. 공유 중단된 전술은 게시판과 링크에서
              더 이상 열리지 않습니다.
            </p>
          </div>
          <Link
            href="/tactics"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-800"
          >
            내 전술 보드
          </Link>
        </div>

        <TacticsCommunityList shares={shares} canModerate={canModerate} />
      </section>
    </main>
  );
}
