'use client';

import { Pause, Play } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
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

export function TacticShareViewer({ project }: { project: TacticProject }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState(project.scenes[0].id);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [preview, setPreview] = useState<PlaybackPreview | null>(null);

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
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:rounded-[36px]">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,#0f172a,#172033)] px-4 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-200">Shared Playbook</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">{project.title}</h1>
          </div>
          <button
            type="button"
            disabled={project.scenes.length < 2}
            onClick={isPlaying ? stopPlayback : play}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-400 px-4 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? '정지' : '애니메이션'}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-6">
        <div className="rounded-[22px] border border-sky-200/20 bg-sky-950/30 p-1.5 sm:rounded-[30px] sm:p-3">
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

        {preview ? (
          <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${progress}%` }} />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
          {project.scenes.map((scene, index) => (
            <button
              key={scene.id}
              type="button"
              disabled={isPlaying}
              onClick={() => {
                setSelectedSceneId(scene.id);
                setSelectedObjectId(null);
                setSelectedPathId(null);
              }}
              className={`rounded-[18px] border px-3 py-3 text-left transition disabled:cursor-wait ${
                scene.id === activeSceneId
                  ? 'border-sky-300 bg-sky-400/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="block truncate text-[11px] font-black uppercase tracking-[0.14em]">
                Scene {String(index + 1).padStart(2, '0')}
              </span>
              <strong className="mt-1.5 block truncate text-sm">{scene.name}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
