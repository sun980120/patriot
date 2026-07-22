'use client';

import {
  Download,
  FolderOpen,
  Link2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  createTacticShareAction,
  deleteTacticProjectAction,
  listTacticProjectsAction,
  listDeletedTacticProjectsAction,
  purgeTacticProjectAction,
  restoreTacticProjectAction,
  saveTacticProjectAction,
  stopTacticShareAction,
} from '@/app/actions';
import { RinkCanvas } from '@/components/tactics/rink-canvas';
import { SceneTimeline } from '@/components/tactics/scene-timeline';
import { TacticsToolbar } from '@/components/tactics/tactics-toolbar';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';
import {
  RINK_HEIGHT,
  RINK_WIDTH,
  TACTICS_LIBRARY_KEY,
  TACTIC_BOARD_OPTIONS,
  cloneObjects,
  clonePaths,
  createNextScene,
  createStarterProject,
  createTacticId,
  interpolateObjects,
  isTacticProject,
  parseTacticsLibrary,
  sanitizeFileName,
  type TacticObject,
  type TacticPath,
  type TacticPathKind,
  type TacticPoint,
  type TacticProject,
  type TacticScene,
  type TacticTeam,
  type TacticTool,
  type TacticsLibrary,
} from '@/lib/tactics';

type PlaybackPreview = {
  objects: TacticObject[];
  paths: TacticPath[];
  fromSceneId: string;
  toSceneId: string;
  fromName: string;
  toName: string;
  progress: number;
};

type ToastState = {
  open: boolean;
  message: string;
  tone: ToastTone;
};

type FullscreenTarget = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

const emptyToast: ToastState = {
  open: false,
  message: '',
  tone: 'info',
};

function copyProject(project: TacticProject): TacticProject {
  return {
    ...project,
    boardType: project.boardType ?? 'board-1',
    scenes: project.scenes.map((scene) => ({
      ...scene,
      objects: cloneObjects(scene.objects),
      paths: clonePaths(scene.paths),
    })),
  };
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('공유 링크를 복사하지 못했습니다.');
  }
}

