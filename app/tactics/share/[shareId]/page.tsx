import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { TacticShareViewer } from '@/components/tactics/tactic-share-viewer';
import { publicApiFetch } from '@/lib/backend-api';
import { CLUB_NAME } from '@/lib/constants';
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
  const result = await publicApiFetch<TacticShareApiResponse>(
    `/api/tactics/shares/${encodeURIComponent(shareId)}`,
  );

  if (!result.ok || !result.data || !isTacticProject(result.data.snapshot)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-[28px] border border-white/70 bg-white/90 px-5 py-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Patriot Club Finance
            </p>
            <h1 className="mt-1 text-xl font-black text-slate-900">
              {CLUB_NAME} 공유 전술 보드
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href={'/tactics/community' as Route}
              className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-brand-100 hover:text-brand-800"
            >
              공유 게시판
            </Link>
            <Link
              href={'/tactics' as Route}
              className="rounded-full bg-brand-700 px-4 py-2 font-semibold text-white transition hover:bg-brand-800"
            >
              내 전술 보드
            </Link>
          </nav>
        </div>
      </header>
      <TacticShareViewer project={result.data.snapshot} />
    </main>
  );
}
