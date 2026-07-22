'use client';

import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useState } from 'react';
import {
  RINK_HEIGHT,
  RINK_WIDTH,
  clampPoint,
  DEFAULT_TACTIC_BOARD_TYPE,
  type TacticBoardType,
  type TacticObject,
  type TacticPath,
  type TacticPathKind,
  type TacticPoint,
  type TacticTool,
} from '@/lib/tactics';

type Interaction = {
  type: 'drag';
  pointerId: number;
  objectId: string;
  offset: TacticPoint;
} | {
  type: 'path';
  pointerId: number;
  kind: TacticPathKind;
  start: TacticPoint;
  end: TacticPoint;
} | null;

type RinkCanvasProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  objects: TacticObject[];
  paths: TacticPath[];
  selectedObjectId: string | null;
  selectedPathId: string | null;
  activeTool: TacticTool;
  boardType?: TacticBoardType;
  disabled?: boolean;
  readOnly?: boolean;
  onSelectObject: (objectId: string | null) => void;
  onSelectPath: (pathId: string | null) => void;
  onMoveObject: (objectId: string, point: TacticPoint) => void;
  onCreatePath: (kind: TacticPathKind, start: TacticPoint, end: TacticPoint) => void;
};

function pointerToRink(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;

  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function pathStroke(kind: TacticPath['kind']) {
  if (kind === 'pass') return '#38bdf8';
  if (kind === 'shot') return '#fb7185';
  return '#f8fafc';
}

function pathDash(kind: TacticPath['kind']) {
  if (kind === 'pass') return '13 10';
  if (kind === 'move') return '5 8';
  return undefined;
}

function markerId(kind: TacticPath['kind'], selected: boolean) {
  return `tactic-arrow-${kind}-${selected ? 'selected' : 'normal'}`;
}

function canStartInteraction(event: ReactPointerEvent<SVGElement>) {
  return event.isPrimary && (event.pointerType !== 'mouse' || event.button === 0);
}

const fullBoardFaceOffPoints = [
  [102, 105],
  [102, 395],
  [500, 105],
  [500, 395],
  [898, 105],
  [898, 395],
] as const;

const halfBoardFaceOffPoints = [
  [330, 130],
  [670, 130],
  [330, 440],
  [670, 440],
] as const;

export function RinkCanvas({
  svgRef,
  objects,
  paths,
  selectedObjectId,
  selectedPathId,
  activeTool,
  boardType = DEFAULT_TACTIC_BOARD_TYPE,
  disabled = false,
  readOnly = false,
  onSelectObject,
  onSelectPath,
  onMoveObject,
  onCreatePath,
}: RinkCanvasProps) {
  const [interaction, setInteraction] = useState<Interaction>(null);
  const interactionDisabled = disabled || readOnly;

  function clearSelection() {
    onSelectObject(null);
    onSelectPath(null);
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent<SVGRectElement>) {
    if (disabled || !svgRef.current || !canStartInteraction(event)) return;

    if (event.cancelable) event.preventDefault();
    clearSelection();

    if (readOnly || activeTool === 'select') return;

    const pointer = pointerToRink(svgRef.current, event.clientX, event.clientY);
    if (!pointer) return;

    svgRef.current.setPointerCapture(event.pointerId);
    const point = clampPoint(pointer);
    setInteraction({
      type: 'path',
      pointerId: event.pointerId,
      kind: activeTool,
      start: point,
      end: point,
    });
  }

  function handleObjectPointerDown(event: ReactPointerEvent<SVGGElement>, objectId: string) {
    event.stopPropagation();
    if (disabled || !svgRef.current || !canStartInteraction(event)) return;

    if (event.cancelable) event.preventDefault();
    onSelectObject(objectId);
    onSelectPath(null);
    if (readOnly) return;

    const object = objects.find((item) => item.id === objectId);
    const pointer = pointerToRink(svgRef.current, event.clientX, event.clientY);
    if (!object || !pointer) return;

    svgRef.current.setPointerCapture(event.pointerId);
    setInteraction({
      type: 'drag',
      pointerId: event.pointerId,
      objectId,
      offset: {
        x: pointer.x - object.x,
        y: pointer.y - object.y,
      },
    });
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!interaction || interaction.pointerId !== event.pointerId || !svgRef.current) return;
    if (event.cancelable) event.preventDefault();

    const pointer = pointerToRink(svgRef.current, event.clientX, event.clientY);
    if (!pointer) return;

    if (interaction.type === 'drag') {
      onMoveObject(
        interaction.objectId,
        clampPoint({
          x: pointer.x - interaction.offset.x,
          y: pointer.y - interaction.offset.y,
        }),
      );
      return;
    }

    setInteraction({ ...interaction, end: clampPoint(pointer) });
  }

  function finishInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    if (event.cancelable) event.preventDefault();

    if (interaction.type === 'path') {
      const distance = Math.hypot(
        interaction.end.x - interaction.start.x,
        interaction.end.y - interaction.start.y,
      );

      if (distance >= 28) {
        onCreatePath(interaction.kind, interaction.start, interaction.end);
      }
    }

    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
    setInteraction(null);
  }

  function cancelInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    setInteraction(null);
  }

  const previewPath =
    interaction?.type === 'path'
      ? {
          id: 'preview',
          kind: interaction.kind,
          start: interaction.start,
          end: interaction.end,
        }
      : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${RINK_WIDTH} ${RINK_HEIGHT}`}
      role="img"
      aria-label="플로어볼 전술 편집 코트"
      className={`block h-auto w-full select-none rounded-[18px] sm:rounded-[28px] ${
        disabled ? 'cursor-wait' : 'cursor-default'
      }`}
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      onDragStart={(event) => event.preventDefault()}
      onPointerMove={handlePointerMove}
      onPointerUp={finishInteraction}
      onPointerCancel={cancelInteraction}
      onLostPointerCapture={cancelInteraction}
    >
      <defs>
        {(['move', 'pass', 'shot'] as const).flatMap((kind) =>
          [false, true].map((selected) => (
            <marker
              key={`${kind}-${selected}`}
              id={markerId(kind, selected)}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerUnits="userSpaceOnUse"
              markerWidth={selected ? 16 : 14}
              markerHeight={selected ? 16 : 14}
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill={selected ? '#facc15' : pathStroke(kind)}
              />
            </marker>
          )),
        )}
        <filter id="tactic-object-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#020617" floodOpacity="0.28" />
        </filter>
        <pattern id="rink-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.18" />
        </pattern>
        <pattern id="goal-net" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 8 8 M 8 0 L 0 8" fill="none" stroke="#e0f2fe" strokeWidth="0.9" opacity="0.9" />
        </pattern>
      </defs>

      <rect width={RINK_WIDTH} height={RINK_HEIGHT} rx="42" fill="#083344" />
      {boardType === 'board-2' ? (
        <>
          <path
            d="M 260 472 L 260 92 Q 260 30 322 30 H 678 Q 740 30 740 92 L 740 472 Z"
            fill="#0b83c8"
          />
          <path
            d="M 260 472 L 260 92 Q 260 30 322 30 H 678 Q 740 30 740 92 L 740 472 Z"
            fill="url(#rink-grid)"
          />
          <path
            d="M 260 472 L 260 92 Q 260 30 322 30 H 678 Q 740 30 740 92 L 740 472"
            fill="none"
            stroke="#f8fafc"
            strokeLinejoin="round"
            strokeWidth="8"
          />
          <line x1="260" y1="440" x2="740" y2="440" stroke="#f8fafc" strokeWidth="5" />
          <circle cx="500" cy="440" r="7" fill="#f8fafc" />

          {halfBoardFaceOffPoints.map(([x, y]) => (
            <g key={`${x}-${y}`} stroke="#f8fafc" strokeLinecap="round" strokeWidth="4">
              <line x1={x - 15} y1={y} x2={x + 15} y2={y} />
              <line x1={x} y1={y - 15} x2={x} y2={y + 15} />
            </g>
          ))}

          <rect x="410" y="112" width="180" height="116" fill="none" stroke="#f8fafc" strokeWidth="4" />
          <rect x="462" y="138" width="76" height="40" fill="none" stroke="#f8fafc" strokeWidth="4" />
          <path
            d="M 466 138 L 466 116 L 534 116 L 534 138 Z"
            fill="url(#goal-net)"
            stroke="#ffffff"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <line x1="462" y1="138" x2="538" y2="138" stroke="#ef4444" strokeWidth="6" />
        </>
      ) : (
        <>
          <rect x="18" y="18" width="964" height="464" rx="34" fill="#0b83c8" />
          <rect x="18" y="18" width="964" height="464" rx="34" fill="url(#rink-grid)" />
          <rect x="28" y="28" width="944" height="444" rx="30" fill="none" stroke="#f8fafc" strokeWidth="8" />
          <line x1="500" y1="31" x2="500" y2="469" stroke="#f8fafc" strokeWidth="5" />
          <circle cx="500" cy="250" r="6" fill="#f8fafc" />

          {fullBoardFaceOffPoints.map(([x, y]) => (
            <g key={`${x}-${y}`} stroke="#f8fafc" strokeLinecap="round" strokeWidth="4">
              <line x1={x - 15} y1={y} x2={x + 15} y2={y} />
              <line x1={x} y1={y - 15} x2={x} y2={y + 15} />
            </g>
          ))}

          <rect x="116" y="178" width="120" height="144" fill="none" stroke="#f8fafc" strokeWidth="4" />
          <rect x="764" y="178" width="120" height="144" fill="none" stroke="#f8fafc" strokeWidth="4" />
          <rect x="148" y="210" width="46" height="80" fill="none" stroke="#f8fafc" strokeWidth="4" />
          <rect x="806" y="210" width="46" height="80" fill="none" stroke="#f8fafc" strokeWidth="4" />

          <path
            d="M 150 208 L 116 208 L 116 292 L 150 292 Z"
            fill="url(#goal-net)"
            stroke="#ffffff"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <line x1="150" y1="208" x2="150" y2="292" stroke="#ef4444" strokeWidth="6" />
          <path
            d="M 850 208 L 884 208 L 884 292 L 850 292 Z"
            fill="url(#goal-net)"
            stroke="#ffffff"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <line x1="850" y1="208" x2="850" y2="292" stroke="#ef4444" strokeWidth="6" />
        </>
      )}

      <rect
        x="28"
        y="28"
        width="944"
        height="444"
        rx="30"
        fill="transparent"
        onPointerDown={handleBackgroundPointerDown}
      />

      {[...paths, ...(previewPath ? [previewPath] : [])].map((path) => {
        const selected = path.id === selectedPathId;
        const preview = path.id === 'preview';
        return (
          <g
            key={path.id}
            role="button"
            tabIndex={0}
            aria-label={`${path.kind} 경로`}
            className="cursor-pointer"
            onPointerDown={(event) => {
              event.stopPropagation();
              if (disabled || preview || activeTool !== 'select' || !canStartInteraction(event)) return;
              if (event.cancelable) event.preventDefault();
              onSelectObject(null);
              onSelectPath(path.id);
            }}
            onKeyDown={(event) => {
              if (disabled || preview || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              onSelectObject(null);
              onSelectPath(path.id);
            }}
          >
            <line
              x1={path.start.x}
              y1={path.start.y}
              x2={path.end.x}
              y2={path.end.y}
              stroke="transparent"
              strokeWidth="44"
            />
            <line
              x1={path.start.x}
              y1={path.start.y}
              x2={path.end.x}
              y2={path.end.y}
              stroke={selected ? '#facc15' : pathStroke(path.kind)}
              strokeWidth={selected ? 5 : preview ? 5 : 4}
              strokeLinecap="round"
              strokeDasharray={pathDash(path.kind)}
              opacity={preview ? 0.72 : 1}
              markerEnd={`url(#${markerId(path.kind, selected)})`}
            />
          </g>
        );
      })}

      {objects.map((object) => {
        const selected = object.id === selectedObjectId;
        const isBall = object.kind === 'ball';
        const objectRadius = isBall ? 10 : 21;
        const selectedRadius = isBall ? 18 : 32;
        const fill =
          object.team === 'home' ? '#0f172a' : object.team === 'away' ? '#f59e0b' : '#f8fafc';
        const foreground = object.team === 'away' || object.team === 'neutral' ? '#0f172a' : '#ffffff';
        const handleObjectPointerStart = (event: ReactPointerEvent<SVGGElement>) => {
          if (activeTool !== 'select') return;
          handleObjectPointerDown(event, object.id);
        };

        return (
          <g
            key={object.id}
            transform={`translate(${object.x} ${object.y})`}
            role="button"
            tabIndex={0}
            aria-label={isBall ? '공' : `${object.team === 'home' ? '홈' : '원정'} ${object.kind}`}
            className={
              disabled
                ? 'cursor-wait'
                : readOnly
                  ? 'cursor-pointer'
                  : 'cursor-grab active:cursor-grabbing'
            }
            style={{ touchAction: 'none' }}
            onKeyDown={(event) => {
              if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              onSelectObject(object.id);
              onSelectPath(null);
            }}
          >
            {selected ? (
              <circle
                r={selectedRadius}
                fill="none"
                stroke="#facc15"
                strokeWidth="6"
                strokeDasharray="8 5"
                pointerEvents="none"
              />
            ) : null}
            {object.kind === 'goalie' ? (
              <rect
                onPointerDown={handleObjectPointerStart}
                x="-25"
                y="-25"
                width="50"
                height="50"
                rx="14"
                fill={fill}
                stroke="#ffffff"
                strokeWidth="4"
                filter="url(#tactic-object-shadow)"
              />
            ) : (
              <circle
                onPointerDown={handleObjectPointerStart}
                r={objectRadius}
                fill={isBall ? '#ffffff' : fill}
                stroke={isBall ? '#0f172a' : '#ffffff'}
                strokeWidth={isBall ? 3 : 4}
                filter="url(#tactic-object-shadow)"
              />
            )}
            {!isBall ? (
              <text
                x="0"
                y="6"
                textAnchor="middle"
                fontSize="17"
                fontWeight="900"
                fill={foreground}
                pointerEvents="none"
              >
                {object.number || (object.kind === 'goalie' ? 'G' : '')}
              </text>
            ) : null}
            {object.label ? (
              <g pointerEvents="none">
                <rect
                  x="-40"
                  y="32"
                  width="80"
                  height="24"
                  rx="12"
                  fill="#ffffff"
                  opacity="0.92"
                />
                <text x="0" y="49" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">
                  {object.label.slice(0, 8)}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
