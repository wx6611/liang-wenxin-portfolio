"use client";

import {
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const DESKTOP_GRID = { columns: 84, rows: 68 };
const MOBILE_GRID = { columns: 64, rows: 52 };
const CHARACTERS = ["•", "•", "."] as const;
const INITIAL_SEED = 6611;

type Position = {
  x: number;
  y: number;
};

type DensityMask = {
  columns: number;
  rows: number;
  values: Float32Array;
};

function gaussian(value: number, center: number, spread: number) {
  const distance = (value - center) / spread;
  return Math.exp(-0.5 * distance * distance);
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
  const [mask, setMask] = useState<DensityMask | null>(null);
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
    const grid = isMobile ? MOBILE_GRID : DESKTOP_GRID;
    const source = new window.Image();
    source.src = "/images/home/ascii-mountain-reference.png";
    source.onload = () => {
      const sampler = document.createElement("canvas");
      sampler.width = grid.columns;
      sampler.height = grid.rows;
      const context = sampler.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, 0, 0, grid.columns, grid.rows);
      const pixels = context.getImageData(0, 0, grid.columns, grid.rows).data;
      const values = new Float32Array(grid.columns * grid.rows);

      for (let index = 0; index < values.length; index += 1) {
        const pixel = index * 4;
        const luminance =
          pixels[pixel] * 0.2126 +
          pixels[pixel + 1] * 0.7152 +
          pixels[pixel + 2] * 0.0722;
        values[index] = Math.max(0, (246 - luminance) / 230);
      }

      setMask({ ...grid, values });
    };
    source.onerror = () => {
      setMask({ ...grid, values: new Float32Array(grid.columns * grid.rows).fill(0.5) });
    };
  }, [isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mask) return;
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);

    const cellWidth = bounds.width / mask.columns;
    const cellHeight = bounds.height / mask.rows;
    const fontSize = Math.max(5, Math.min(cellWidth * 1.28, cellHeight * 1.42));
    context.font = `400 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    context.fillStyle = "#111";
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let row = 0; row < mask.rows; row += 1) {
      for (let column = 0; column < mask.columns; column += 1) {
        const index = row * mask.columns + column;
        const referenceTexture = mask.values[index];
        const x = (column + 0.5) / mask.columns;
        const y = (row + 0.5) / mask.rows;
        const ridge = mountainRidge(x, seed);
        const base = 0.9 + Math.sin(x * 8 + seed * 0.00001) * 0.008;
        const insideMountain = x >= 0.035 && x <= 0.965 && y >= ridge && y <= base;
        const scanRows = [0.47, 0.56, 0.65, 0.735, 0.82, 0.875];
        const scanDistance = Math.min(
          ...scanRows.map((scan, scanIndex) =>
            Math.abs(y - scan - (cellRandom(seed, scanIndex, 0, 12) - 0.5) * 0.018),
          ),
        );
        const scanLine = scanDistance < 0.0085;
        const nearMountain = x >= 0.018 && x <= 0.982 && y >= ridge - 0.008 && y <= base + 0.012;
        if (!insideMountain && !(scanLine && nearMountain)) continue;

        const depth = Math.max(0, Math.min(1, (y - ridge) / Math.max(0.08, base - ridge)));
        const distance = position
          ? Math.hypot(
              x - position.x,
              (y - position.y) * 1.25,
            )
          : Infinity;
        const influence = Math.max(0, 1 - distance / 0.13);
        const regionalTexture =
          0.5 +
          Math.sin(x * 21 + y * 13 + seed * 0.000017) * 0.24 +
          Math.sin(x * 47 - y * 18 + seed * 0.000009) * 0.14;
        const referenceFactor = 0.62 + Math.min(0.38, referenceTexture * 0.72);
        const ridgeContour = Math.exp(-depth * 12) * 0.42;
        const hollow =
          gaussian(x, 0.43, 0.07) * gaussian(y, 0.63, 0.1) * 0.32 +
          gaussian(x, 0.7, 0.055) * gaussian(y, 0.72, 0.08) * 0.25;
        const visibility = Math.max(
          0.08,
          Math.min(
            0.9,
            (0.25 + depth * 0.3 + regionalTexture * 0.31 + ridgeContour - hollow) *
              referenceFactor,
          ),
        );
        const recalculatedVisibility = Math.min(0.94, visibility + influence * 0.16);
        if (
          cellRandom(seed, column, row, 0) > recalculatedVisibility ||
          (!insideMountain && cellRandom(seed, column, row, 11) > 0.48)
        ) {
          continue;
        }

        let character: string;

        if (
          scanLine &&
          cellRandom(seed, column, row, 1) < 0.82 + influence * 0.08
        ) {
          character = cellRandom(seed, column, row, 2) > 0.45 ? "—" : "_";
        } else if (
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

        context.globalAlpha =
          0.44 + Math.min(0.54, visibility * 0.62 + ridgeContour * 0.22);
        context.fillText(
          character,
          (column + 0.5) * cellWidth,
          (row + 0.5) * cellHeight,
        );
      }
    }
    context.globalAlpha = 1;
  }, [mask, position, renderVersion, seed]);

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
