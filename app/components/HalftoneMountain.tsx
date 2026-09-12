"use client";

import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";

const DESKTOP_GRID = { columns: 82, rows: 36 };
const MOBILE_GRID = { columns: 56, rows: 28 };
const INITIAL_SEED = 6611;

type Position = { x: number; y: number };
type Layer = "far" | "front";

type LineField = {
  layer: Layer;
  y: number;
  start: number;
  end: number;
  gap: number;
};

const LINE_FIELDS: LineField[] = [
  { layer: "far", y: 0.39, start: 0.08, end: 0.5, gap: 0.22 },
  { layer: "far", y: 0.46, start: 0.43, end: 0.91, gap: 0.3 },
  { layer: "far", y: 0.54, start: 0.02, end: 0.37, gap: 0.14 },
  { layer: "far", y: 0.61, start: 0.55, end: 0.98, gap: 0.18 },
  { layer: "front", y: 0.52, start: 0.27, end: 0.61, gap: 0.16 },
  { layer: "front", y: 0.59, start: 0.08, end: 0.43, gap: 0.28 },
  { layer: "front", y: 0.65, start: 0.48, end: 0.91, gap: 0.12 },
  { layer: "front", y: 0.7, start: 0.03, end: 0.29, gap: 0.2 },
  { layer: "front", y: 0.75, start: 0.66, end: 0.98, gap: 0.24 },
  { layer: "front", y: 0.81, start: 0.16, end: 0.59, gap: 0.1 },
  { layer: "front", y: 0.86, start: 0.38, end: 0.89, gap: 0.18 },
  { layer: "front", y: 0.91, start: 0.01, end: 0.97, gap: 0.08 },
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

function gaussian(value: number, center: number, spread: number) {
  const distance = (value - center) / spread;
  return Math.exp(-0.5 * distance * distance);
}

function nextSeed(seed: number) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function ridge(layer: Layer, x: number, seed: number) {
  const phase = seed * 0.000013;
  if (layer === "far") {
    const left = gaussian(x, 0.22, 0.18) * 0.29;
    const center = gaussian(x, 0.5, 0.2) * 0.48;
    const right = gaussian(x, 0.79, 0.17) * 0.31;
    return 0.72 - Math.max(left, center, right) - Math.sin(x * 15 + phase) * 0.009;
  }
  const left = gaussian(x, 0.2, 0.14) * 0.34;
  const main = gaussian(x, 0.52, 0.14) * 0.58;
  const right = gaussian(x, 0.79, 0.13) * 0.42;
  return 0.92 - Math.max(left, main, right) - Math.sin(x * 19 + phase) * 0.011;
}

function layerBase(layer: Layer, x: number, seed: number) {
  const base = layer === "far" ? 0.75 : 0.93;
  return base + Math.sin(x * 9 + seed * 0.000009) * 0.006;
}

function density(layer: Layer, x: number, y: number, seed: number) {
  const warpX = x + Math.sin(y * 16 + seed * 0.000011) * 0.022;
  const warpY = y + Math.sin(x * 20 + seed * 0.000017) * 0.018;
  const island = (cx: number, cy: number, sx: number, sy: number) =>
    gaussian(warpX, cx, sx) * gaussian(warpY, cy, sy);

  if (layer === "far") {
    const dense =
      island(0.28, 0.45, 0.13, 0.13) * 0.72 +
      island(0.58, 0.39, 0.11, 0.12) * 0.62 +
      island(0.82, 0.5, 0.12, 0.12) * 0.58;
    const blank = island(0.44, 0.5, 0.09, 0.1) * 0.78;
    const score = 0.16 + dense - blank + Math.sin(x * 11 + y * 8) * 0.05;
    if (score > 0.58) return 0.76;
    if (score > 0.3) return 0.42;
    if (score > 0.14) return 0.18;
    return 0.05;
  }

  const dense =
    island(0.18, 0.72, 0.12, 0.12) * 0.96 +
    island(0.43, 0.57, 0.11, 0.15) * 1.05 +
    island(0.51, 0.36, 0.075, 0.1) * 0.9 +
    island(0.61, 0.83, 0.15, 0.08) * 1.08 +
    island(0.82, 0.67, 0.09, 0.12) * 0.78;
  const blank =
    island(0.31, 0.67, 0.075, 0.11) * 1.0 +
    island(0.6, 0.58, 0.085, 0.12) * 1.12 +
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
          const base = layerBase(layer, x, seed);
          if (x < 0.025 || x > 0.975 || y < mountainRidge || y > base) continue;

          const ridgeDistance = y - mountainRidge;
          const ridgeBand = ridgeDistance >= 0 && ridgeDistance < 0.038;
          const baseDensity = density(layer, x, y, seed);
          const distance = position
            ? Math.hypot(x - position.x, (y - position.y) * 1.3)
            : Infinity;
          const influence = Math.max(0, 1 - distance / 0.14);
          const visibleChance = Math.min(0.98, Math.max(ridgeBand ? 0.86 : 0, baseDensity) + influence * 0.1);
          if (random(seed + layerIndex * 97, column, row, 0) > visibleChance) continue;

          const jitterX = (random(seed, column, row, 1 + layerIndex) - 0.5) * cellWidth * 0.34;
          const jitterY = (random(seed, column, row, 3 + layerIndex) - 0.5) * cellHeight * 0.28;
          const sizeNoise = 0.82 + random(seed, column, row, 5 + layerIndex) * 0.36;
          const densityScale = layer === "far" ? 0.68 + baseDensity * 0.35 : 0.78 + baseDensity * 0.62;
          const radiusBase = Math.min(cellWidth, cellHeight) * (layer === "far" ? 0.12 : 0.17);
          const radius = radiusBase * densityScale * sizeNoise * (1 + influence * 0.18);
          context.globalAlpha =
            layer === "far"
              ? 0.2 + baseDensity * 0.26 + influence * 0.04
              : 0.42 + baseDensity * 0.48 + influence * 0.05;
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
        const pointerInfluence = position ? Math.max(0, 1 - Math.abs(position.y - lineY) / 0.12) : 0;
        const start = field.start - pointerInfluence * 0.012;
        const end = field.end + pointerInfluence * 0.018;
        const segmentCount = Math.max(3, Math.round((end - start) * grid.columns));
        const segmentWidth = (end - start) / segmentCount;
        context.lineWidth = layer === "far" ? 0.55 : 0.85;
        context.globalAlpha = layer === "far" ? 0.28 : 0.62;
        for (let segment = 0; segment < segmentCount; segment += 1) {
          const segmentX = start + segment * segmentWidth;
          const mountainRidge = ridge(layer, segmentX, seed);
          const base = layerBase(layer, segmentX, seed);
          if (lineY < mountainRidge - 0.014 || lineY > base + 0.014) continue;
          const localInfluence = position
            ? Math.max(0, 1 - Math.hypot(segmentX - position.x, (lineY - position.y) * 1.3) / 0.14)
            : 0;
          const gapChance = Math.max(0.02, field.gap - localInfluence * 0.08);
          if (random(seed, segment, fieldIndex, 18 + layerIndex) < gapChance) continue;
          const x1 = segmentX * bounds.width;
          const x2 = (segmentX + segmentWidth * (0.78 + localInfluence * 0.18)) * bounds.width;
          const py = lineY * bounds.height;
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
