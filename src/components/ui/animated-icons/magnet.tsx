"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [0, -12, 12, -6, 0],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

const MagnetIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, strokeWidth = 2, color, fill = "none", style, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseEnter?.(e);
        controls.start("animate");
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseLeave?.(e);
        controls.start("normal");
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn("inline-flex items-center justify-center shrink-0 leading-none", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          className="w-full h-full"
          fill={fill}
          height={size}
          stroke={color || "currentColor"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.g animate={controls} variants={VARIANTS} initial="normal" style={{ transformOrigin: "12px 12px" }}>
          <path d="m12 15 4 4" />
          <path d="M2.352 10.648a1.205 1.205 0 0 0 0 1.704l4.296 4.296a1.205 1.205 0 0 0 1.704 0l12.75-12.75a1.205 1.205 0 0 0 0-1.704L16.806.498a1.205 1.205 0 0 0-1.704 0l-4.296 4.296a1.205 1.205 0 0 0 0 1.704l2.592 2.592-7.046 7.046-2.592-2.592a1.205 1.205 0 0 0-1.704 0Z" />
          <path d="m5 8 4 4" />
        </motion.g>
        </svg>
      </div>
    );
  }
);

MagnetIcon.displayName = "MagnetIcon";

export { MagnetIcon as default, MagnetIcon, MagnetIcon as Magnet };
