"use client";

import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";

const DESKTOP_GRID = { columns: 82, rows: 36 };
const MOBILE_GRID = { columns: 56, rows: 28 };
const INITIAL_SEED = 6611;
const PIXEL_SEED = 9437;
const INTERACTION_RADIUS = 0.245;
const MORPH_DURATION = 760;

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
  lineGap: number;
  xStart: number;
  xEnd: number;
};

const LAYER_STYLES: Record<Layer, LayerStyle> = {
  far: {
    densityScale: 0.5,
    pixelScale: 0.65,
    opacityBase: 0.18,
    opacityRange: 0.12,
    activationAlpha: 0.14,
    densityBoost: 0.3,
    fadeStart: 0.6,
    fadeEnd: 0.78,
    peakMin: 0.2,
    peakMax: 0.27,
    foot: 0.8,
    lineCount: 3,
    lineGap: 0.4,
    xStart: 0.03,
    xEnd: 0.97,
  },
  midFar: {
    densityScale: 0.62,
    pixelScale: 0.78,
    opacityBase: 0.28,
    opacityRange: 0.14,
    activationAlpha: 0.17,
    densityBoost: 0.35,
    fadeStart: 0.66,
    fadeEnd: 0.84,
    peakMin: 0.27,
    peakMax: 0.36,
    foot: 0.86,
    lineCount: 4,
    lineGap: 0.32,
    xStart: 0.05,
    xEnd: 0.95,
  },
  mid: {
    densityScale: 0.75,
    pixelScale: 0.9,
    opacityBase: 0.42,
    opacityRange: 0.18,
    activationAlpha: 0.2,
    densityBoost: 0.4,
    fadeStart: 0.7,
    fadeEnd: 0.88,
    peakMin: 0.33,
    peakMax: 0.43,
    foot: 0.91,
    lineCount: 5,
    lineGap: 0.25,
    xStart: 0.07,
    xEnd: 0.93,
  },
  front: {
    densityScale: 0.9,
    pixelScale: 1,
    opacityBase: 0.58,
    opacityRange: 0.22,
    activationAlpha: 0.26,
    densityBoost: 0.46,
    fadeStart: 0.76,
    fadeEnd: 0.94,
    peakMin: 0.4,
    peakMax: 0.5,
    foot: 0.96,
    lineCount: 6,
    lineGap: 0.18,
    xStart: 0.09,
    xEnd: 0.91,
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
      spreadX: sample(seed, layerIndex, 19, 0.075, 0.13),
      spreadY: sample(seed, layerIndex, 20, 0.08, 0.14),
      weight: sample(seed, layerIndex, 21, 0.72, 1.02),
    },
    {
      x: mainX + sample(seed, layerIndex, 22, -0.025, 0.025),
      y: mainY + sample(seed, layerIndex, 23, 0.07, 0.145),
      spreadX: sample(seed, layerIndex, 24, 0.075, 0.125),
      spreadY: sample(seed, layerIndex, 25, 0.09, 0.15),
      weight: sample(seed, layerIndex, 26, 0.88, 1.18),
    },
    {
      x: rightX + sample(seed, layerIndex, 27, -0.025, 0.025),
      y: rightY + sample(seed, layerIndex, 28, 0.065, 0.14),
      spreadX: sample(seed, layerIndex, 29, 0.08, 0.145),
      spreadY: sample(seed, layerIndex, 30, 0.08, 0.145),
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
    const start = sample(seed, layerIndex, channel, style.xStart - 0.02, 0.64);
    const length = sample(seed, layerIndex, channel + 1, 0.16, layer === "front" ? 0.46 : 0.39);
    return {
      y: sample(
        seed,
        layerIndex,
        channel + 2,
        Math.max(0.34, style.fadeStart - 0.2),
        style.fadeEnd + 0.035,
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
  const rawDensity = score > 0.68 ? 0.98 : score > 0.38 ? 0.74 : score > 0.16 ? 0.36 : 0.07;
  return rawDensity * LAYER_STYLES[layer].densityScale;
}

const INITIAL_COMPOSITION = generateMountain(INITIAL_SEED);

export default function HalftoneMountain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const morphFrameRef = useRef<number | null>(null);
  const recoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(true);
  const positionRef = useRef<Position | null>(null);
  const seedRef = useRef(INITIAL_SEED);
  const currentCompositionRef = useRef(INITIAL_COMPOSITION);
  const previousCompositionRef = useRef(INITIAL_COMPOSITION);
  const morphProgressRef = useRef(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMedia = window.matchMedia("(max-width: 767px)");
    const updateMotion = () => setReducedMotion(motionMedia.matches);
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
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
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
          const depthFade = 1 - smoothStep(0.64, 1, terrainDepth);
          const verticalFade = 1 - smoothStep(style.fadeStart, style.fadeEnd, y);
          const footFade = depthFade * verticalFade;
          const baseDensity = density(layer, layerComposition, x, y);
          const distance = positionRef.current
            ? Math.hypot(x - positionRef.current.x, (y - positionRef.current.y) * 1.3)
            : Infinity;
          const influence = smoothFalloff(distance, INTERACTION_RADIUS);
          const ridgeBand = ridgeDistance >= 0 && ridgeDistance < 0.04;
          const ridgeChance = 0.48 + style.densityScale * 0.38;
          const silhouetteChance = Math.max(ridgeBand ? ridgeChance : 0, baseDensity);
          const visibleChance = Math.min(
            0.98,
            silhouetteChance * (0.12 + footFade * 0.88) + influence * style.densityBoost,
          );
          if (random(PIXEL_SEED + layerIndex * 97, column, row, 0) > visibleChance) continue;

          const jitterX =
            (random(PIXEL_SEED, column, row, 1 + layerIndex) - 0.5) * cellWidth * 0.06;
          const jitterY =
            (random(PIXEL_SEED, column, row, 5 + layerIndex) - 0.5) * cellHeight * 0.045;
          const sizeNoise = 0.93 + random(PIXEL_SEED, column, row, 9 + layerIndex) * 0.14;
          const pixelScale = (0.2 + baseDensity * 0.72) * style.pixelScale;
          const footScale = 0.43 + footFade * 0.57;
          const sizeBoost = 0.48 + style.pixelScale * 0.24;
          const activatedScale = pixelScale * sizeNoise * footScale * (1 + influence * sizeBoost);
          const pixelWidth = cellWidth * Math.min(0.86, activatedScale);
          const pixelHeight = cellHeight * Math.min(0.82, activatedScale);
          const fadeAlpha = 0.34 + footFade * 0.66;
          context.globalAlpha = Math.min(
            1,
            (style.opacityBase + baseDensity * style.opacityRange) * fadeAlpha +
              influence * style.activationAlpha,
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
        const segmentCount = Math.max(3, Math.round((field.end - field.start) * grid.columns));
        const segmentWidth = (field.end - field.start) / segmentCount;
        for (let segment = 0; segment < segmentCount; segment += 1) {
          const segmentX = field.start + segment * segmentWidth;
          const mountainRidge = ridge(layer, layerComposition, segmentX);
          const foot = layerFoot(layer, layerComposition, segmentX);
          if (field.y < mountainRidge - 0.014 || field.y > foot + 0.014) continue;
          const localInfluence = positionRef.current
            ? smoothFalloff(
                Math.hypot(
                  segmentX - positionRef.current.x,
                  (field.y - positionRef.current.y) * 1.3,
                ),
                INTERACTION_RADIUS,
              )
            : 0;
          const gapChance = Math.max(0.01, field.gap - localInfluence * 0.42);
          if (random(PIXEL_SEED + layerIndex * 53, segment, fieldIndex, 18) < gapChance) continue;
          const pixelRowWidth =
            segmentWidth * bounds.width * (0.7 + localInfluence * (1.25 + style.pixelScale));
          const pixelRowHeight = Math.max(
            1,
            Math.round(
              cellHeight *
                (0.07 + style.pixelScale * 0.06) *
                (1 + localInfluence * (0.34 + style.pixelScale * 0.28)),
            ),
          );
          context.globalAlpha = Math.min(
            1,
            style.opacityBase + style.opacityRange * 0.65 + localInfluence * style.activationAlpha,
          );
          context.fillRect(
            Math.round(segmentX * bounds.width),
            Math.round(field.y * bounds.height - pixelRowHeight / 2),
            Math.max(1, Math.round(pixelRowWidth)),
            pixelRowHeight,
          );
        }
      });
    });
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) {
          positionRef.current = null;
          draw();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(
    () => () => {
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      if (morphFrameRef.current !== null) cancelAnimationFrame(morphFrameRef.current);
      if (recoveryRef.current) clearTimeout(recoveryRef.current);
    },
    [],
  );

  const recover = useCallback(() => {
    if (recoveryRef.current) clearTimeout(recoveryRef.current);
    recoveryRef.current = setTimeout(() => {
      positionRef.current = null;
      draw();
    }, 420);
  }, [draw]);

  const updatePosition = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (reducedMotion || !isVisibleRef.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      positionRef.current = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      };
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = requestAnimationFrame(draw);
      recover();
    },
    [draw, recover, reducedMotion],
  );

  const regenerate = useCallback(() => {
    const activeComposition = interpolateMountain(
      previousCompositionRef.current,
      currentCompositionRef.current,
      morphProgressRef.current,
    );
    seedRef.current = nextSeed(seedRef.current);
    previousCompositionRef.current = activeComposition;
    currentCompositionRef.current = generateMountain(seedRef.current);

    if (morphFrameRef.current !== null) cancelAnimationFrame(morphFrameRef.current);
    if (reducedMotion) {
      previousCompositionRef.current = currentCompositionRef.current;
      morphProgressRef.current = 1;
      draw();
      return;
    }

    morphProgressRef.current = 0;
    const startedAt = performance.now();
    const morph = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / MORPH_DURATION);
      morphProgressRef.current = easeOutCubic(progress);
      draw();
      if (progress < 1) morphFrameRef.current = requestAnimationFrame(morph);
    };
    morphFrameRef.current = requestAnimationFrame(morph);
  }, [draw, reducedMotion]);

  return (
    <div className="halftone-mountain-shell">
      <canvas
        ref={canvasRef}
        className="halftone-mountain"
        aria-hidden="true"
        onClick={regenerate}
        onPointerDown={updatePosition}
        onPointerLeave={recover}
        onPointerMove={(event) => event.pointerType === "mouse" && updatePosition(event)}
      />
    </div>
  );
}
