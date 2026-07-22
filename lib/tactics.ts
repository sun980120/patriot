export const TACTICS_LIBRARY_KEY = 'patriot:tactics-library:v1';
export const RINK_WIDTH = 1000;
export const RINK_HEIGHT = 500;
export const DEFAULT_TACTIC_BOARD_TYPE = 'board-1';

export type TacticTool = 'select' | 'move' | 'pass' | 'shot';
export type TacticBoardType = 'board-1' | 'board-2';
export type TacticObjectKind = 'player' | 'goalie' | 'ball';
export type TacticTeam = 'home' | 'away' | 'neutral';
export type TacticPathKind = Exclude<TacticTool, 'select'>;

export const TACTIC_BOARD_OPTIONS: Array<{ value: TacticBoardType; label: string }> = [
  { value: 'board-1', label: '전술 보드 1' },
  { value: 'board-2', label: '전술 보드 2' },
];

export type TacticPoint = {
  x: number;
  y: number;
};

export type TacticObject = TacticPoint & {
  id: string;
  kind: TacticObjectKind;
  team: TacticTeam;
  number?: string;
  label?: string;
};

export type TacticPath = {
  id: string;
  kind: TacticPathKind;
  start: TacticPoint;
  end: TacticPoint;
};

export type TacticScene = {
  id: string;
  name: string;
  durationMs: number;
  objects: TacticObject[];
  paths: TacticPath[];
};

export type TacticProject = {
  version: 1;
  id: string;
  title: string;
  boardType: TacticBoardType;
  shareId?: string | null;
  shareActive?: boolean;
  updatedAt: string;
  scenes: TacticScene[];
};

export type TacticsLibrary = {
  version: 1;
  lastProjectId: string | null;
  projects: TacticProject[];
};

export type TacticShareResponse = {
  publicId: string;
  title: string;
  snapshot: TacticProject;
  createdAt: string;
};

export function createTacticId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomId}`;
}

export function createStarterProject(title = '새 전술'): TacticProject {
  return {
    version: 1,
    id: createTacticId('project'),
    title,
    boardType: DEFAULT_TACTIC_BOARD_TYPE,
    shareId: null,
    shareActive: false,
    updatedAt: new Date().toISOString(),
    scenes: [
      {
        id: createTacticId('scene'),
        name: '장면 1',
        durationMs: 1200,
        objects: [],
        paths: [],
      },
    ],
  };
}

export function cloneObjects(objects: TacticObject[]) {
  return objects.map((object) => ({ ...object }));
}

export function clonePaths(paths: TacticPath[], regenerateIds = false) {
  return paths.map((path) => ({
    ...path,
    id: regenerateIds ? createTacticId('path') : path.id,
    start: { ...path.start },
    end: { ...path.end },
  }));
}

export function createNextScene(source: TacticScene, sceneNumber: number, includePaths = false): TacticScene {
  return {
    id: createTacticId('scene'),
    name: `장면 ${sceneNumber}`,
    durationMs: source.durationMs,
    objects: cloneObjects(source.objects),
    paths: includePaths ? clonePaths(source.paths, true) : [],
  };
}

export function clampPoint(point: TacticPoint): TacticPoint {
  return {
    x: Math.min(950, Math.max(50, point.x)),
    y: Math.min(455, Math.max(45, point.y)),
  };
}

export function interpolateObjects(from: TacticObject[], to: TacticObject[], progress: number) {
  const fromById = new Map(from.map((object) => [object.id, object]));

  return to.map((target) => {
    const source = fromById.get(target.id);
    if (!source) return { ...target };

    return {
      ...target,
      x: source.x + (target.x - source.x) * progress,
      y: source.y + (target.y - source.y) * progress,
    };
  });
}

export function isTacticProject(value: unknown): value is TacticProject {
  if (!value || typeof value !== 'object') return false;
  const project = value as Partial<TacticProject>;

  return (
    project.version === 1 &&
    typeof project.id === 'string' &&
    typeof project.title === 'string' &&
    (!('boardType' in project) || isTacticBoardType(project.boardType)) &&
    Array.isArray(project.scenes) &&
    project.scenes.length > 0
  );
}

export function isTacticBoardType(value: unknown): value is TacticBoardType {
  return value === 'board-1' || value === 'board-2';
}

export function normalizeTacticProject(project: TacticProject): TacticProject {
  return {
    ...project,
    boardType: isTacticBoardType(project.boardType) ? project.boardType : DEFAULT_TACTIC_BOARD_TYPE,
    shareId: typeof project.shareId === 'string' ? project.shareId : null,
    shareActive: Boolean(project.shareActive && typeof project.shareId === 'string'),
  };
}

export function parseTacticsLibrary(value: string | null): TacticsLibrary {
  if (!value) {
    return { version: 1, lastProjectId: null, projects: [] };
  }

  try {
    const parsed = JSON.parse(value) as Partial<TacticsLibrary>;
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects.filter(isTacticProject).map(normalizeTacticProject)
      : [];

    return {
      version: 1,
      lastProjectId: typeof parsed.lastProjectId === 'string' ? parsed.lastProjectId : null,
      projects,
    };
  } catch {
    return { version: 1, lastProjectId: null, projects: [] };
  }
}

export function sanitizeFileName(value: string) {
  const sanitized = value.trim().replace(/[\\/:*?"<>|]+/g, '-');
  return sanitized || 'patriot-tactic';
}
