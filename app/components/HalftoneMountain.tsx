"use client";

import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";

const DESKTOP_GRID = { columns: 82, rows: 36 };
const MOBILE_GRID = { columns: 56, rows: 28 };
const INITIAL_SEED = 6611;
const PIXEL_SEED = 9437;
const INTERACTION_RADIUS = 0.32;
const CLICK_MORPH_DURATION = 760;
const AUTO_MORPH_DURATION = 12000;
const HAZE_FADE_DURATION = 560;
const DESKTOP_FRAME_INTERVAL = 40;
const MOBILE_FRAME_INTERVAL = 56;

const LAYER_ORDER = ["far", "midFar", "mid", "front"] as const;

type Position = { x: number; y: number };
type Layer = (typeof LAYER_ORDER)[number];
type RidgePoint = { x: number; y: number };
type DensityIsland = { x: number; y: number; spreadX: number; spreadY: number; weight: number };

type LineField = {
  y: number;
  start: number;
  end: number;
  gap: number;
};

type LayerComposition = {
  ridge: RidgePoint[];
  dense: DensityIsland[];
  hollow: DensityIsland[];
  lines: LineField[];
  foot: number;
  phase: number;
};

type MountainComposition = Record<Layer, LayerComposition>;

type LayerStyle = {
  densityScale: number;
  pixelScale: number;
  opacityBase: number;
  opacityRange: number;
  activationAlpha: number;
  densityBoost: number;
  fadeStart: number;
  fadeEnd: number;
  peakMin: number;
  peakMax: number;
  foot: number;
  lineCount: number;
  squareRowCount: number;
  lineGap: number;
  xStart: number;
  xEnd: number;
};

const LAYER_STYLES: Record<Layer, LayerStyle> = {
  far: {
    densityScale: 0.6,
    pixelScale: 0.68,
    opacityBase: 0.18,
    opacityRange: 0.12,
    activationAlpha: 0.14,
    densityBoost: 0.38,
    fadeStart: 0.75,
    fadeEnd: 0.81,
    peakMin: 0.2,
    peakMax: 0.27,
    foot: 0.8,
    lineCount: 5,
    squareRowCount: 1,
    lineGap: 0.4,
    xStart: 0.03,
    xEnd: 0.97,
  },
  midFar: {
    densityScale: 0.74,
    pixelScale: 0.82,
    opacityBase: 0.28,
    opacityRange: 0.14,
    activationAlpha: 0.17,
    densityBoost: 0.44,
    fadeStart: 0.8,
    fadeEnd: 0.87,
    peakMin: 0.27,
    peakMax: 0.36,
    foot: 0.86,
    lineCount: 7,
    squareRowCount: 1,
    lineGap: 0.32,
    xStart: 0.05,
    xEnd: 0.95,
  },
  mid: {
    densityScale: 0.88,
    pixelScale: 0.94,
    opacityBase: 0.42,
    opacityRange: 0.18,
    activationAlpha: 0.2,
    densityBoost: 0.5,
    fadeStart: 0.85,
    fadeEnd: 0.92,
    peakMin: 0.33,
    peakMax: 0.43,
    foot: 0.91,
    lineCount: 8,
    squareRowCount: 2,
    lineGap: 0.25,
    xStart: 0.07,
    xEnd: 0.93,
  },
  front: {
    densityScale: 1.12,
    pixelScale: 1.1,
    opacityBase: 0.64,
    opacityRange: 0.24,
    activationAlpha: 0.26,
    densityBoost: 0.58,
    fadeStart: 0.9,
    fadeEnd: 0.96,
    peakMin: 0.34,
    peakMax: 0.44,
    foot: 0.97,
    lineCount: 10,
    squareRowCount: 2,
    lineGap: 0.18,
    xStart: 0.06,
    xEnd: 0.94,
  },
};

const ARCHETYPES: Array<Record<Layer, number>> = [
  { far: 0.66, midFar: 0.36, mid: 0.57, front: 0.43 },
  { far: 0.34, midFar: 0.69, mid: 0.48, front: 0.62 },
  { far: 0.55, midFar: 0.28, mid: 0.71, front: 0.42 },
  { far: 0.72, midFar: 0.44, mid: 0.27, front: 0.59 },
];

