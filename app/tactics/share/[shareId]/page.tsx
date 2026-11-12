import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { TacticShareViewer } from '@/components/tactics/tactic-share-viewer';
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

export default async function TacticSharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const [profileData, result] = await Promise.all([
    loadCurrentProfile(),
    publicApiFetch<TacticShareApiResponse>(`/api/tactics/shares/${encodeURIComponent(shareId)}`),
  ]);

  if (!result.ok || !result.data || !result.data.active || !isTacticProject(result.data.snapshot)) {
    notFound();
  }

  const share = result.data;
  const recordedAt = /(?:Z|[+-]\d\d:?\d\d)$/.test(share.createdAt) ? share.createdAt : `${share.createdAt}+09:00`;
  const date = new Date(recordedAt);
  const dateLabel = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
  const content = <section className="workspace-page min-w-0">
    <Link href="/tactics/community" className="mb-5 inline-flex min-h-9 items-center gap-1 text-xs text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" />전술 공유 게시판</Link>
    <TacticShareViewer key={shareId} project={share.snapshot} description={[`작성자 ${share.authorName || '미상'}`, dateLabel].filter(Boolean).join(' · ')} />
  </section>;

  if (profileData.mode === 'app') {
    return <AppShell sampleData={profileData.source === 'mock'} profile={profileData.profile} title="공유 전술 상세">{content}</AppShell>;
  }

  return <div className="min-h-dvh bg-white text-slate-900">
    <header className="border-b border-slate-200"><div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <Link href="/" aria-label="패트리어트 홈" className="flex items-center gap-2"><img src="/icon-192.png" alt="" className="h-10 w-10 object-contain" /><span><strong className="block text-sm font-bold">PATRIOT</strong><span className="text-xs text-slate-500">Floorball Club</span></span></Link>
      <Link href="/login" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-800">로그인<ArrowUpRight className="h-4 w-4" /></Link>
    </div></header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{content}</main>
  </div>;
}
