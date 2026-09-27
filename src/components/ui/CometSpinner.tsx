import React, { useId } from 'react';
import { cn } from '@/lib/utils';

const VIEWBOX_SIZE = 112;
const VIEWBOX_CENTER = VIEWBOX_SIZE / 2;

type CometSpinnerProps = React.ComponentProps<'span'> & {
  headScale?: number;
  radiusScale?: number;
  label?: string;
  decorative?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function precision(value: number) {
  return Number(value.toFixed(4));
}

function CometSpinner({
  className,
  style,
  headScale = 0.2,
  radiusScale = 0.83,
  label = 'Loading',
  decorative = false,
  ...props
}: CometSpinnerProps) {
  const instanceId = useId().replace(/:/g, '');
  const safeHeadScale = clamp(headScale, 0.08, 0.35);
  const safeRadiusScale = clamp(radiusScale, 0.3, 1.1);
  const orbitRadius = precision(53 * safeRadiusScale);
  const circumference = precision(2 * Math.PI * orbitRadius);
  const cometLength = precision(clamp(orbitRadius * 2.5, 54, circumference * 0.48));
  const headAngle = precision(cometLength / orbitRadius);
  const headX = precision(VIEWBOX_CENTER + orbitRadius * Math.cos(headAngle));
  const headY = precision(VIEWBOX_CENTER + orbitRadius * Math.sin(headAngle));
  const headRadius = precision(clamp(safeHeadScale * 16, 2.2, 5.6));
  const gradientId = `loading-ui-comet-gradient-${instanceId}`;
  const glowId = `loading-ui-comet-glow-${instanceId}`;

  return (
    <span
        {...props}
        role={decorative ? undefined : 'status'}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
        className={cn(
          'inline-flex aspect-square items-center justify-center align-middle',
          className,
        )}
        style={style}
      >
        <svg
          aria-hidden="true"
          className="block h-full w-full overflow-visible"
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1={VIEWBOX_CENTER + orbitRadius}
              y1={VIEWBOX_CENTER}
              x2={headX}
              y2={headY}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00BCE6" stopOpacity="0.12" />
              <stop offset="42%" stopColor="#2962FF" stopOpacity="0.78" />
              <stop offset="78%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#D500F9" />
            </linearGradient>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.35" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="loading-ui-comet-orbit" filter={`url(#${glowId})`}>
            <circle
              cx={VIEWBOX_CENTER}
              cy={VIEWBOX_CENTER}
              r={orbitRadius}
              fill="none"
              stroke="rgb(0 188 230 / 0.16)"
              strokeWidth="1.35"
            />
            <circle
              cx={VIEWBOX_CENTER}
              cy={VIEWBOX_CENTER}
              r={orbitRadius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeWidth="3.5"
              strokeDasharray={`${cometLength} ${precision(circumference - cometLength)}`}
            />
            <circle cx={headX} cy={headY} r={headRadius * 2.2} fill="#D500F9" opacity="0.18" />
            <circle cx={headX} cy={headY} r={headRadius} fill="#D500F9" />
          </g>
        </svg>
        {!decorative && <span className="sr-only">{label}</span>}
    </span>
  );
}

export { CometSpinner };
