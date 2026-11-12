import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { AppShell } from '@/components/app-shell';
import { PageHeading } from '@/components/ui/page-heading';
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

  const content = <section className="workspace-page">
    <PageHeading title="전술 공유 게시판" description={`공유 전술 ${shares.length}개`} actions={<Link href="/tactics" className="inline-flex min-h-10 items-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">내 전술 보드</Link>} />
    <TacticsCommunityList shares={shares} canModerate={canModerate} />
  </section>;
  return profile ? <AppShell sampleData={profileData.mode === 'app' && profileData.source === 'mock'} profile={profile} title="전술 공유">{content}</AppShell>
    : <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><SiteNav profile={null} />{content}</main>;

}
