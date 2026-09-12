"use client";

import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";

const DESKTOP_GRID = { columns: 82, rows: 36 };
const MOBILE_GRID = { columns: 56, rows: 28 };
const INITIAL_SEED = 6611;
const INTERACTION_RADIUS = 0.245;

type Position = { x: number; y: number };
type Layer = "far" | "front";
type RidgePoint = { x: number; y: number };

type LineField = {
  layer: Layer;
  y: number;
  start: number;
  end: number;
  gap: number;
};

const LINE_FIELDS: LineField[] = [
  { layer: "far", y: 0.4, start: 0.48, end: 0.72, gap: 0.25 },
  { layer: "far", y: 0.48, start: 0.18, end: 0.51, gap: 0.34 },
  { layer: "far", y: 0.55, start: 0.08, end: 0.35, gap: 0.18 },
  { layer: "far", y: 0.6, start: 0.6, end: 0.94, gap: 0.29 },
  { layer: "front", y: 0.54, start: 0.26, end: 0.58, gap: 0.16 },
  { layer: "front", y: 0.62, start: 0.07, end: 0.39, gap: 0.27 },
  { layer: "front", y: 0.68, start: 0.5, end: 0.9, gap: 0.12 },
  { layer: "front", y: 0.74, start: 0.03, end: 0.29, gap: 0.21 },
  { layer: "front", y: 0.82, start: 0.15, end: 0.58, gap: 0.1 },
  { layer: "front", y: 0.88, start: 0.38, end: 0.92, gap: 0.19 },
];

const RIDGE_POINTS: Record<Layer, RidgePoint[]> = {
  far: [
    { x: 0, y: 0.74 },
    { x: 0.05, y: 0.69 },
    { x: 0.16, y: 0.54 },
    { x: 0.27, y: 0.35 },
    { x: 0.42, y: 0.42 },
    { x: 0.58, y: 0.22 },
    { x: 0.64, y: 0.29 },
    { x: 0.71, y: 0.46 },
    { x: 0.82, y: 0.38 },
    { x: 0.95, y: 0.65 },
    { x: 1, y: 0.72 },
  ],
  front: [
    { x: 0, y: 0.88 },
    { x: 0.07, y: 0.8 },
    { x: 0.18, y: 0.56 },
    { x: 0.31, y: 0.6 },
    { x: 0.46, y: 0.38 },
    { x: 0.53, y: 0.47 },
    { x: 0.6, y: 0.57 },
    { x: 0.72, y: 0.48 },
    { x: 0.82, y: 0.61 },
    { x: 0.92, y: 0.75 },
    { x: 1, y: 0.86 },
  ],
};