export function TacticsEditor({ userName }: { userName: string }) {
  const [project, setProject] = useState<TacticProject | null>(null);
  const [library, setLibrary] = useState<TacticsLibrary>({
    version: 1,
    lastProjectId: null,
    projects: [],
  });
  const [deletedProjects, setDeletedProjects] = useState<TacticProject[]>([]);
  const [selectedDeletedProjectId, setSelectedDeletedProjectId] = useState('');
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<TacticTool>('select');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [playbackPreview, setPlaybackPreview] = useState<PlaybackPreview | null>(null);
  const [toast, setToast] = useState<ToastState>(emptyToast);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadServerProjects() {
      const [result, trashResult] = await Promise.all([
        listTacticProjectsAction(),
        listDeletedTacticProjectsAction(),
      ]);
      if (!mounted) return;

      if (result.ok && result.projects) {
        const projects = result.projects.filter(isTacticProject).map(copyProject);
        const initialProject = projects[0] ?? createStarterProject('첫 번째 전술');

        setLibrary({
          version: 1,
          lastProjectId: initialProject.id,
          projects,
        });
        setProject(initialProject);
        setSelectedSceneId(initialProject.scenes[0].id);
        if (trashResult.ok && trashResult.projects) {
          const trashProjects = trashResult.projects.filter(isTacticProject).map(copyProject);
          setDeletedProjects(trashProjects);
          setSelectedDeletedProjectId(trashProjects[0]?.id ?? '');
        }
        return;
      }

      const storedLibrary = parseTacticsLibrary(window.localStorage.getItem(TACTICS_LIBRARY_KEY));
      const fallbackProject = storedLibrary.projects[0] ? copyProject(storedLibrary.projects[0]) : createStarterProject('첫 번째 전술');
      setLibrary({
        version: 1,
        lastProjectId: fallbackProject.id,
        projects: storedLibrary.projects,
      });
      setProject(fallbackProject);
      setSelectedSceneId(fallbackProject.scenes[0].id);
      showToast(result.message ?? '서버 전술 보관함을 불러오지 못해 임시 전술판을 열었습니다.', 'error');
    }

    void loadServerProjects();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      const fullscreenDocument = document as FullscreenDocument;
      const fullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
      const nextFullscreen = fullscreenElement === fullscreenRef.current;
      setIsBoardFullscreen(nextFullscreen);

      if (!nextFullscreen) {
        screen.orientation?.unlock?.();
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const currentScene = useMemo(() => {
    if (!project) return null;
    return project.scenes.find((scene) => scene.id === selectedSceneId) ?? project.scenes[0] ?? null;
  }, [project, selectedSceneId]);

  const selectedObject =
    currentScene?.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedPath = currentScene?.paths.find((path) => path.id === selectedPathId) ?? null;

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ open: true, message, tone });
  }, []);

  function persistLibrary(nextLibrary: TacticsLibrary) {
    setLibrary(nextLibrary);
  }

  function updateCurrentScene(updater: (scene: TacticScene) => TacticScene) {
    if (!currentScene) return;

    setProject((current) => {
      if (!current) return current;
      return {
        ...current,
        scenes: current.scenes.map((scene) =>
          scene.id === currentScene.id ? updater(scene) : scene,
        ),
      };
    });
  }

  const deleteSelection = useCallback(() => {
    if (!project || !currentScene || isPlaying) return;

    if (selectedObjectId) {
      setProject((current) => {
        if (!current) return current;
        return {
          ...current,
          scenes: current.scenes.map((scene) =>
            scene.id === currentScene.id
              ? {
                  ...scene,
                  objects: scene.objects.filter((object) => object.id !== selectedObjectId),
                }
              : scene,
          ),
        };
      });
      setSelectedObjectId(null);
      showToast('선택한 객체를 삭제했습니다.', 'info');
      return;
    }

    if (selectedPathId) {
      setProject((current) => {
        if (!current) return current;
        return {
          ...current,
          scenes: current.scenes.map((scene) =>
            scene.id === currentScene.id
              ? { ...scene, paths: scene.paths.filter((path) => path.id !== selectedPathId) }
              : scene,
          ),
        };
      });
      setSelectedPathId(null);
      showToast('선택한 경로를 삭제했습니다.', 'info');
    }
  }, [currentScene, isPlaying, project, selectedObjectId, selectedPathId, showToast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      }

      if (event.key === 'Escape') {
        setSelectedObjectId(null);
        setSelectedPathId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection]);

  function handleMoveObject(objectId: string, point: TacticPoint) {
    updateCurrentScene((scene) => ({
      ...scene,
      objects: scene.objects.map((object) =>
        object.id === objectId ? { ...object, ...point } : object,
      ),
    }));
  }

  function handleCreatePath(kind: TacticPathKind, start: TacticPoint, end: TacticPoint) {
    const path: TacticPath = {
      id: createTacticId('path'),
      kind,
      start,
      end,
    };

    updateCurrentScene((scene) => ({
      ...scene,
      paths: [...scene.paths, path],
    }));
    setSelectedObjectId(null);
    setSelectedPathId(path.id);
  }

  function addObject(kind: TacticObject['kind'], team: TacticTeam) {
    if (!currentScene) return;
    const teamObjects = currentScene.objects.filter(
      (object) => object.team === team && object.kind === kind,
    );
    const count = teamObjects.length;
    const isHome = team === 'home';
    const object: TacticObject = {
      id: createTacticId(kind),
      kind,
      team,
      x: kind === 'ball' ? 500 : kind === 'goalie' ? (isHome ? 190 : 810) : isHome ? 425 : 575,
      y: kind === 'ball' ? 250 : 90 + ((count * 68) % 330),
      number: kind === 'ball' ? undefined : kind === 'goalie' ? 'G' : String(count + 1),
    };

    updateCurrentScene((scene) => ({
      ...scene,
      objects: [...scene.objects, object],
    }));
    setSelectedObjectId(object.id);
    setSelectedPathId(null);
  }

  function addScene(includePaths: boolean) {
    if (!project || !currentScene) return;
    const nextScene = createNextScene(currentScene, project.scenes.length + 1, includePaths);
    const nextScenes = [...project.scenes, nextScene];

    setProject({ ...project, scenes: nextScenes });
    setSelectedSceneId(nextScene.id);
    setSelectedObjectId(null);
    setSelectedPathId(null);
    showToast(
      includePaths
        ? '현재 장면 전체를 복제했습니다.'
        : '선수 배치를 이어받은 다음 장면을 만들었습니다.',
      'success',
    );
  }

  function deleteScene() {
    if (!project || !currentScene || project.scenes.length === 1) return;
    const currentIndex = project.scenes.findIndex((scene) => scene.id === currentScene.id);
    const nextScenes = project.scenes.filter((scene) => scene.id !== currentScene.id);
    const nextSelected = nextScenes[Math.max(0, currentIndex - 1)] ?? nextScenes[0];

    setProject({ ...project, scenes: nextScenes });
    setSelectedSceneId(nextSelected.id);
    setSelectedObjectId(null);
    setSelectedPathId(null);
    showToast('장면을 삭제했습니다.', 'info');
  }

  function selectScene(sceneId: string) {
    if (isPlaying) return;
    setSelectedSceneId(sceneId);
    setSelectedObjectId(null);
    setSelectedPathId(null);
  }

  function stopPlayback() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackPreview(null);
  }

  function playProject() {
    if (!project || project.scenes.length < 2) {
      showToast('애니메이션을 만들려면 장면을 2개 이상 추가해 주세요.', 'info');
      return;
    }

    stopPlayback();
    setSelectedObjectId(null);
    setSelectedPathId(null);
    setIsPlaying(true);

    const currentIndex = project.scenes.findIndex((scene) => scene.id === selectedSceneId);
    let fromIndex = currentIndex >= 0 && currentIndex < project.scenes.length - 1 ? currentIndex : 0;

    const runTransition = () => {
      const fromScene = project.scenes[fromIndex];
      const toScene = project.scenes[fromIndex + 1];

      if (!fromScene || !toScene) {
        animationFrameRef.current = null;
        setIsPlaying(false);
        setPlaybackPreview(null);
        showToast('전술 애니메이션 재생이 끝났습니다.');
        return;
      }

      const startedAt = performance.now();
      const duration = Math.max(300, toScene.durationMs);

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        setPlaybackPreview({
          objects: interpolateObjects(fromScene.objects, toScene.objects, progress),
          paths: fromScene.paths,
          fromSceneId: fromScene.id,
          toSceneId: toScene.id,
          fromName: fromScene.name,
          toName: toScene.name,
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

  async function saveProject() {
    if (!project || isSaving) return;
    setIsSaving(true);
    const savedProject = { ...copyProject(project), updatedAt: new Date().toISOString() };

    try {
      const result = await saveTacticProjectAction({
        projectId: savedProject.id,
        title: savedProject.title.trim() || '새 전술',
        snapshot: savedProject,
      });

      if (!result.ok || !result.project || !isTacticProject(result.project)) {
        showToast(result.message ?? '전술을 서버에 저장하지 못했습니다.', 'error');
        return;
      }

      const serverProject = copyProject(result.project);
      const existingIndex = library.projects.findIndex((item) => item.id === serverProject.id);
      const nextProjects = [...library.projects];

      if (existingIndex >= 0) {
        nextProjects[existingIndex] = serverProject;
      } else {
        nextProjects.unshift(serverProject);
      }

      persistLibrary({
        version: 1,
        lastProjectId: serverProject.id,
        projects: nextProjects,
      });
      setProject(serverProject);
      showToast('서버 전술 보관함에 저장했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  function openProject(projectId: string) {
    const storedProject = library.projects.find((item) => item.id === projectId);
    if (!storedProject) return;

    stopPlayback();
    const nextProject = copyProject(storedProject);
    setProject(nextProject);
    setSelectedSceneId(nextProject.scenes[0].id);
    setSelectedObjectId(null);
    setSelectedPathId(null);
    persistLibrary({ ...library, lastProjectId: projectId });
    showToast(`${nextProject.title} 전술을 서버 보관함에서 열었습니다.`, 'info');
  }

  function createNewProject() {
    stopPlayback();
    const nextProject = createStarterProject('새 전술');
    setProject(nextProject);
    setSelectedSceneId(nextProject.scenes[0].id);
    setSelectedObjectId(null);
    setSelectedPathId(null);
    showToast('새 전술판을 준비했습니다. 필요하면 먼저 기존 전술을 저장해 주세요.', 'info');
  }

  async function deleteStoredProject() {
    if (!project || isSaving) return;
    const isStored = library.projects.some((item) => item.id === project.id);
    if (!isStored) {
      showToast('현재 전술은 아직 서버 보관함에 저장되지 않았습니다.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const result = await deleteTacticProjectAction(project.id);
      if (!result.ok) {
        showToast(result.message ?? '전술을 삭제하지 못했습니다.', 'error');
        return;
      }

      const deletedProject = copyProject(project);
      const nextProjects = library.projects.filter((item) => item.id !== project.id);
      persistLibrary({
        version: 1,
        lastProjectId: nextProjects[0]?.id ?? null,
        projects: nextProjects,
      });
      setDeletedProjects((current) => [deletedProject, ...current.filter((item) => item.id !== deletedProject.id)]);
      setSelectedDeletedProjectId(deletedProject.id);

      const nextProject = nextProjects[0] ? copyProject(nextProjects[0]) : createStarterProject('새 전술');
      setProject(nextProject);
      setSelectedSceneId(nextProject.scenes[0].id);
      setSelectedObjectId(null);
      setSelectedPathId(null);
      showToast('서버 보관함에서 전술을 삭제했습니다.', 'info');
    } finally {
      setIsSaving(false);
    }
  }

  async function restoreDeletedProject() {
    if (!selectedDeletedProjectId || isSaving) return;
    setIsSaving(true);
    try {
      const result = await restoreTacticProjectAction(selectedDeletedProjectId);
      if (!result.ok || !result.project || !isTacticProject(result.project)) {
        showToast(result.message ?? '전술을 복구하지 못했습니다.', 'error');
        return;
      }

      const restoredProject = copyProject(result.project);
      const nextDeleted = deletedProjects.filter((item) => item.id !== restoredProject.id);
      setDeletedProjects(nextDeleted);
      setSelectedDeletedProjectId(nextDeleted[0]?.id ?? '');
      persistLibrary({
        version: 1,
        lastProjectId: restoredProject.id,
        projects: [restoredProject, ...library.projects.filter((item) => item.id !== restoredProject.id)],
      });
      setProject(restoredProject);
      setSelectedSceneId(restoredProject.scenes[0].id);
      setSelectedObjectId(null);
      setSelectedPathId(null);
      showToast('삭제 보관함에서 전술을 복구했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function purgeDeletedProject() {
    if (!selectedDeletedProjectId || isSaving) return;
    setIsSaving(true);
    try {
      const result = await purgeTacticProjectAction(selectedDeletedProjectId);
      if (!result.ok) {
        showToast(result.message ?? '전술을 완전히 삭제하지 못했습니다.', 'error');
        return;
      }

      const nextDeleted = deletedProjects.filter((item) => item.id !== selectedDeletedProjectId);
      setDeletedProjects(nextDeleted);
      setSelectedDeletedProjectId(nextDeleted[0]?.id ?? '');
      showToast('전술을 완전히 삭제했습니다.', 'info');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShareProject() {
    if (!project || isSharing) return;

    if (project.shareActive && project.shareId) {
      setIsSharing(true);
      try {
        const result = await stopTacticShareAction(project.shareId);
        if (!result.ok) {
          showToast(result.message ?? '공유를 중단하지 못했습니다.', 'error');
          return;
        }

        const nextProject = { ...project, shareActive: false };
        setProject(nextProject);
        await persistCurrentProject(nextProject);
        showToast('공유를 중단했습니다. 기존 링크와 게시판에서 더 이상 볼 수 없습니다.', 'info');
      } catch {
        showToast('공유를 중단하지 못했습니다.', 'error');
      } finally {
        setIsSharing(false);
      }
      return;
    }

    const title = project.title.trim();
    if (!title) {
      showToast('전술 제목을 입력해 주세요.', 'error');
      return;
    }

    setIsSharing(true);
    try {
      const result = await createTacticShareAction({
        title,
        snapshot: copyProject(project),
      });

      if (!result.ok || !result.shareId) {
        showToast(result.message ?? '공유 링크를 만들지 못했습니다.', 'error');
        return;
      }

      const nextProject = { ...project, shareId: result.shareId, shareActive: true };
      setProject(nextProject);
      await persistCurrentProject(nextProject);
      const shareUrl = `${window.location.origin}/tactics/share/${result.shareId}`;
      await copyText(shareUrl);
      showToast('공유를 시작했습니다. 링크를 복사했고 공유 게시판에도 노출됩니다.', 'success');
    } catch {
      showToast('공유 링크를 만들지 못했습니다.', 'error');
    } finally {
      setIsSharing(false);
    }
  }

  async function persistCurrentProject(nextProject: TacticProject) {
    const existingIndex = library.projects.findIndex((item) => item.id === nextProject.id);
    const nextProjects = [...library.projects];

    if (existingIndex >= 0) {
      nextProjects[existingIndex] = copyProject(nextProject);
    } else {
      nextProjects.unshift(copyProject(nextProject));
    }

    persistLibrary({
      version: 1,
      lastProjectId: nextProject.id,
      projects: nextProjects,
    });

    await saveTacticProjectAction({
      projectId: nextProject.id,
      title: nextProject.title.trim() || '새 전술',
      snapshot: copyProject(nextProject),
    });
  }

  async function exportPng() {
    if (!project || !svgRef.current) return;

    try {
      const clonedSvg = svgRef.current.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('width', String(RINK_WIDTH * 2));
      clonedSvg.setAttribute('height', String(RINK_HEIGHT * 2));

      const serialized = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('SVG 이미지를 읽지 못했습니다.'));
        image.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = RINK_WIDTH * 2;
      canvas.height = RINK_HEIGHT * 2;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이미지 캔버스를 생성하지 못했습니다.');

      context.fillStyle = '#e0f2fe';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG 파일을 생성하지 못했습니다.'));
        }, 'image/png');
      });

      const downloadUrl = URL.createObjectURL(pngBlob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${sanitizeFileName(project.title)}.png`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
      showToast('현재 장면을 PNG 이미지로 저장했습니다.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'PNG 저장에 실패했습니다.', 'error');
    }
  }

  async function toggleBoardFullscreen() {
    const target = fullscreenRef.current as FullscreenTarget | null;
    if (!target) return;

    try {
      if (isBoardFullscreen) {
        const fullscreenDocument = document as FullscreenDocument;
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          await fullscreenDocument.webkitExitFullscreen?.();
        }
        return;
      }

      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      } else {
        showToast('이 브라우저는 전체화면 편집을 지원하지 않습니다.', 'error');
        return;
      }

      try {
        await (screen.orientation as LockableScreenOrientation | undefined)?.lock?.('landscape');
      } catch {
        showToast('전체화면으로 전환했습니다. 화면 회전 잠금은 브라우저 정책상 지원되지 않을 수 있습니다.', 'info');
      }
    } catch {
      showToast('전체화면으로 전환하지 못했습니다. 브라우저 권한 또는 기기 설정을 확인해 주세요.', 'error');
    }
  }

  if (!project || !currentScene) {
    return (
      <section className="rounded-[36px] border border-white/70 bg-white/90 p-6 shadow-soft">
        <div className="h-8 w-48 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-5 aspect-[2/1] animate-pulse rounded-[28px] bg-slate-200" />
      </section>
    );
  }

  const displayObjects = playbackPreview?.objects ?? currentScene.objects;
  const displayPaths = playbackPreview?.paths ?? currentScene.paths;
  const currentSceneIndex = project.scenes.findIndex((scene) => scene.id === currentScene.id);
  const activeSceneIdForTimeline = playbackPreview?.fromSceneId ?? currentScene.id;
  const hasBall = currentScene.objects.some((object) => object.kind === 'ball');
  const projectIsStored = library.projects.some((item) => item.id === project.id);
  const playbackPercent = playbackPreview
    ? Math.round(playbackPreview.progress * 100)
    : 0;

  return (
    <>
      <FloatingToast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast(emptyToast)}
      />

      <section className="overflow-hidden rounded-[26px] border border-white/70 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:rounded-[36px]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,#0f172a,#172033)] px-4 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-200">
                <Sparkles className="h-3.5 w-3.5" />
                Patriot Playbook
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-4xl">
                플로어볼 전술 보드
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {userName}님, 선수를 배치하고 장면을 이어 움직임을 설계해 보세요. 저장한 전술은
                현재 브라우저에서 다시 열 수 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto] xl:min-w-[620px]">
              <label className="sr-only" htmlFor="saved-tactic">
                저장된 전술 선택
              </label>
              <select
                id="saved-tactic"
                value={projectIsStored ? project.id : ''}
                onChange={(event) => openProject(event.target.value)}
                className="col-span-2 min-h-11 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none transition focus:border-sky-300 sm:col-span-1"
              >
                <option value="" className="text-slate-900">
                  {library.projects.length ? '저장된 전술 열기' : '저장된 전술 없음'}
                </option>
                {library.projects.map((item) => (
                  <option key={item.id} value={item.id} className="text-slate-900">
                    {item.title} · {formatSavedAt(item.updatedAt)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={saveProject}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-400 px-4 text-sm font-black text-slate-950 transition hover:bg-sky-300"
              >
                <Save className="h-4 w-4" />
                저장
              </button>
              <button
                type="button"
                onClick={createNewProject}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
                새 전술
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:space-y-4 sm:p-6">
          <div className="grid gap-3 rounded-[22px] border border-white/10 bg-white/5 p-3 sm:rounded-[24px] lg:grid-cols-[minmax(260px,1fr)_minmax(220px,0.7fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="grid gap-3">
                <label htmlFor="tactic-title" className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Project title
                  </span>
                  <input
                    id="tactic-title"
                    value={project.title}
                    disabled={isPlaying}
                    maxLength={60}
                    onChange={(event) =>
                      setProject((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                    className="mt-1 min-h-11 w-full rounded-2xl border border-white/10 bg-white px-3 text-base font-black text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 disabled:opacity-60 sm:px-4"
                    placeholder="전술 이름"
                  />
                </label>
              </div>
            </div>
            <fieldset className="min-w-0">
              <legend className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Board
              </legend>
              <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-slate-950/45 p-1.5">
                {TACTIC_BOARD_OPTIONS.map((option) => {
                  const selected = (project.boardType ?? 'board-1') === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isPlaying}
                      onClick={() =>
                      setProject((current) =>
                        current
                          ? { ...current, boardType: option.value }
                          : current,
                      )
                      }
                      className={`min-h-9 rounded-xl px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? 'bg-sky-400 text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                        {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2 sm:grid-cols-4 lg:flex lg:justify-end">
              <button
                type="button"
                onClick={isPlaying ? stopPlayback : playProject}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition ${
                  isPlaying
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-brand-600 text-white hover:bg-brand-500'
                }`}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? '정지' : '애니메이션'}
              </button>
              <button
                type="button"
                disabled={isPlaying || isSharing}
                onClick={handleShareProject}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  project.shareActive
                    ? 'border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
                    : 'border-sky-300/30 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20'
                }`}
              >
                <Link2 className="h-4 w-4" />
                {isSharing ? '처리 중...' : project.shareActive ? '공유 중단' : '공유 시작'}
              </button>
              <Link
                href={'/tactics/community' as Route}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <UsersRound className="h-4 w-4" />
                공유 게시판
              </Link>
              <button
                type="button"
                disabled={isPlaying}
                onClick={exportPng}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                PNG 저장
              </button>
            </div>
          </div>

          <TacticsToolbar
            disabled={isPlaying}
            hasSelection={Boolean(selectedObjectId || selectedPathId)}
            hasBall={hasBall}
            activeTool={activeTool}
            onSelectTool={(tool) => {
              setActiveTool(tool);
              setSelectedObjectId(null);
              setSelectedPathId(null);
            }}
            onAddPlayer={(team) => addObject('player', team)}
            onAddBall={() => addObject('ball', 'neutral')}
            onDeleteSelection={deleteSelection}
          />

          <div
            ref={fullscreenRef}
            className={`relative touch-none select-none overscroll-contain overflow-hidden border border-sky-200/20 bg-sky-950/30 shadow-inner ${
              isBoardFullscreen
                ? 'flex h-screen w-screen items-start justify-center rounded-none px-28 pb-16 pt-3 sm:px-32 sm:pb-16 sm:pt-5'
                : 'rounded-[22px] p-1.5 sm:rounded-[30px] sm:p-3'
            }`}
          >
            <button
              type="button"
              onClick={toggleBoardFullscreen}
              className="absolute right-3 top-3 z-20 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-950/70 px-3 text-sm font-black text-white shadow-lg backdrop-blur transition hover:bg-slate-900"
            >
              {isBoardFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isBoardFullscreen ? '전체화면 종료' : '가로 전체화면'}
            </button>
            <div className={isBoardFullscreen ? 'w-full [&>svg]:mx-auto [&>svg]:max-h-[calc(100vh-5rem)] [&>svg]:w-full' : 'w-full'}>
              <RinkCanvas
                svgRef={svgRef}
                objects={displayObjects}
                paths={displayPaths}
                selectedObjectId={selectedObjectId}
                selectedPathId={selectedPathId}
                activeTool={activeTool}
                boardType={project.boardType ?? 'board-1'}
                disabled={isPlaying}
                onSelectObject={setSelectedObjectId}
                onSelectPath={setSelectedPathId}
                onMoveObject={handleMoveObject}
                onCreatePath={handleCreatePath}
              />
            </div>

            {isBoardFullscreen ? (
              <>
                {playbackPreview ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="absolute bottom-3 left-1/2 z-20 w-[min(520px,46vw)] -translate-x-1/2 rounded-2xl border border-sky-300/25 bg-slate-950/80 px-3 py-2 text-white shadow-2xl backdrop-blur"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs font-bold">
                      <span className="truncate">{playbackPreview.fromName}</span>
                      <span className="shrink-0 text-sm font-black text-sky-300">{playbackPercent}%</span>
                      <span className="truncate text-right">{playbackPreview.toName}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${playbackPercent}%` }} />
                    </div>
                  </div>
                ) : null}
                {!isPlaying ? (
                  <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-2xl border border-white/15 bg-slate-950/80 p-1.5 shadow-2xl backdrop-blur">
                    {TACTIC_BOARD_OPTIONS.map((option) => {
                      const selected = (project.boardType ?? 'board-1') === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setProject((current) =>
                              current ? { ...current, boardType: option.value } : current,
                            )
                          }
                          className={`inline-flex min-h-9 min-w-24 items-center justify-center rounded-xl px-3 text-xs font-black transition ${
                            selected
                              ? 'bg-sky-400 text-slate-950'
                              : 'bg-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <div className="absolute bottom-3 left-3 top-3 z-20 flex w-24 flex-col overflow-hidden rounded-[22px] border border-white/15 bg-slate-950/85 p-2 shadow-2xl backdrop-blur sm:left-4 sm:w-28">
                  <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Tools
                  </p>
                  <button
                    type="button"
                    onClick={isPlaying ? stopPlayback : playProject}
                    className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl px-2 text-xs font-black transition ${
                      isPlaying
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'bg-brand-600 text-white hover:bg-brand-500'
                    }`}
                  >
                    {isPlaying ? '정지' : '애니메이션'}
                  </button>
                  <div className="mt-2 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-0.5">
                    <button
                      type="button"
                      disabled={isPlaying}
                      onClick={() => addObject('player', 'home')}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-800 px-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-50"
                    >
                      홈 선수
                    </button>
                    <button
                      type="button"
                      disabled={isPlaying}
                      onClick={() => addObject('player', 'away')}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-amber-400 px-2 text-xs font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
                    >
                      원정 선수
                    </button>
                    <button
                      type="button"
                      disabled={isPlaying || hasBall}
                      onClick={() => addObject('ball', 'neutral')}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-white px-2 text-xs font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      공
                    </button>
                    {(['select', 'move', 'pass', 'shot'] as const).map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        disabled={isPlaying}
                        onClick={() => {
                          setActiveTool(tool);
                          setSelectedObjectId(null);
                          setSelectedPathId(null);
                        }}
                        className={`inline-flex min-h-10 items-center justify-center rounded-2xl px-2 text-xs font-black transition disabled:opacity-50 ${
                          activeTool === tool
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        {tool === 'select'
                          ? '선택'
                          : tool === 'move'
                            ? '이동선'
                            : tool === 'pass'
                              ? '패스선'
                              : '슛선'}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={isPlaying || !(selectedObjectId || selectedPathId)}
                      onClick={deleteSelection}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10 px-2 text-xs font-black text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      선택 삭제
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 top-16 z-20 flex w-24 flex-col overflow-hidden rounded-[22px] border border-white/15 bg-slate-950/85 p-2 shadow-2xl backdrop-blur sm:right-4 sm:w-28">
                  <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Scenes
                  </p>
                  <div className="grid shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={isPlaying}
                      onClick={() => addScene(false)}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-brand-600 px-2 text-xs font-black text-white transition hover:bg-brand-500 disabled:opacity-50"
                    >
                      장면 추가
                    </button>
                    <button
                      type="button"
                      disabled={isPlaying || project.scenes.length === 1}
                      onClick={deleteScene}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-2 text-xs font-black text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      장면 삭제
                    </button>
                  </div>
                  <div className="mt-2 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-0.5">
                    {project.scenes.map((scene, index) => {
                      const selected = scene.id === activeSceneIdForTimeline;
                      return (
                        <button
                          key={scene.id}
                          type="button"
                          disabled={isPlaying}
                          onClick={() => selectScene(scene.id)}
                          className={`min-h-12 rounded-2xl border px-2 text-left transition disabled:cursor-wait ${
                            selected
                              ? 'border-sky-300 bg-sky-400/15 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="block text-[9px] font-black uppercase tracking-[0.1em]">
                            Scene {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-black">
                            {scene.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {playbackPreview ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-[18px] border border-sky-300/25 bg-slate-900 px-3 py-3 text-white shadow-lg sm:rounded-2xl sm:px-4"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs font-bold sm:gap-3 sm:text-sm">
                <span className="truncate">{playbackPreview.fromName}</span>
                <span className="shrink-0 text-base font-black text-sky-300 sm:text-lg">
                  {playbackPercent}%
                </span>
                <span className="truncate text-right">{playbackPreview.toName}</span>
              </div>
              <div
                role="progressbar"
                aria-label={`${playbackPreview.fromName}에서 ${playbackPreview.toName} 장면으로 전환`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={playbackPercent}
                className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"
              >
                <div
                  className="h-full rounded-full bg-sky-400 transition-[width] duration-75"
                  style={{ width: `${playbackPercent}%` }}
                />
              </div>
            </div>
          ) : null}

          <p className="px-1 text-[11px] leading-5 text-slate-400 sm:text-xs">
            선수와 공을 드래그해 위치를 조정할 수 있습니다. 모바일에서는 코트가 화면 폭에
            맞춰 표시되며, 가로 화면에서 더 정밀하게 편집할 수 있습니다.
          </p>
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)]">
        <SceneTimeline
          scenes={project.scenes}
          selectedSceneId={activeSceneIdForTimeline}
          disabled={isPlaying}
          onSelect={selectScene}
          onAdd={() => addScene(false)}
          onDuplicate={() => addScene(true)}
          onDelete={deleteScene}
        />

        <aside className="self-start rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">Inspector</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">장면 및 선택 항목</h3>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 sm:px-3 sm:text-xs">
              {currentSceneIndex + 1} / {project.scenes.length}
            </span>
          </div>

          <div className="mt-4 rounded-[18px] bg-slate-50 p-3 sm:rounded-[22px] sm:p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              장면 설정
            </p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-bold text-slate-600">
                장면 이름
                <input
                  value={currentScene.name}
                  disabled={isPlaying}
                  maxLength={40}
                  onChange={(event) =>
                    updateCurrentScene((scene) => ({ ...scene, name: event.target.value }))
                  }
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-400 disabled:opacity-50 sm:px-4 sm:text-sm"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                이 장면으로 전환하는 시간
                <select
                  value={currentScene.durationMs}
                  disabled={isPlaying}
                  onChange={(event) =>
                    updateCurrentScene((scene) => ({
                      ...scene,
                      durationMs: Number(event.target.value),
                    }))
                  }
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-400 disabled:opacity-50 sm:px-4 sm:text-sm"
                >
                  <option value={600}>빠르게 · 0.6초</option>
                  <option value={900}>빠름 · 0.9초</option>
                  <option value={1200}>기본 · 1.2초</option>
                  <option value={1800}>천천히 · 1.8초</option>
                  <option value={2500}>설명용 · 2.5초</option>
                </select>
              </label>
            </div>
          </div>

          <div className="my-4 flex items-center gap-3 sm:my-5">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              선택 항목
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {selectedObject ? (
            <div className="rounded-[18px] border border-slate-200 p-3 sm:rounded-[22px] sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Selected object</p>
                  <h4 className="mt-1 truncate font-black text-slate-900">
                    {selectedObject.kind === 'ball'
                      ? '공'
                      : `${selectedObject.team === 'home' ? '홈' : '원정'} ${
                          selectedObject.kind === 'goalie' ? '골키퍼' : '선수'
                        }`}
                  </h4>
                </div>
                <span
                  className={`h-9 w-9 rounded-full border-4 border-white shadow ${
                    selectedObject.team === 'home'
                      ? 'bg-slate-900'
                      : selectedObject.team === 'away'
                        ? 'bg-amber-400'
                        : 'bg-white'
                  }`}
                />
              </div>
              {selectedObject.kind !== 'ball' ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    등번호
                    <input
                      value={selectedObject.number ?? ''}
                      disabled={isPlaying}
                      maxLength={3}
                      onChange={(event) =>
                        updateCurrentScene((scene) => ({
                          ...scene,
                          objects: scene.objects.map((object) =>
                            object.id === selectedObject.id
                              ? { ...object, number: event.target.value }
                              : object,
                          ),
                        }))
                      }
                      className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-base font-bold outline-none focus:border-brand-400 sm:text-sm"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    이름표
                    <input
                      value={selectedObject.label ?? ''}
                      disabled={isPlaying}
                      maxLength={8}
                      placeholder="선택"
                      onChange={(event) =>
                        updateCurrentScene((scene) => ({
                          ...scene,
                          objects: scene.objects.map((object) =>
                            object.id === selectedObject.id
                              ? { ...object, label: event.target.value }
                              : object,
                          ),
                        }))
                      }
                      className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-base font-bold outline-none focus:border-brand-400 sm:text-sm"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : selectedPath ? (
            <div className="rounded-[18px] border border-slate-200 p-3 sm:rounded-[22px] sm:p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Selected path</p>
              <h4 className="mt-1 font-black text-slate-900">
                {selectedPath.kind === 'move'
                  ? '선수 움직임'
                  : selectedPath.kind === 'pass'
                    ? '패스'
                    : '슛'}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                기존에 저장된 경로입니다. 필요하면 선택 항목 삭제로 제거할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-3 sm:rounded-[22px] sm:p-4">
              <p className="text-sm font-bold text-slate-700">코트에서 객체나 경로를 선택하세요.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                선택한 선수는 등번호와 이름표를 바꿀 수 있고, Delete 키로 빠르게 제거할 수
                있습니다.
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openProject(project.id)}
              disabled={!projectIsStored}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FolderOpen className="h-4 w-4" />
              저장본 복원
            </button>
            <button
              type="button"
              onClick={deleteStoredProject}
              disabled={!projectIsStored}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              삭제 보관함으로 이동
            </button>
          </div>

          <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[22px] sm:p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              삭제 보관함
            </p>
            {deletedProjects.length ? (
              <div className="mt-3 grid gap-2">
                <select
                  value={selectedDeletedProjectId}
                  onChange={(event) => setSelectedDeletedProjectId(event.target.value)}
                  className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-400"
                >
                  {deletedProjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {formatSavedAt(item.updatedAt)}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!selectedDeletedProjectId || isSaving}
                    onClick={restoreDeletedProject}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-brand-200 bg-white px-3 text-sm font-black text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    복구
                  </button>
                  <button
                    type="button"
                    disabled={!selectedDeletedProjectId || isSaving}
                    onClick={purgeDeletedProject}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    완전 삭제
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                삭제 보관함에 있는 전술이 없습니다.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
