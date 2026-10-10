"use client";

import { useEffect, useRef } from "react";

const BINS = 42;

function smoothPath(samples: number[], width: number, height: number) {
  const mid = height / 2;
  const step = width / (samples.length - 1);
  const points = samples.map((amp, index) => ({
    x: index * step,
    y: mid - amp * (height * 0.46),
  }));

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const cx = (previous.x + current.x) / 2;
    const cy = (previous.y + current.y) / 2;
    path += ` Q ${previous.x.toFixed(2)} ${previous.y.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)}`;
  }
  const last = points[points.length - 1];
  path += ` T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;

  for (let index = points.length - 1; index >= 0; index -= 1) {
    const current = points[index];
    const mirror = mid + (mid - current.y);
    path += ` L ${current.x.toFixed(2)} ${mirror.toFixed(2)}`;
  }
  path += " Z";
  return path;
}

export function AudioWave({
  analyser,
  active,
  onLevel,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
  onLevel: (level: number) => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const onLevelRef = useRef(onLevel);
  const activeRef = useRef(active);
  const analyserRef = useRef(analyser);

  useEffect(() => {
    onLevelRef.current = onLevel;
    activeRef.current = active;
    analyserRef.current = analyser;
  });

  useEffect(() => {
    const samples = new Array<number>(BINS).fill(0.05);
    const time = new Uint8Array(2048);
    let frame = 0;
    let lastEmit = 0;
    let phase = 0;

    const draw = (now: number) => {
      phase += 0.045;
      const node = analyserRef.current;
      let level = 0;

      if (activeRef.current && node) {
        node.getByteTimeDomainData(time);
        const size = Math.floor(time.length / BINS);
        for (let index = 0; index < BINS; index += 1) {
          let sum = 0;
          const start = index * size;
          for (let offset = 0; offset < size; offset += 1) {
            const sample = (time[start + offset] - 128) / 128;
            sum += sample * sample;
          }
          const rms = Math.sqrt(sum / size);
          const shaped = Math.min(1, rms * 3.4);
          samples[index] = samples[index] * 0.55 + shaped * 0.45;
          level += shaped;
        }
        level = Math.min(1, level / BINS * 2.4);
      } else {
        for (let index = 0; index < BINS; index += 1) {
          const breath = 0.045 + Math.sin(phase + index * 0.38) * 0.02;
          samples[index] = samples[index] * 0.82 + breath * 0.18;
        }
        level = 0;
      }

      pathRef.current?.setAttribute("d", smoothPath(samples, 320, 72));
      if (now - lastEmit > 80) {
        lastEmit = now;
        onLevelRef.current(level);
      }
      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      viewBox="0 0 320 72"
      aria-hidden="true"
      className={`h-16 w-[min(100%,20rem)] overflow-visible transition-opacity duration-300 ${
        active ? "text-primary opacity-100" : "text-foreground opacity-40"
      }`}
      style={{ transitionProperty: "opacity" }}
    >
      <path
        ref={pathRef}
        d="M 0 36 L 320 36 Z"
        fill="currentColor"
        fillOpacity={active ? 0.22 : 0.08}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