function random(seed: number, column: number, row: number, channel: number) {
  let value =
    seed ^
    Math.imul(column + 1, 374761393) ^
    Math.imul(row + 1, 668265263) ^
    Math.imul(channel + 1, -2048144789);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function gaussian(value: number, center: number, spread: number) {
  const distance = (value - center) / spread;
  return Math.exp(-0.5 * distance * distance);
}

function nextSeed(seed: number) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function smoothStep(edge0: number, edge1: number, value: number) {
  const progress = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return progress * progress * (3 - 2 * progress);
}

function smoothFalloff(distance: number, radius: number) {
  return 1 - smoothStep(0, radius, distance);
}

function ridge(layer: Layer, x: number, seed: number) {
  const points = RIDGE_POINTS[layer];
  const layerIndex = layer === "far" ? 0 : 1;
  const positionShift = (random(seed, layerIndex, 0, 31) - 0.5) * 0.024;
  const profileX = Math.max(0, Math.min(1, x + positionShift));
  let segment = 0;
  while (segment < points.length - 2 && profileX > points[segment + 1].x) {
    segment += 1;
  }
  const from = points[segment];
  const to = points[segment + 1];
  const progress = smoothStep(from.x, to.x, profileX);
  const fromOffset = (random(seed, segment, layerIndex, 37) - 0.5) * 0.024;
  const toOffset = (random(seed, segment + 1, layerIndex, 37) - 0.5) * 0.024;
  const profile = from.y + fromOffset + (to.y + toOffset - from.y - fromOffset) * progress;
  const phase = seed * 0.000013;
  const irregularity =
    Math.sin(x * (layer === "far" ? 17 : 23) + phase) * 0.008 +
    Math.sin(x * (layer === "far" ? 41 : 53) - phase * 0.7) * 0.004;
  return Math.max(0.09, Math.min(0.88, profile + irregularity));
}

function layerFoot(layer: Layer, x: number, seed: number) {
  const foot = layer === "far" ? 0.87 : 0.95;
  return (
    foot +
    Math.sin(x * (layer === "far" ? 9 : 11) + seed * 0.000009) * 0.018 +
    Math.sin(x * (layer === "far" ? 27 : 31) - seed * 0.000006) * 0.008
  );
}

function density(layer: Layer, x: number, y: number, seed: number) {
  const warpX = x + Math.sin(y * 16 + seed * 0.000011) * 0.022;
  const warpY = y + Math.sin(x * 20 + seed * 0.000017) * 0.018;
  const island = (cx: number, cy: number, sx: number, sy: number) =>
    gaussian(warpX, cx, sx) * gaussian(warpY, cy, sy);

  if (layer === "far") {
    const dense =
      island(0.27, 0.44, 0.13, 0.12) * 0.58 +
      island(0.58, 0.36, 0.11, 0.13) * 0.72 +
      island(0.82, 0.49, 0.12, 0.12) * 0.54;
    const blank =
      island(0.42, 0.49, 0.085, 0.1) * 0.84 +
      island(0.71, 0.52, 0.075, 0.095) * 0.76;
    const score = 0.16 + dense - blank + Math.sin(x * 11 + y * 8) * 0.05;
    if (score > 0.58) return 0.76;
    if (score > 0.3) return 0.42;
    if (score > 0.14) return 0.18;
    return 0.05;
  }

  const dense =
    island(0.18, 0.66, 0.12, 0.13) * 1.02 +
    island(0.45, 0.5, 0.105, 0.14) * 1.16 +
    island(0.68, 0.74, 0.15, 0.105) * 1.1 +
    island(0.76, 0.55, 0.08, 0.11) * 0.62;
  const blank =
    island(0.31, 0.67, 0.075, 0.11) * 1.0 +
    island(0.6, 0.6, 0.085, 0.12) * 1.12 +
    island(0.77, 0.8, 0.065, 0.08) * 0.9;
  const score = 0.17 + dense - blank + Math.sin(x * 13 - y * 9) * 0.055;
  if (score > 0.72) return 0.96;
  if (score > 0.38) return 0.62;
  if (score > 0.16) return 0.23;
  return 0.035;
}

export default function HalftoneMountain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const recoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(true);
  const [position, setPosition] = useState<Position | null>(null);
  const [seed, setSeed] = useState(INITIAL_SEED);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);

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

  useEffect(() => {
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

    const cellWidth = bounds.width / grid.columns;
    const cellHeight = bounds.height / grid.rows;

    (["far", "front"] as Layer[]).forEach((layer, layerIndex) => {
      for (let row = 0; row < grid.rows; row += 1) {
        for (let column = 0; column < grid.columns; column += 1) {
          const x = (column + 0.5) / grid.columns;
          const y = (row + 0.5) / grid.rows;
          const mountainRidge = ridge(layer, x, seed);
          const foot = layerFoot(layer, x, seed);
          if (x < 0.05 || x > 0.95 || y < mountainRidge || y > foot) continue;

          if (layer === "far" && x >= 0.35 && x <= 0.78) {
            const foregroundRidge = ridge("front", x, seed);
            if (y >= foregroundRidge) continue;
          }

          const ridgeDistance = y - mountainRidge;
          const ridgeBand = ridgeDistance >= 0 && ridgeDistance < 0.038;
          const baseDensity = density(layer, x, y, seed);
          const terrainDepth = ridgeDistance / Math.max(0.08, foot - mountainRidge);
          const depthFade = 1 - smoothStep(layer === "far" ? 0.62 : 0.72, 1, terrainDepth);
          const verticalFade =
            1 - smoothStep(layer === "far" ? 0.68 : 0.73, layer === "far" ? 0.88 : 0.94, y);
          const footFade = depthFade * verticalFade;
          const distance = position
            ? Math.hypot(x - position.x, (y - position.y) * 1.3)
            : Infinity;
          const influence = smoothFalloff(distance, INTERACTION_RADIUS);
          const silhouetteChance = Math.max(ridgeBand ? 0.86 : 0, baseDensity);
          const densityBoost = layer === "far" ? 0.28 : 0.36;
          const visibleChance = Math.min(
            0.98,
            silhouetteChance * (0.12 + footFade * 0.88) + influence * densityBoost,
          );
          if (random(seed + layerIndex * 97, column, row, 0) > visibleChance) continue;

          const jitterX = (random(seed, column, row, 1 + layerIndex) - 0.5) * cellWidth * 0.34;
          const jitterY = (random(seed, column, row, 3 + layerIndex) - 0.5) * cellHeight * 0.28;
          const sizeNoise = 0.82 + random(seed, column, row, 5 + layerIndex) * 0.36;
          const densityScale = layer === "far" ? 0.68 + baseDensity * 0.35 : 0.78 + baseDensity * 0.62;
          const radiusBase = Math.min(cellWidth, cellHeight) * (layer === "far" ? 0.12 : 0.17);
          const footScale = 0.5 + footFade * 0.5;
          const sizeBoost = layer === "far" ? 0.58 : 0.82;
          const radius =
            radiusBase * densityScale * sizeNoise * footScale * (1 + influence * sizeBoost);
          const fadeAlpha = 0.35 + footFade * 0.65;
          context.globalAlpha =
            layer === "far"
              ? (0.2 + baseDensity * 0.26) * fadeAlpha + influence * 0.12
              : (0.42 + baseDensity * 0.48) * fadeAlpha + influence * 0.18;
          context.beginPath();
          context.arc(
            (column + 0.5) * cellWidth + jitterX,
            (row + 0.5) * cellHeight + jitterY,
            Math.max(0.45, radius),
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }

      context.lineCap = "butt";
      LINE_FIELDS.filter((field) => field.layer === layer).forEach((field, fieldIndex) => {
        const lineY = field.y + (random(seed, fieldIndex, layerIndex, 12) - 0.5) * 0.014;
        const start = field.start;
        const end = field.end;
        const segmentCount = Math.max(3, Math.round((end - start) * grid.columns));
        const segmentWidth = (end - start) / segmentCount;
        context.lineWidth = layer === "far" ? 0.55 : 0.85;
        context.globalAlpha = layer === "far" ? 0.28 : 0.62;
        for (let segment = 0; segment < segmentCount; segment += 1) {
          const segmentX = start + segment * segmentWidth;
          const mountainRidge = ridge(layer, segmentX, seed);
          const foot = layerFoot(layer, segmentX, seed);
          if (lineY < mountainRidge - 0.014 || lineY > foot + 0.014) continue;
          const localInfluence = position
            ? smoothFalloff(
                Math.hypot(segmentX - position.x, (lineY - position.y) * 1.3),
                INTERACTION_RADIUS,
              )
            : 0;
          const gapChance = Math.max(0.01, field.gap - localInfluence * 0.34);
          if (random(seed, segment, fieldIndex, 18 + layerIndex) < gapChance) continue;
          const x1 = segmentX * bounds.width;
          const x2 = (segmentX + segmentWidth * (0.78 + localInfluence * 1.9)) * bounds.width;
          const py = lineY * bounds.height;
          context.globalAlpha =
            (layer === "far" ? 0.28 : 0.62) + localInfluence * (layer === "far" ? 0.14 : 0.2);
          context.beginPath();
          context.moveTo(x1, py);
          context.lineTo(x2, py);
          context.stroke();
        }
      });
    });
    context.globalAlpha = 1;
  }, [isMobile, position, renderVersion, seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => setRenderVersion((version) => version + 1));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) setPosition(null);
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (recoveryRef.current) clearTimeout(recoveryRef.current);
    },
    [],
  );

  const recover = useCallback(() => {
    if (recoveryRef.current) clearTimeout(recoveryRef.current);
    recoveryRef.current = setTimeout(() => setPosition(null), 420);
  }, []);

  const updatePosition = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (reducedMotion || !isVisibleRef.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const nextPosition = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      };
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => setPosition(nextPosition));
      recover();
    },
    [recover, reducedMotion],
  );

  return (
    <div className="halftone-mountain-shell">
      <canvas
        ref={canvasRef}
        className={`halftone-mountain${position ? " is-recalculating" : ""}`}
        aria-hidden="true"
        onClick={() => !reducedMotion && setSeed((currentSeed) => nextSeed(currentSeed))}
        onPointerDown={updatePosition}
        onPointerLeave={recover}
        onPointerMove={(event) => event.pointerType === "mouse" && updatePosition(event)}
      />
    </div>
  );
}
