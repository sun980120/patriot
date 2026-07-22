'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { stopTacticShareAction } from '@/app/actions';
import type { TacticProject } from '@/lib/tactics';

export type TacticCommunityShare = {
  publicId: string;
  projectId: string;
  title: string;
  authorName: string;
  active: boolean;
  snapshot: TacticProject;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function TacticsCommunityList({
  shares,
  canModerate,
}: {
  shares: TacticCommunityShare[];
  canModerate: boolean;
}) {
  const [items, setItems] = useState(shares);
  const [query, setQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState<'all' | 'board-1' | 'board-2'>('all');
  const [sortMode, setSortMode] = useState<'latest' | 'title'>('latest');
  const [message, setMessage] = useState('');
  const [confirmShare, setConfirmShare] = useState<TacticCommunityShare | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matched = items.filter((item) => {
      const matchesBoard = boardFilter === 'all' || item.snapshot.boardType === boardFilter;
      const matchesQuery =
        !normalizedQuery ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.authorName.toLowerCase().includes(normalizedQuery);

      return matchesBoard && matchesQuery;
    });

    return [...matched].sort((left, right) => {
      if (sortMode === 'title') {
        return left.title.localeCompare(right.title, 'ko-KR');
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [boardFilter, items, query, sortMode]);

  function stopShare(publicId: string) {
    setPendingId(publicId);
    setMessage('');
    startTransition(async () => {
      const result = await stopTacticShareAction(publicId);
      if (!result.ok) {
        setMessage(result.message ?? '공유를 중단하지 못했습니다.');
        setPendingId(null);
        return;
      }

      setItems((current) => current.filter((item) => item.publicId !== publicId));
      setConfirmShare(null);
      setMessage('공유를 중단했습니다.');
      setPendingId(null);
    });
  }

  if (!items.length) {
    return (
      <div className="mt-6 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="font-black text-slate-800">아직 공유 중인 전술 보드가 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">
          내 전술 보드에서 공유 시작을 누르면 이 게시판에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_160px]">
          <label className="relative block">
            <span className="sr-only">전술 검색</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="전술명 또는 작성자 검색"
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
            />
          </label>
          <label className="relative block">
            <span className="sr-only">보드 유형</span>
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={boardFilter}
              onChange={(event) => setBoardFilter(event.target.value as typeof boardFilter)}
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-400"
            >
              <option value="all">전체 보드</option>
              <option value="board-1">전술 보드 1</option>
              <option value="board-2">전술 보드 2</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">정렬</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as typeof sortMode)}
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-400"
            >
              <option value="latest">최신순</option>
              <option value="title">이름순</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs font-bold text-slate-500">
          {filteredItems.length}개 공유 전술 표시 중
        </p>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
          {message}
        </p>
      ) : null}
      {filteredItems.length ? (
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((share) => (
          <article
            key={share.publicId}
            className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-soft"
          >
            <Link href={`/tactics/share/${share.publicId}` as Route} className="group block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-700">
                    {share.snapshot.boardType === 'board-2' ? '전술 보드 2' : '전술 보드 1'}
                  </p>
                  <h2 className="mt-2 truncate text-lg font-black text-slate-900 group-hover:text-brand-800">
                    {share.title}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                  공유 중
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                <span className="truncate">작성자: {share.authorName}</span>
                <span className="text-right">{formatDate(share.createdAt)}</span>
                <span>{share.snapshot.scenes.length}개 장면</span>
                <span className="text-right">
                  {share.snapshot.scenes.reduce((sum, scene) => sum + scene.objects.length, 0)}개 객체
                </span>
              </div>
            </Link>

            {canModerate ? (
              <button
                type="button"
                disabled={isPending && pendingId === share.publicId}
                onClick={() => setConfirmShare(share)}
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                관리자 공유 중지
              </button>
            ) : null}
          </article>
        ))}
      </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-black text-slate-800">조건에 맞는 공유 전술이 없습니다.</p>
          <p className="mt-2 text-sm text-slate-500">검색어나 필터를 조정하세요.</p>
        </div>
      )}

      {confirmShare ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-[24px] border border-rose-100 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">
                  공유 중지 확인
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{confirmShare.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmShare(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              이 공유를 중지하면 게시판에서 사라지고 기존 공유 링크도 더 이상 열리지 않습니다.
              작성자의 전술 보드에도 공유 중지 상태가 반영됩니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmShare(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isPending && pendingId === confirmShare.publicId}
                onClick={() => stopShare(confirmShare.publicId)}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-rose-600 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && pendingId === confirmShare.publicId ? '중지 중...' : '공유 중지'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