function random(seed: number, column: number, row: number, channel: number) {
  let value =
    seed ^
    Math.imul(column + 1, 374761393) ^
    Math.imul(row + 1, 668265263) ^
    Math.imul(channel + 1, -2048144789);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function sample(seed: number, layerIndex: number, channel: number, min: number, max: number) {
  return min + random(seed, layerIndex, channel, 73) * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function gaussian(value: number, center: number, spread: number) {
  const distance = (value - center) / spread;
  return Math.exp(-0.5 * distance * distance);
}

function nextSeed(seed: number) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function smoothStep(edge0: number, edge1: number, value: number) {
  const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function smoothFalloff(distance: number, radius: number) {
  return 1 - smoothStep(0, radius, distance);
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function easeInOutSine(progress: number) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

function generateLayer(
  layer: Layer,
  layerIndex: number,
  seed: number,
  mainPeakBase: number,
): LayerComposition {
  const style = LAYER_STYLES[layer];
  const foot = style.foot + sample(seed, layerIndex, 1, -0.014, 0.014);
  const mainX = clamp(
    mainPeakBase + sample(seed, layerIndex, 2, -0.085, 0.085),
    0.22,
    0.78,
  );
  const mainY = sample(seed, layerIndex, 3, style.peakMin, style.peakMax);
  const leftX = clamp(
    mainX - sample(seed, layerIndex, 4, 0.19, 0.31),
    style.xStart + 0.055,
    mainX - 0.12,
  );
  const rightX = clamp(
    mainX + sample(seed, layerIndex, 5, 0.18, 0.3),
    mainX + 0.12,
    style.xEnd - 0.055,
  );
  const leftY = clamp(
    mainY + sample(seed, layerIndex, 6, 0.13, 0.23),
    mainY + 0.1,
    foot - 0.13,
  );
  const rightY = clamp(
    mainY + sample(seed, layerIndex, 7, 0.12, 0.23),
    mainY + 0.09,
    foot - 0.13,
  );
  const leftValleyX = lerp(leftX, mainX, sample(seed, layerIndex, 8, 0.43, 0.61));
  const rightValleyX = lerp(mainX, rightX, sample(seed, layerIndex, 9, 0.4, 0.6));
  const leftValleyY = clamp(
    Math.max(leftY, mainY) + sample(seed, layerIndex, 10, 0.055, 0.13),
    mainY + 0.1,
    foot - 0.07,
  );
  const rightValleyY = clamp(
    Math.max(rightY, mainY) + sample(seed, layerIndex, 11, 0.055, 0.135),
    mainY + 0.1,
    foot - 0.07,
  );
  const phase = sample(seed, layerIndex, 12, 0, Math.PI * 2);
  const densityMassScale = layer === "front" ? 1.16 : 1;

  const ridge: RidgePoint[] = [
    { x: style.xStart, y: foot - sample(seed, layerIndex, 13, 0.055, 0.12) },
    { x: leftX, y: leftY },
    { x: leftValleyX, y: leftValleyY },
    {
      x: lerp(leftValleyX, mainX, 0.72),
      y: mainY + sample(seed, layerIndex, 14, 0.02, 0.055),
    },
    { x: mainX, y: mainY },
    {
      x: lerp(mainX, rightValleyX, 0.3),
      y: mainY + sample(seed, layerIndex, 15, 0.025, 0.06),
    },
    { x: rightValleyX, y: rightValleyY },
    { x: rightX, y: rightY },
    { x: style.xEnd, y: foot - sample(seed, layerIndex, 16, 0.05, 0.115) },
  ];

  const dense: DensityIsland[] = [
    {
      x: leftX + sample(seed, layerIndex, 17, -0.025, 0.025),
      y: leftY + sample(seed, layerIndex, 18, 0.065, 0.14),
      spreadX: sample(seed, layerIndex, 19, 0.075, 0.13) * densityMassScale,
      spreadY: sample(seed, layerIndex, 20, 0.08, 0.14) * densityMassScale,
      weight: sample(seed, layerIndex, 21, 0.72, 1.02),
    },
    {
      x: mainX + sample(seed, layerIndex, 22, -0.025, 0.025),
      y: mainY + sample(seed, layerIndex, 23, 0.07, 0.145),
      spreadX: sample(seed, layerIndex, 24, 0.075, 0.125) * densityMassScale,
      spreadY: sample(seed, layerIndex, 25, 0.09, 0.15) * densityMassScale,
      weight: sample(seed, layerIndex, 26, 0.88, 1.18),
    },
    {
      x: rightX + sample(seed, layerIndex, 27, -0.025, 0.025),
      y: rightY + sample(seed, layerIndex, 28, 0.065, 0.14),
      spreadX: sample(seed, layerIndex, 29, 0.08, 0.145) * densityMassScale,
      spreadY: sample(seed, layerIndex, 30, 0.08, 0.145) * densityMassScale,
      weight: sample(seed, layerIndex, 31, 0.7, 1.06),
    },
  ];

  const hollow: DensityIsland[] = [
    {
      x: leftValleyX,
      y: leftValleyY + sample(seed, layerIndex, 32, 0.035, 0.09),
      spreadX: sample(seed, layerIndex, 33, 0.06, 0.1),
      spreadY: sample(seed, layerIndex, 34, 0.075, 0.13),
      weight: sample(seed, layerIndex, 35, 0.76, 1.08),
    },
    {
      x: rightValleyX,
      y: rightValleyY + sample(seed, layerIndex, 36, 0.035, 0.09),
      spreadX: sample(seed, layerIndex, 37, 0.06, 0.1),
      spreadY: sample(seed, layerIndex, 38, 0.075, 0.13),
      weight: sample(seed, layerIndex, 39, 0.78, 1.12),
    },
  ];

  const lines = Array.from({ length: style.lineCount }, (_, lineIndex): LineField => {
    const channel = 45 + lineIndex * 4;
    const lineProgress = (lineIndex + 0.65) / (style.lineCount + 0.3);
    const startAnchor = lerp(
      style.xStart + 0.025,
      Math.min(0.61, style.xEnd - 0.24),
      lineProgress,
    );
    const start = clamp(
      startAnchor + sample(seed, layerIndex, channel, -0.045, 0.045),
      style.xStart - 0.02,
      style.xEnd - 0.18,
    );
    const lengthAnchor =
      (layer === "front" ? 0.194 : 0.164) + (lineIndex % 3) * 0.023;
    const length = clamp(
      lengthAnchor + sample(seed, layerIndex, channel + 1, -0.024, 0.024),
      0.11,
      layer === "front" ? 0.28 : 0.24,
    );
    const fullLineYMin = Math.max(0.34, style.fadeStart - 0.2);
    const fullLineYMax = style.fadeEnd;
    const lineYInset = (fullLineYMax - fullLineYMin) / 6;
    const lineYMin = fullLineYMin + lineYInset;
    const lineYMax = fullLineYMax - lineYInset;
    const lineYAnchor = lerp(lineYMin, lineYMax, lineProgress);
    return {
      y: clamp(
        lineYAnchor + sample(seed, layerIndex, channel + 2, -0.018, 0.018),
        lineYMin,
        lineYMax,
      ),
      start,
      end: Math.min(0.98, start + length),
      gap: clamp(
        style.lineGap + sample(seed, layerIndex, channel + 3, -0.08, 0.08),
        0.08,
        0.48,
      ),
    };
  });

  return { ridge, dense, hollow, lines, foot, phase };
}

function generateMountain(seed: number): MountainComposition {
  const archetype = ARCHETYPES[seed % ARCHETYPES.length];
  return Object.fromEntries(
    LAYER_ORDER.map((layer, layerIndex) => [
      layer,
      generateLayer(layer, layerIndex, seed, archetype[layer]),
    ]),
  ) as MountainComposition;
}

function interpolateIsland(from: DensityIsland, to: DensityIsland, progress: number) {
  return {
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    spreadX: lerp(from.spreadX, to.spreadX, progress),
    spreadY: lerp(from.spreadY, to.spreadY, progress),
    weight: lerp(from.weight, to.weight, progress),
  };
}

function interpolateMountain(
  from: MountainComposition,
  to: MountainComposition,
  progress: number,
): MountainComposition {
  return Object.fromEntries(
    LAYER_ORDER.map((layer) => {
      const fromLayer = from[layer];
      const toLayer = to[layer];
      return [
        layer,
        {
          ridge: fromLayer.ridge.map((point, index) => ({
            x: lerp(point.x, toLayer.ridge[index].x, progress),
            y: lerp(point.y, toLayer.ridge[index].y, progress),
          })),
          dense: fromLayer.dense.map((island, index) =>
            interpolateIsland(island, toLayer.dense[index], progress),
          ),
          hollow: fromLayer.hollow.map((island, index) =>
            interpolateIsland(island, toLayer.hollow[index], progress),
          ),
          lines: fromLayer.lines.map((line, index) => ({
            y: lerp(line.y, toLayer.lines[index].y, progress),
            start: lerp(line.start, toLayer.lines[index].start, progress),
            end: lerp(line.end, toLayer.lines[index].end, progress),
            gap: lerp(line.gap, toLayer.lines[index].gap, progress),
          })),
          foot: lerp(fromLayer.foot, toLayer.foot, progress),
          phase: lerp(fromLayer.phase, toLayer.phase, progress),
        } satisfies LayerComposition,
      ];
    }),
  ) as MountainComposition;
}

function ridge(layer: Layer, composition: LayerComposition, x: number) {
  const points = composition.ridge;
  let segment = 0;
  while (segment < points.length - 2 && x > points[segment + 1].x) segment += 1;
  const from = points[segment];
  const to = points[segment + 1];
  const progress = smoothStep(from.x, to.x, x);
  const layerIndex = LAYER_ORDER.indexOf(layer);
  const profile = lerp(from.y, to.y, progress);
  const irregularity =
    Math.sin(x * (17 + layerIndex * 5) + composition.phase) * 0.006 +
    Math.sin(x * (41 + layerIndex * 6) - composition.phase * 0.7) * 0.003;
  return clamp(profile + irregularity, 0.12, 0.9);
}

function layerFoot(layer: Layer, composition: LayerComposition, x: number) {
  const layerIndex = LAYER_ORDER.indexOf(layer);
  return (
    composition.foot +
    Math.sin(x * (9 + layerIndex * 1.7) + composition.phase) * 0.012 +
    Math.sin(x * (25 + layerIndex * 2.3) - composition.phase) * 0.006
  );
}

function density(layer: Layer, composition: LayerComposition, x: number, y: number) {
  const layerIndex = LAYER_ORDER.indexOf(layer);
  const warpX = x + Math.sin(y * 16 + composition.phase) * 0.018;
  const warpY = y + Math.sin(x * 20 - composition.phase * 0.8) * 0.015;
  const islandValue = (island: DensityIsland) =>
    gaussian(warpX, island.x, island.spreadX) *
    gaussian(warpY, island.y, island.spreadY) *
    island.weight;
  const dense = composition.dense.reduce((sum, island) => sum + islandValue(island), 0);
  const hollow = composition.hollow.reduce((sum, island) => sum + islandValue(island), 0);
  const score =
    0.1 +
    dense -
    hollow +
    Math.sin(x * (11 + layerIndex * 2) + y * 9 + composition.phase) * 0.045;
  const rawDensity = score > 0.68 ? 0.99 : score > 0.38 ? 0.82 : score > 0.16 ? 0.5 : 0.12;
  return rawDensity * LAYER_STYLES[layer].densityScale;
}

const INITIAL_COMPOSITION = generateMountain(INITIAL_SEED);

export default function HalftoneMountain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const morphFrameRef = useRef<number | null>(null);
  const hazeFrameRef = useRef<number | null>(null);
  const recoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const positionRef = useRef<Position | null>(null);
  const hazeStrengthRef = useRef(0);
  const seedRef = useRef(INITIAL_SEED);
  const currentCompositionRef = useRef(INITIAL_COMPOSITION);
  const previousCompositionRef = useRef(INITIAL_COMPOSITION);
  const morphProgressRef = useRef(1);
  const startAutoMorphRef = useRef<() => void>(() => undefined);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMedia = window.matchMedia("(max-width: 767px)");
    const updateMotion = () => {
      reducedMotionRef.current = motionMedia.matches;
      setReducedMotion(motionMedia.matches);
    };
    const updateGrid = () => setIsMobile(mobileMedia.matches);
    updateMotion();
    updateGrid();
    motionMedia.addEventListener("change", updateMotion);
    mobileMedia.addEventListener("change", updateGrid);
    return () => {
      motionMedia.removeEventListener("change", updateMotion);
      mobileMedia.removeEventListener("change", updateGrid);
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const grid = isMobile ? MOBILE_GRID : DESKTOP_GRID;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const canvasWidth = Math.round(bounds.width * pixelRatio);
    const canvasHeight = Math.round(bounds.height * pixelRatio);
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);
    context.fillStyle = "#111";

    const composition = interpolateMountain(
      previousCompositionRef.current,
      currentCompositionRef.current,
      morphProgressRef.current,
    );
    const cellWidth = bounds.width / grid.columns;
    const cellHeight = bounds.height / grid.rows;

    LAYER_ORDER.forEach((layer, layerIndex) => {
      const layerComposition = composition[layer];
      const style = LAYER_STYLES[layer];
      const nearerLayer = LAYER_ORDER[layerIndex + 1];

      for (let row = 0; row < grid.rows; row += 1) {
        for (let column = 0; column < grid.columns; column += 1) {
          const x = (column + 0.5) / grid.columns;
          const y = (row + 0.5) / grid.rows;
          const mountainRidge = ridge(layer, layerComposition, x);
          const foot = layerFoot(layer, layerComposition, x);
          if (x < style.xStart || x > style.xEnd || y < mountainRidge || y > foot) continue;

          if (nearerLayer) {
            const nearerStyle = LAYER_STYLES[nearerLayer];
            if (x >= nearerStyle.xStart && x <= nearerStyle.xEnd) {
              const nearerRidge = ridge(nearerLayer, composition[nearerLayer], x);
              if (y >= nearerRidge) continue;
            }
          }

          const ridgeDistance = y - mountainRidge;
          const terrainDepth = ridgeDistance / Math.max(0.08, foot - mountainRidge);
          const depthFade = 1 - smoothStep(0.82, 1, terrainDepth);
          const verticalFade = 1 - smoothStep(style.fadeStart, style.fadeEnd, y);
          const footFade = depthFade * verticalFade;
          const baseDensity = density(layer, layerComposition, x, y);
          const distance = positionRef.current
            ? Math.hypot(x - positionRef.current.x, (y - positionRef.current.y) * 1.3)
            : Infinity;
          const influence = smoothFalloff(distance, INTERACTION_RADIUS);
          const activation = influence * hazeStrengthRef.current;
          const ridgeBand = ridgeDistance >= 0 && ridgeDistance < 0.04;
          const ridgeChance = 0.48 + style.densityScale * 0.38;
          const silhouetteChance = Math.max(ridgeBand ? ridgeChance : 0, baseDensity);
          const visibleChance = Math.min(
            0.98,
            silhouetteChance * (0.04 + footFade * 0.96) +
              activation * style.densityBoost * 0.42,
          );
          if (random(PIXEL_SEED + layerIndex * 97, column, row, 0) > visibleChance) continue;

          const jitterX =
            (random(PIXEL_SEED, column, row, 1 + layerIndex) - 0.5) * cellWidth * 0.06;
          const jitterY =
            (random(PIXEL_SEED, column, row, 5 + layerIndex) - 0.5) * cellHeight * 0.045;
          const sizeNoise = 0.93 + random(PIXEL_SEED, column, row, 9 + layerIndex) * 0.14;
          const pixelScale = (0.2 + baseDensity * 0.72) * style.pixelScale;
          const footScale = 0.7 + footFade * 0.3;
          const sizeBoost = 0.48 + style.pixelScale * 0.24;
          const activatedScale =
            pixelScale * sizeNoise * footScale * (1 + activation * sizeBoost * 0.36);
          const pixelWidth = cellWidth * Math.min(0.86, activatedScale);
          const pixelHeight = cellHeight * Math.min(0.82, activatedScale);
          const fadeAlpha = 0.34 + footFade * 0.66;
          context.globalAlpha = Math.min(
            1,
            (style.opacityBase + baseDensity * style.opacityRange) * fadeAlpha +
              activation * style.activationAlpha * 0.26,
          );
          context.fillRect(
            Math.round((column + 0.5) * cellWidth + jitterX - pixelWidth / 2),
            Math.round((row + 0.5) * cellHeight + jitterY - pixelHeight / 2),
            Math.max(1, Math.round(pixelWidth)),
            Math.max(1, Math.round(pixelHeight)),
          );
        }
      }

      layerComposition.lines.forEach((field, fieldIndex) => {
        const isSquareReplacement =
          fieldIndex >= style.lineCount - style.squareRowCount;
        const segmentCount = Math.max(3, Math.round((field.end - field.start) * grid.columns));
        const segmentWidth = (field.end - field.start) / segmentCount;
        for (let segment = 0; segment < segmentCount; segment += 1) {
          const segmentX = field.start + segment * segmentWidth;
          const mountainRidge = ridge(layer, layerComposition, segmentX);
          const foot = layerFoot(layer, layerComposition, segmentX);
          if (field.y < mountainRidge - 0.014 || field.y > foot + 0.014) continue;
          const lineFootFade = 1 - smoothStep(style.fadeStart, style.fadeEnd, field.y);
          if (lineFootFade <= 0.16) continue;
          const localInfluence = positionRef.current
            ? smoothFalloff(
                Math.hypot(
                  segmentX - positionRef.current.x,
                  (field.y - positionRef.current.y) * 1.3,
                ),
                INTERACTION_RADIUS,
              )
            : 0;
          const activation = localInfluence * hazeStrengthRef.current;
          const gapChance = Math.max(0.01, field.gap - activation * 0.28);
          if (
            !isSquareReplacement &&
            random(PIXEL_SEED + layerIndex * 53, segment, fieldIndex, 18) < gapChance
          ) {
            continue;
          }
          const replacementColumn = clamp(
            Math.round(segmentX * grid.columns - 0.5),
            0,
            grid.columns - 1,
          );
          const replacementRow = clamp(
            Math.round(field.y * grid.rows - 0.5),
            0,
            grid.rows - 1,
          );
          const replacementDensity = density(
            layer,
            layerComposition,
            segmentX,
            field.y,
          );
          const terrainDepth =
            (field.y - mountainRidge) / Math.max(0.08, foot - mountainRidge);
          const replacementFootFade =
            (1 - smoothStep(0.82, 1, terrainDepth)) * lineFootFade;
          const replacementVisibleChance = Math.min(
            0.98,
            replacementDensity * (0.04 + replacementFootFade * 0.96) +
              activation * style.densityBoost * 0.42,
          );
          if (
            isSquareReplacement &&
            random(
              PIXEL_SEED + layerIndex * 97,
              replacementColumn,
              replacementRow,
              0,
            ) > replacementVisibleChance
          ) {
            continue;
          }
          const replacementSizeNoise =
            0.93 +
            random(
              PIXEL_SEED,
              replacementColumn,
              replacementRow,
              9 + layerIndex,
            ) *
              0.14;
          const replacementPixelScale =
            (0.2 + replacementDensity * 0.72) * style.pixelScale;
          const replacementFootScale = 0.7 + replacementFootFade * 0.3;
          const replacementActivatedScale =
            replacementPixelScale *
            replacementSizeNoise *
            replacementFootScale *
            (1 + activation * (0.48 + style.pixelScale * 0.24) * 0.36);
          const pixelRowWidth = isSquareReplacement
            ? cellWidth * Math.min(0.86, replacementActivatedScale)
            : segmentWidth *
              bounds.width *
              (0.7 + activation * (0.52 + style.pixelScale * 0.42));
          const pixelRowHeight = isSquareReplacement
            ? cellHeight * Math.min(0.82, replacementActivatedScale)
            : Math.max(
                1,
                Math.round(
                  cellHeight *
                    (0.07 + style.pixelScale * 0.06) *
                    (1 + activation * (0.14 + style.pixelScale * 0.16)),
                ),
              );
          const replacementJitterX = isSquareReplacement
            ? (random(
                PIXEL_SEED,
                replacementColumn,
                replacementRow,
                1 + layerIndex,
              ) -
                0.5) *
              cellWidth *
              0.06
            : 0;
          const replacementJitterY = isSquareReplacement
            ? (random(
                PIXEL_SEED,
                replacementColumn,
                replacementRow,
                5 + layerIndex,
              ) -
                0.5) *
              cellHeight *
              0.045
            : 0;
          const replacementFadeAlpha = 0.34 + replacementFootFade * 0.66;
          context.globalAlpha = isSquareReplacement
            ? Math.min(
                1,
                (style.opacityBase + replacementDensity * style.opacityRange) *
                  replacementFadeAlpha +
                  activation * style.activationAlpha * 0.26,
              )
            : Math.min(
                1,
                (style.opacityBase +
                  style.opacityRange * 0.65 +
                  activation * style.activationAlpha * 0.24) *
                  lineFootFade,
              );
          context.fillRect(
            Math.round(
              (isSquareReplacement
                ? (replacementColumn + 0.5) * cellWidth - pixelRowWidth / 2
                : segmentX * bounds.width) + replacementJitterX,
            ),
            Math.round(
              (isSquareReplacement
                ? (replacementRow + 0.5) * cellHeight
                : field.y * bounds.height) +
                replacementJitterY -
                pixelRowHeight / 2,
            ),
            Math.max(1, Math.round(pixelRowWidth)),
            pixelRowHeight,
          );
        }
      });
    });

    const hazePosition = positionRef.current;
    const hazeStrength = hazeStrengthRef.current;
    if (hazePosition && hazeStrength > 0.01) {
      const centerX = hazePosition.x * bounds.width;
      const centerY = hazePosition.y * bounds.height;
      const lobes = [
        { x: 0, y: 0, radius: 0.17, alpha: 0.38 },
        { x: -0.058, y: 0.022, radius: 0.12, alpha: 0.24 },
        { x: 0.068, y: -0.016, radius: 0.1, alpha: 0.18 },
      ];

      context.save();
      context.globalCompositeOperation = "destination-out";
      lobes.forEach((lobe) => {
        const radius = bounds.width * lobe.radius;
        const x = centerX + bounds.width * lobe.x;
        const y = centerY + bounds.height * lobe.y;
        const alpha = lobe.alpha * hazeStrength;
        const haze = context.createRadialGradient(x, y, 0, x, y, radius);
        haze.addColorStop(0, `rgb(0 0 0 / ${alpha})`);
        haze.addColorStop(0.42, `rgb(0 0 0 / ${alpha * 0.68})`);
        haze.addColorStop(1, "rgb(0 0 0 / 0)");
        context.fillStyle = haze;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });
      context.restore();
    }
    context.globalAlpha = 1;
  }, [isMobile]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  const startMorph = useCallback(
    (duration: number, mode: "auto" | "click") => {
      if (reducedMotionRef.current || !isVisibleRef.current) return;
      if (morphFrameRef.current !== null) cancelAnimationFrame(morphFrameRef.current);

      const activeComposition = interpolateMountain(
        previousCompositionRef.current,
        currentCompositionRef.current,
        morphProgressRef.current,
      );
      seedRef.current = nextSeed(seedRef.current);
      previousCompositionRef.current = activeComposition;
      currentCompositionRef.current = generateMountain(seedRef.current);
      morphProgressRef.current = 0;

      const startedAt = performance.now();
      const frameInterval = isMobile ? MOBILE_FRAME_INTERVAL : DESKTOP_FRAME_INTERVAL;
      let lastDrawAt = 0;
      const morph = (now: number) => {
        if (reducedMotionRef.current || !isVisibleRef.current) {
          morphFrameRef.current = null;
          return;
        }

        const linearProgress = Math.min(1, (now - startedAt) / duration);
        morphProgressRef.current =
          mode === "auto" ? easeInOutSine(linearProgress) : easeOutCubic(linearProgress);

        if (now - lastDrawAt >= frameInterval || linearProgress === 1) {
          draw();
          lastDrawAt = now;
        }

        if (linearProgress < 1) {
          morphFrameRef.current = requestAnimationFrame(morph);
          return;
        }

        previousCompositionRef.current = currentCompositionRef.current;
        morphProgressRef.current = 1;
        morphFrameRef.current = null;
        startAutoMorphRef.current();
      };

      morphFrameRef.current = requestAnimationFrame(morph);
    },
    [draw, isMobile],
  );

  useEffect(() => {
    startAutoMorphRef.current = () => startMorph(AUTO_MORPH_DURATION, "auto");
    return () => {
      startAutoMorphRef.current = () => undefined;
    };
  }, [startMorph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!("IntersectionObserver" in window)) {
      isVisibleRef.current = true;
      if (!reducedMotionRef.current) startAutoMorphRef.current();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const becameVisible = entry.isIntersecting && !isVisibleRef.current;
        isVisibleRef.current = entry.isIntersecting;
        if (becameVisible && !reducedMotionRef.current) {
          startAutoMorphRef.current();
        } else if (!entry.isIntersecting) {
          if (morphFrameRef.current !== null) cancelAnimationFrame(morphFrameRef.current);
          if (hazeFrameRef.current !== null) cancelAnimationFrame(hazeFrameRef.current);
          if (recoveryRef.current) clearTimeout(recoveryRef.current);
          morphFrameRef.current = null;
          hazeFrameRef.current = null;
          const activeComposition = interpolateMountain(
            previousCompositionRef.current,
            currentCompositionRef.current,
            morphProgressRef.current,
          );
          previousCompositionRef.current = activeComposition;
          currentCompositionRef.current = activeComposition;
          morphProgressRef.current = 1;
          hazeStrengthRef.current = 0;
          positionRef.current = null;
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!reducedMotion) {
      if (isVisibleRef.current && morphFrameRef.current === null) {
        startAutoMorphRef.current();
      }
      return;
    }

    if (morphFrameRef.current !== null) cancelAnimationFrame(morphFrameRef.current);
    if (hazeFrameRef.current !== null) cancelAnimationFrame(hazeFrameRef.current);
    morphFrameRef.current = null;
    hazeFrameRef.current = null;
    const activeComposition = interpolateMountain(
      previousCompositionRef.current,
      currentCompositionRef.current,
      morphProgressRef.current,
    );
    previousCompositionRef.current = activeComposition;
    currentCompositionRef.current = activeComposition;
    morphProgressRef.current = 1;
    hazeStrengthRef.current = 0;
    positionRef.current = null;
    draw();
  }, [draw, reducedMotion]);

  useEffect(
    () => () => {
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      if (morphFrameRef.current !== null) cancelAnimationFrame(morphFrameRef.current);
      if (hazeFrameRef.current !== null) cancelAnimationFrame(hazeFrameRef.current);
      if (recoveryRef.current) clearTimeout(recoveryRef.current);
    },
    [],
  );

  const fadeHaze = useCallback(() => {
    if (recoveryRef.current) clearTimeout(recoveryRef.current);
    if (hazeFrameRef.current !== null) cancelAnimationFrame(hazeFrameRef.current);
    if (reducedMotionRef.current || hazeStrengthRef.current <= 0) return;

    const startedAt = performance.now();
    const initialStrength = hazeStrengthRef.current;
    const fade = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / HAZE_FADE_DURATION);
      hazeStrengthRef.current = initialStrength * (1 - easeOutCubic(progress));
      draw();
      if (progress < 1) {
        hazeFrameRef.current = requestAnimationFrame(fade);
        return;
      }
      hazeFrameRef.current = null;
      hazeStrengthRef.current = 0;
      positionRef.current = null;
      draw();
    };
    hazeFrameRef.current = requestAnimationFrame(fade);
  }, [draw]);

  const updatePosition = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (reducedMotionRef.current || !isVisibleRef.current) return;
      if (hazeFrameRef.current !== null) cancelAnimationFrame(hazeFrameRef.current);
      if (recoveryRef.current) clearTimeout(recoveryRef.current);
      const bounds = event.currentTarget.getBoundingClientRect();
      positionRef.current = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      };
      hazeStrengthRef.current = 1;
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = requestAnimationFrame(draw);
      if (event.pointerType !== "mouse") {
        recoveryRef.current = setTimeout(fadeHaze, 120);
      }
    },
    [draw, fadeHaze],
  );

  const regenerate = useCallback(() => {
    if (reducedMotionRef.current) return;
    startMorph(CLICK_MORPH_DURATION, "click");
  }, [startMorph]);

  return (
    <div className="halftone-mountain-shell">
      <canvas
        ref={canvasRef}
        className="halftone-mountain"
        aria-hidden="true"
        onClick={regenerate}
        onPointerDown={updatePosition}
        onPointerCancel={fadeHaze}
        onPointerLeave={fadeHaze}
        onPointerMove={(event) => event.pointerType === "mouse" && updatePosition(event)}
      />
    </div>
  );
}
