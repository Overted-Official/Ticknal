"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const OUTER_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: { scale: [1, 1.05, 1], transition: { duration: 0.4 } },
};
const INNER_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: { scale: [1, 1.25, 1], transition: { duration: 0.4, delay: 0.1 } },
};

const TargetIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
          <motion.circle cx="12" cy="12" r="10" animate={controls} variants={OUTER_VARIANTS} initial="normal" style={{ transformOrigin: "12px 12px" }} />
        <circle cx="12" cy="12" r="6" />
        <motion.circle cx="12" cy="12" r="2" animate={controls} variants={INNER_VARIANTS} initial="normal" style={{ transformOrigin: "12px 12px" }} />
        </svg>
      </div>
    );
  }
);

TargetIcon.displayName = "TargetIcon";

export { TargetIcon as default, TargetIcon, TargetIcon as Target };
