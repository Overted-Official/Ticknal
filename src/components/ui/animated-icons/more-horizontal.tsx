"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const DOT1_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -3, 0], transition: { duration: 0.35, ease: "easeInOut", delay: 0 } },
};
const DOT2_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -3, 0], transition: { duration: 0.35, ease: "easeInOut", delay: 0.08 } },
};
const DOT3_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -3, 0], transition: { duration: 0.35, ease: "easeInOut", delay: 0.16 } },
};

const MoreHorizontalIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
          <motion.circle cx="5" cy="12" r="1" animate={controls} variants={DOT1_VARIANTS} initial="normal" />
        <motion.circle cx="12" cy="12" r="1" animate={controls} variants={DOT2_VARIANTS} initial="normal" />
        <motion.circle cx="19" cy="12" r="1" animate={controls} variants={DOT3_VARIANTS} initial="normal" />
        </svg>
      </div>
    );
  }
);

MoreHorizontalIcon.displayName = "MoreHorizontalIcon";

export { MoreHorizontalIcon as default, MoreHorizontalIcon, MoreHorizontalIcon as MoreHorizontal };
