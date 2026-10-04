"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const TOP_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, 3, 0], transition: { duration: 0.4, ease: "easeInOut" } },
};
const BOTTOM_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, -3, 0], transition: { duration: 0.4, ease: "easeInOut" } },
};

const ArrowRightLeftIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
          <motion.g animate={controls} variants={TOP_VARIANTS} initial="normal">
          <path d="m16 3 4 4-4 4" />
          <path d="M20 7H4" />
        </motion.g>
        <motion.g animate={controls} variants={BOTTOM_VARIANTS} initial="normal">
          <path d="m8 21-4-4 4-4" />
          <path d="M4 17h16" />
        </motion.g>
        </svg>
      </div>
    );
  }
);

ArrowRightLeftIcon.displayName = "ArrowRightLeftIcon";

export { ArrowRightLeftIcon as default, ArrowRightLeftIcon, ArrowRightLeftIcon as ArrowRightLeft };
