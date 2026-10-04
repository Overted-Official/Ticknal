"use client";

import type { Transition, Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const TRANSITION: Transition = {
  duration: 0.5,
  ease: "easeInOut",
  repeat: 1,
};

const Y_VARIANTS: Variants = {
  normal: {
    scale: 1,
    rotate: 0,
    opacity: 1,
  },
  animate: {
    scaleY: [1, 1.5, 1],
    opacity: [1, 0.8, 1],
  },
};
const X_VARIANTS: Variants = {
  normal: {
    scale: 1,
    rotate: 0,
    opacity: 1,
  },
  animate: {
    scaleX: [1, 1.5, 1],
    opacity: [1, 0.8, 1],
  },
};

const CpuIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
        <svg className="w-full h-full"
          fill={fill || "none"}
          height={size}
          stroke={color || "currentColor"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect height="16" rx="2" width="16" x="4" y="4" />
          <rect height="6" rx="1" width="6" x="9" y="9" />
          <motion.path
            animate={controls}
            d="M15 2v2"
            transition={TRANSITION}
            variants={Y_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M15 20v2"
            transition={TRANSITION}
            variants={Y_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M2 15h2"
            transition={TRANSITION}
            variants={X_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M2 9h2"
            transition={TRANSITION}
            variants={X_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M20 15h2"
            transition={TRANSITION}
            variants={X_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M20 9h2"
            transition={TRANSITION}
            variants={X_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M9 2v2"
            transition={TRANSITION}
            variants={Y_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M9 20v2"
            transition={TRANSITION}
            variants={Y_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

CpuIcon.displayName = "CpuIcon";


export { CpuIcon as default, CpuIcon, CpuIcon as Cpu };
