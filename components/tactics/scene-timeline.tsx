'use client';

import { Copy, Plus, Trash2 } from 'lucide-react';
import type { TacticScene } from '@/lib/tactics';

export function SceneTimeline({
  scenes,
  selectedSceneId,
  disabled,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
}: {
  scenes: TacticScene[];
  selectedSceneId: string;
  disabled: boolean;
  onSelect: (sceneId: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="self-start rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">Timeline</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">장면 구성</h3>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
            다음 장면에서 선수를 옮기면 두 장면 사이가 자동으로 애니메이션됩니다.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button
            type="button"
            disabled={disabled}
            onClick={onAdd}
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-50 sm:col-span-1"
          >
            <Plus className="h-4 w-4" />
            다음 장면
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onDuplicate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            전체 복제
          </button>
          <button
            type="button"
            disabled={disabled || scenes.length === 1}
            onClick={onDelete}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] sm:gap-3">
        {scenes.map((scene, index) => {
          const selected = scene.id === selectedSceneId;
          return (
            <button
              key={scene.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(scene.id)}
              className={`min-w-0 rounded-[18px] border px-3 py-3 text-left transition disabled:cursor-wait sm:rounded-[22px] sm:px-4 ${
                selected
                  ? 'border-brand-600 bg-brand-50 shadow-[0_10px_24px_rgba(76,96,53,0.12)]'
                  : 'border-slate-200 bg-slate-50 hover:border-brand-200 hover:bg-white'
              }`}
            >
              <span className={`block truncate text-[10px] font-black uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.18em] ${selected ? 'text-brand-700' : 'text-slate-400'}`}>
                Scene {String(index + 1).padStart(2, '0')}
              </span>
              <strong className="mt-1.5 block truncate text-sm text-slate-900 sm:mt-2">
                {scene.name}
              </strong>
              <span className="mt-1 block truncate text-[11px] text-slate-500 sm:text-xs">
                {(scene.durationMs / 1000).toFixed(1)}초 전환
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
