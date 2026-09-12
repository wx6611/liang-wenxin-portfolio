"use client";

import {
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const COLUMNS = 74;
const ROWS = 24;
const INITIAL_SEED = 6611;
const DENSE_CHARACTERS = ["4", "6", "•"] as const;

type GridPoint = {
  x: number;
  y: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(value: number, center: number, spread: number) {
  return Math.exp(-Math.pow((value - center) / spread, 2));
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

function buildMountain(seed: number, disturbance: GridPoint | null) {
  const random = seededRandom(seed);
  const ridge = Array.from({ length: COLUMNS }, (_, column) => {
    const x = column / (COLUMNS - 1);
    const taper = Math.pow(Math.sin(Math.PI * x), 0.55);
    const mass =
      0.46 * gaussian(x, 0.61, 0.19) +
      0.3 * gaussian(x, 0.3, 0.15) +
      0.12 * gaussian(x, 0.82, 0.1);
    const irregularity =
      0.045 * Math.sin(x * 19 + seed * 0.013) +
      0.028 * Math.sin(x * 43 + seed * 0.031);
    return Math.max(0.04, Math.min(0.82, taper * (mass + 0.12 + irregularity)));
  });

  const lineRows = new Set([
    8 + Math.floor(random() * 3),
    13 + Math.floor(random() * 3),
    18 + Math.floor(random() * 2),
  ]);

  return Array.from({ length: ROWS }, (_, row) => {
    return Array.from({ length: COLUMNS }, (_, column) => {
      const mountainTop = ROWS - 2 - Math.floor(ridge[column] * (ROWS - 4));
      const insideMountain = row >= mountainTop && row < ROWS - 1;
      const distance = disturbance
        ? Math.hypot(column - disturbance.x, (row - disturbance.y) * 1.65)
        : Infinity;
      const influence = Math.max(0, 1 - distance / 9);
      const regionalTexture =
        0.5 +
        0.25 * Math.sin(column * 0.31 + row * 0.57 + seed * 0.01) +
        0.2 * Math.sin(column * 0.11 - row * 0.43);
      const depth = insideMountain
        ? (row - mountainTop) / Math.max(1, ROWS - mountainTop)
        : 0;
      const isScanLine = lineRows.has(row);
      const nearSilhouette = row >= mountainTop - 1;

      if (isScanLine && nearSilhouette) {
        const lineChance = insideMountain ? 0.68 : 0.11;
        const disturbedLineChance = influence * 0.24;
        if (
          cellRandom(seed, column, row, 0) <
          lineChance + disturbedLineChance
        ) {
          return cellRandom(seed, column, row, 1) > 0.43 ? "—" : "_";
        }
      }

      if (!insideMountain) {
        return " ";
      }

      const hollow =
        gaussian(column / COLUMNS, 0.46, 0.075) *
        gaussian(row / ROWS, 0.68, 0.16);
      const baseDensity =
        0.07 + regionalTexture * 0.36 + depth * 0.13 - hollow * 0.44;
      const recalculation =
        influence *
        (0.22 + 0.13 * Math.sin(column * 0.8 + row * 0.47 + seed));
      const density = Math.max(0.02, Math.min(0.76, baseDensity + recalculation));

      if (cellRandom(seed, column, row, 2) > density) {
        return cellRandom(seed, column, row, 3) < 0.035 ? "." : " ";
      }

      if (cellRandom(seed, column, row, 4) < 0.12 && influence < 0.2) {
        return ".";
      }

      const characterIndex = Math.floor(
        cellRandom(seed, column, row, 5) * DENSE_CHARACTERS.length +
          influence * 2,
      ) % DENSE_CHARACTERS.length;
      return DENSE_CHARACTERS[characterIndex];
    }).join("");
  }).join("\n");
}

function nextSeed(seed: number) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export default function AsciiMountain() {
  const [seed, setSeed] = useState(INITIAL_SEED);
  const [disturbance, setDisturbance] = useState<GridPoint | null>(null);
  const [previousMountain, setPreviousMountain] = useState<string | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frameRef = useRef<number | null>(null);
  const lastPointerTypeRef = useRef("mouse");
  const recoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mountain = useMemo(
    () => buildMountain(seed, disturbance),
    [seed, disturbance],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);

    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (recoveryRef.current) clearTimeout(recoveryRef.current);
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, []);

  const recover = useCallback(() => {
    if (recoveryRef.current) clearTimeout(recoveryRef.current);
    recoveryRef.current = setTimeout(() => setDisturbance(null), 420);
  }, []);

  const setPointerPosition = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const point = {
        x: Math.round(
          ((event.clientX - bounds.left) / bounds.width) * (COLUMNS - 1),
        ),
        y: Math.round(
          ((event.clientY - bounds.top) / bounds.height) * (ROWS - 1),
        ),
      };

      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => setDisturbance(point));
      recover();
    },
    [recover, reducedMotion],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse") setPointerPosition(event);
    },
    [setPointerPosition],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      lastPointerTypeRef.current = event.pointerType;
      setPointerPosition(event);
    },
    [setPointerPosition],
  );

  const regenerate = useCallback(() => {
    if (reducedMotion || lastPointerTypeRef.current !== "mouse") return;
    setPreviousMountain(mountain);
    setCrossfading(false);
    setDisturbance(null);
    setSeed((currentSeed) => nextSeed(currentSeed));
    requestAnimationFrame(() => setCrossfading(true));
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      setPreviousMountain(null);
      setCrossfading(false);
    }, 240);
  }, [mountain, reducedMotion]);

  return (
    <div
      className={`ascii-mountain${disturbance ? " is-recalculating" : ""}`}
      aria-hidden="true"
      onClick={regenerate}
      onPointerDown={handlePointerDown}
      onPointerLeave={recover}
      onPointerMove={handlePointerMove}
    >
      {previousMountain && (
        <pre
          className={`ascii-mountain-layer ascii-mountain-previous${
            crossfading ? " is-fading" : ""
          }`}
        >
          {previousMountain}
        </pre>
      )}
      <pre
        className={`ascii-mountain-layer ascii-mountain-current${
          previousMountain && !crossfading ? " is-entering" : ""
        }`}
      >
        {mountain}
      </pre>
    </div>
  );
}
