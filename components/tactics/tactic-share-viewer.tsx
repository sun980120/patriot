'use client';

import Link from 'next/link';
import { Pause, Play, Swords } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeading } from '@/components/ui/page-heading';
import { RinkCanvas } from '@/components/tactics/rink-canvas';
import {
  type TacticObject,
  type TacticPath,
  type TacticProject,
  interpolateObjects,
} from '@/lib/tactics';

type PlaybackPreview = {
  objects: TacticObject[];
  paths: TacticPath[];
  fromSceneId: string;
  toSceneId: string;
  progress: number;
};

export function TacticShareViewer({ project, description }: { project: TacticProject; description?: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState(project.scenes[0].id);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [preview, setPreview] = useState<PlaybackPreview | null>(null);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const currentScene = useMemo(
    () => project.scenes.find((scene) => scene.id === selectedSceneId) ?? project.scenes[0],
    [project.scenes, selectedSceneId],
  );

  function stopPlayback() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setPreview(null);
  }

  function play() {
    if (project.scenes.length < 2) return;
    stopPlayback();
    setIsPlaying(true);

    let fromIndex = 0;
    const runTransition = () => {
      const fromScene = project.scenes[fromIndex];
      const toScene = project.scenes[fromIndex + 1];

      if (!fromScene || !toScene) {
        stopPlayback();
        setSelectedSceneId(project.scenes[project.scenes.length - 1].id);
        return;
      }

      const startedAt = performance.now();
      const duration = Math.max(300, toScene.durationMs);

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        setPreview({
          objects: interpolateObjects(fromScene.objects, toScene.objects, progress),
          paths: fromScene.paths,
          fromSceneId: fromScene.id,
          toSceneId: toScene.id,
          progress,
        });

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        setSelectedSceneId(toScene.id);
        fromIndex += 1;
        animationFrameRef.current = window.requestAnimationFrame(runTransition);
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(runTransition);
  }

  const displayObjects = preview?.objects ?? currentScene.objects;
  const displayPaths = preview?.paths ?? currentScene.paths;
  const activeSceneId = preview?.fromSceneId ?? currentScene.id;
  const progress = preview ? Math.round(preview.progress * 100) : 0;

  return (
    <div className="min-w-0 [&_h1]:break-words">
      <PageHeading title={project.title} description={description} actions={<Link href="/tactics" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Swords className="h-4 w-4" />내 전술 보드</Link>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500"><span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-600">읽기 전용</span><span>{project.boardType === 'board-2' ? '전술 보드 2' : '전술 보드 1'}</span><span>총 {project.scenes.length}개 장면</span></div>
          <button
            type="button"
            disabled={project.scenes.length < 2}
            onClick={isPlaying ? stopPlayback : play}
            aria-label={isPlaying ? '재생 정지' : '전체 재생'}
            title={project.scenes.length < 2 ? '재생하려면 2개 이상의 장면이 필요합니다' : isPlaying ? '재생 정지' : '전체 재생'}
            aria-pressed={isPlaying}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          </button>
      </div>

      <div className="space-y-5">
        <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-950">
          <RinkCanvas
            svgRef={svgRef}
            objects={displayObjects}
            paths={displayPaths}
            selectedObjectId={selectedObjectId}
            selectedPathId={selectedPathId}
            activeTool="select"
            boardType={project.boardType ?? 'board-1'}
            readOnly
            onSelectObject={setSelectedObjectId}
            onSelectPath={setSelectedPathId}
            onMoveObject={() => undefined}
            onCreatePath={() => undefined}
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><strong className="min-w-0 break-words text-sm font-semibold text-slate-900">{currentScene.name}</strong><span className="shrink-0 tabular-nums">장면 {project.scenes.findIndex(scene => scene.id === activeSceneId) + 1} / {project.scenes.length}</span></div>
          <div className="h-1 overflow-hidden bg-slate-100" role="progressbar" aria-label="장면 전환 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <section aria-label="장면 목록" className="border-t border-slate-200 pt-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">장면</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
          {project.scenes.map((scene, index) => (
            <button
              key={scene.id}
              type="button"
              disabled={isPlaying}
              aria-pressed={scene.id === activeSceneId}
              aria-label={`장면 ${index + 1}: ${scene.name}`}
              title={scene.name}
              onClick={() => {
                setSelectedSceneId(scene.id);
                setSelectedObjectId(null);
                setSelectedPathId(null);
              }}
              className={`min-h-20 min-w-0 rounded-md border px-3 py-3 text-left transition disabled:cursor-wait ${
                scene.id === activeSceneId
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs">
                장면 {String(index + 1).padStart(2, '0')}
              </span>
              <strong className="mt-1.5 line-clamp-2 break-words text-sm font-semibold">{scene.name}</strong>
            </button>
          ))}
        </div>
        </section>
      </div>
    </div>
  );
}
