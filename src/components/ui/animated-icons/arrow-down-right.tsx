"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const HEAD_VARIANTS: Variants = {
  normal: { translateX: 0, translateY: 0 },
  animate: {
    translateX: [0, -3, 0],
    translateY: [0, -3, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

const SHAFT_VARIANTS: Variants = {
  normal: { translateX: 0, translateY: 0, scale: 1 },
  animate: {
    translateX: [0, -3, 0],
    translateY: [0, -3, 0],
    scale: [1, 0.85, 1],
    originX: 1,
    originY: 1,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

const ArrowDownRightIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
        <motion.path
          animate={controls}
          d="M7 7 L17 17"
          variants={SHAFT_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M17 7v10H7"
          variants={HEAD_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M17 17 L10 17"
          variants={HEAD_VARIANTS}
        />
      </svg>
    </div>
  );
});

ArrowDownRightIcon.displayName = "ArrowDownRightIcon";


export { ArrowDownRightIcon as default, ArrowDownRightIcon, ArrowDownRightIcon as ArrowDownRight };
