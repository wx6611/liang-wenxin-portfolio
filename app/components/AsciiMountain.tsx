"use client";

import {
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const DESKTOP_GRID = { columns: 84, rows: 34 };
const MOBILE_GRID = { columns: 52, rows: 26 };
const CHARACTERS = ["•", "•", ".", "·"] as const;
const INITIAL_SEED = 6611;

const LINE_FIELDS = [
  { row: 0.39, start: 0.48, end: 0.66, gap: 0.08 },
  { row: 0.44, start: 0.43, end: 0.72, gap: 0.14 },
  { row: 0.49, start: 0.52, end: 0.78, gap: 0.22 },
  { row: 0.55, start: 0.12, end: 0.46, gap: 0.18 },
  { row: 0.61, start: 0.35, end: 0.87, gap: 0.12 },
  { row: 0.66, start: 0.08, end: 0.39, gap: 0.3 },
  { row: 0.7, start: 0.62, end: 0.96, gap: 0.2 },
  { row: 0.76, start: 0.18, end: 0.58, gap: 0.16 },
  { row: 0.81, start: 0.04, end: 0.34, gap: 0.1 },
  { row: 0.85, start: 0.43, end: 0.91, gap: 0.24 },
  { row: 0.89, start: 0.02, end: 0.98, gap: 0.08 },
] as const;

type Position = {
  x: number;
  y: number;
};

function gaussian(value: number, center: number, spread: number) {
  const distance = (value - center) / spread;
  return Math.exp(-0.5 * distance * distance);
}

function clusterDensity(x: number, y: number, seed: number) {
  const warpedX = x + Math.sin(y * 17 + seed * 0.000011) * 0.018;
  const warpedY = y + Math.sin(x * 23 + seed * 0.000019) * 0.014;
  const cluster = (cx: number, cy: number, sx: number, sy: number) =>
    gaussian(warpedX, cx, sx) * gaussian(warpedY, cy, sy);
  const dense =
    cluster(0.55, 0.29, 0.07, 0.12) * 0.92 +
    cluster(0.46, 0.49, 0.105, 0.17) * 0.88 +
    cluster(0.24, 0.64, 0.1, 0.15) * 0.68 +
    cluster(0.19, 0.82, 0.15, 0.085) * 0.9 +
    cluster(0.62, 0.82, 0.16, 0.1) * 0.94 +
    cluster(0.79, 0.59, 0.085, 0.13) * 0.7;
  const sparse =
    cluster(0.36, 0.62, 0.075, 0.115) * 0.84 +
    cluster(0.65, 0.49, 0.08, 0.12) * 0.92 +
    cluster(0.52, 0.72, 0.055, 0.07) * 1.05 +
    cluster(0.84, 0.73, 0.08, 0.11) * 0.74;
  const lowFrequency =
    Math.sin(x * 10 + y * 7 + seed * 0.000013) * 0.07 +
    Math.sin(x * 17 - y * 5 + seed * 0.000007) * 0.045;
  const score = 0.18 + dense - sparse + lowFrequency;
  if (score > 0.72) return 0.94;
  if (score > 0.4) return 0.64;
  if (score > 0.18) return 0.27;
  return 0.08;
}

function mountainRidge(x: number, seed: number) {
  const leftPosition = 0.25 + (cellRandom(seed, 1, 0, 8) - 0.5) * 0.035;
  const mainPosition = 0.55 + (cellRandom(seed, 2, 0, 8) - 0.5) * 0.04;
  const rightPosition = 0.78 + (cellRandom(seed, 3, 0, 8) - 0.5) * 0.035;
  const leftPeak = gaussian(x, leftPosition, 0.115) * 0.38;
  const mainPeak = gaussian(x, mainPosition, 0.12) * 0.69;
  const rightPeak = gaussian(x, rightPosition, 0.105) * 0.45;
  const elevation =
    0.075 +
    Math.max(leftPeak, mainPeak, rightPeak) +
    Math.min(leftPeak, mainPeak, rightPeak) * 0.12;
  const irregularity =
    Math.sin(x * 19 + seed * 0.000013) * 0.012 +
    Math.sin(x * 43 + seed * 0.000021) * 0.006;
  return Math.max(0.09, Math.min(0.82, 0.9 - elevation - irregularity));
}

function cellRandom(seed: number, column: number, row: number, channel: number) {
  let value =
    seed ^
    Math.imul(column + 1, 374761393) ^
    Math.imul(row + 1, 668265263) ^
    Math.imul(channel + 1, -2048144789);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function nextSeed(seed: number) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export default function AsciiMountain() {
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
    const grid = isMobile ? MOBILE_GRID : DESKTOP_GRID;
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);

    const cellWidth = bounds.width / grid.columns;
    const cellHeight = bounds.height / grid.rows;
    const fontSize = Math.max(5, Math.min(cellWidth * 1.28, cellHeight * 1.42));
    context.font = `400 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    context.fillStyle = "#111";
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const x = (column + 0.5) / grid.columns;
        const y = (row + 0.5) / grid.rows;
        const ridge = mountainRidge(x, seed);
        const base = 0.9 + Math.sin(x * 8 + seed * 0.00001) * 0.008;
        const insideMountain = x >= 0.035 && x <= 0.965 && y >= ridge && y <= base;
        if (!insideMountain) continue;

        const depth = Math.max(0, Math.min(1, (y - ridge) / Math.max(0.08, base - ridge)));
        const distance = position
          ? Math.hypot(
              x - position.x,
              (y - position.y) * 1.25,
            )
          : Infinity;
        const influence = Math.max(0, 1 - distance / 0.13);
        const ridgeDistance = y - ridge;
        const ridgeBand = ridgeDistance >= 0 && ridgeDistance <= 0.045;
        const baseVisibility = clusterDensity(x, y, seed);
        const visibility = ridgeBand ? Math.max(0.88, baseVisibility) : baseVisibility;
        const recalculatedVisibility = Math.min(0.94, visibility + influence * 0.16);
        if (
          cellRandom(seed, column, row, 0) > recalculatedVisibility ||
          visibility < 0.1 && cellRandom(seed, column, row, 11) > 0.14
        ) {
          continue;
        }

        let character: string;

        if (
          (depth < 0.12 || visibility < 0.43) &&
          cellRandom(seed, column, row, 3) > 0.36
        ) {
          character = ".";
        } else {
          const characterIndex =
            (Math.floor(cellRandom(seed, column, row, 4) * CHARACTERS.length) +
              Math.round(influence * 2)) %
            CHARACTERS.length;
          character = CHARACTERS[characterIndex];
        }

        const sizeVariation = 0.9 + cellRandom(seed, column, row, 8) * 0.2;
        const jitterX = (cellRandom(seed, column, row, 9) - 0.5) * cellWidth * 0.24;
        const jitterY = (cellRandom(seed, column, row, 10) - 0.5) * cellHeight * 0.18;
        context.font = `400 ${fontSize * sizeVariation}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        context.globalAlpha = 0.42 + Math.min(0.56, visibility * 0.62 + (ridgeBand ? 0.14 : 0));
        context.fillText(
          character,
          (column + 0.5) * cellWidth + jitterX,
          (row + 0.5) * cellHeight + jitterY,
        );
      }
    }

    context.font = `400 ${fontSize * 0.92}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    LINE_FIELDS.forEach((field, fieldIndex) => {
      const row = field.row + (cellRandom(seed, fieldIndex, 0, 14) - 0.5) * 0.018;
      const pointerNearRow = position ? Math.max(0, 1 - Math.abs(position.y - row) / 0.1) : 0;
      const extension = pointerNearRow * 0.018;
      const startColumn = Math.floor((field.start - extension) * grid.columns);
      const endColumn = Math.ceil((field.end + extension) * grid.columns);
      for (let column = startColumn; column <= endColumn; column += 1) {
        const x = (column + 0.5) / grid.columns;
        const ridge = mountainRidge(x, seed);
        const base = 0.9 + Math.sin(x * 8 + seed * 0.00001) * 0.008;
        if (row < ridge - 0.018 || row > base + 0.018) continue;
        const localInfluence = position
          ? Math.max(0, 1 - Math.hypot(x - position.x, (row - position.y) * 1.25) / 0.13)
          : 0;
        const gap = Math.max(0.03, field.gap - localInfluence * 0.1);
        if (cellRandom(seed, column, fieldIndex, 15) < gap) continue;
        const character = cellRandom(seed, column, fieldIndex, 16) > 0.34 ? "—" : "_";
        context.globalAlpha = 0.68 + localInfluence * 0.08;
        context.fillText(character, (column + 0.5) * cellWidth, row * bounds.height);
      }
    });
    context.globalAlpha = 1;
  }, [isMobile, position, renderVersion, seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      setRenderVersion((currentVersion) => currentVersion + 1);
    });
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

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (recoveryRef.current) clearTimeout(recoveryRef.current);
    };
  }, []);

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

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === "mouse") updatePosition(event);
    },
    [updatePosition],
  );

  const regenerate = useCallback(() => {
    if (!reducedMotion) setSeed((currentSeed) => nextSeed(currentSeed));
  }, [reducedMotion]);

  return (
    <div className="ascii-mountain-shell">
      <canvas
        ref={canvasRef}
        className={`ascii-mountain${position ? " is-recalculating" : ""}`}
        aria-hidden="true"
        onClick={regenerate}
        onPointerDown={updatePosition}
        onPointerLeave={recover}
        onPointerMove={handlePointerMove}
      />
    </div>
  );
}
