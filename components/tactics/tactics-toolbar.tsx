'use client';

import {
  CircleDot,
  MousePointer2,
  MoveRight,
  Send,
  Target,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { TacticTeam, TacticTool } from '@/lib/tactics';

const pathTools: Array<{
  tool: Exclude<TacticTool, 'select'>;
  label: string;
  Icon: typeof MoveRight;
}> = [
  { tool: 'move', label: '이동선', Icon: MoveRight },
  { tool: 'pass', label: '패스선', Icon: Send },
  { tool: 'shot', label: '슛선', Icon: Target },
];

export function TacticsToolbar({
  disabled,
  hasSelection,
  hasBall,
  activeTool,
  onSelectTool,
  onAddPlayer,
  onAddBall,
  onDeleteSelection,
}: {
  disabled: boolean;
  hasSelection: boolean;
  hasBall: boolean;
  activeTool: TacticTool;
  onSelectTool: (tool: TacticTool) => void;
  onAddPlayer: (team: Exclude<TacticTeam, 'neutral'>) => void;
  onAddBall: () => void;
  onDeleteSelection: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-[20px] border border-white/10 bg-slate-950/75 p-2.5 sm:rounded-[24px] sm:p-3 xl:grid-cols-[1fr_0.62fr]">
      <div>
        <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Objects</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAddPlayer('home')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            홈 선수
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAddPlayer('away')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            원정 선수
          </button>
          <button
            type="button"
            disabled={disabled || hasBall}
            onClick={onAddBall}
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
          >
            <CircleDot className="h-4 w-4" />
            공
          </button>
        </div>
        <button
          type="button"
          disabled={disabled || !hasSelection}
          onClick={onDeleteSelection}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Trash2 className="h-4 w-4" />
          선택 항목 삭제
        </button>
      </div>

      <div className="rounded-[18px] border border-white/10 bg-white/5 p-2">
        <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Draw</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectTool('select')}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${
              activeTool === 'select'
                ? 'bg-sky-400 text-slate-950'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            <MousePointer2 className="h-4 w-4" />
            선택
          </button>
          {pathTools.map(({ tool, label, Icon }) => (
            <button
              key={tool}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTool(tool)}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${
                activeTool === tool
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
