"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: { rotate: [0, -6, 6, -3, 0], transition: { duration: 0.6, ease: "easeInOut" } },
};

const ScaleIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
          <motion.g animate={controls} variants={VARIANTS} initial="normal" style={{ transformOrigin: "12px 3px" }}>
          <path d="M12 3v18" />
          <path d="m19 8 3 8a5 5 0 0 1-6 0zV7" />
          <path d="m5 8 3 8a5 5 0 0 1-6 0zV7" />
          <path d="M6 7h12" />
        </motion.g>
        </svg>
      </div>
    );
  }
);

ScaleIcon.displayName = "ScaleIcon";

export { ScaleIcon as default, ScaleIcon, ScaleIcon as Scale };
