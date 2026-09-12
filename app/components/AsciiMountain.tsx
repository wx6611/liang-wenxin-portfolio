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
        const darkness = mask.values[index];
        const distance = position
          ? Math.hypot(
              column / mask.columns - position.x,
              (row / mask.rows - position.y) * 1.25,
            )
          : Infinity;
        const influence = Math.max(0, 1 - distance / 0.13);
        const normalizedDensity = Math.max(0, (darkness - 0.02) / 0.45);
        const visibility = Math.min(1, Math.pow(normalizedDensity, 1.5));
        const recalculatedVisibility = Math.min(1, visibility + influence * 0.2);
        if (
          cellRandom(seed, column, row, 0) > recalculatedVisibility ||
          recalculatedVisibility < 0.07
        ) {
          continue;
        }

        const left = mask.values[index - 1] ?? 0;
        const right = mask.values[index + 1] ?? 0;
        const above = mask.values[index - mask.columns] ?? 0;
        const below = mask.values[index + mask.columns] ?? 0;
        const horizontalWeight = left + right - above - below;
        let character: string;

        if (
          horizontalWeight > 0.035 &&
          cellRandom(seed, column, row, 1) < 0.74 + influence * 0.15
        ) {
          character = cellRandom(seed, column, row, 2) > 0.45 ? "—" : "_";
        } else if (
          darkness < 0.2 &&
          cellRandom(seed, column, row, 3) > 0.58
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
          0.22 + Math.min(0.74, Math.pow(darkness, 0.62) * 1.08);
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
      if (reducedMotion) return;
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
