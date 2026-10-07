"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const SVG_VARIANTS: Variants = {
  normal: { scale: 1, rotate: 0 },
  animate: {
    scale: [1, 1.15, 0.96, 1.05, 1],
    rotate: [0, -8, 6, 0],
    transition: { duration: 0.45, ease: "easeInOut" },
  },
};

const LINE_VARIANTS: Variants = {
  normal: { pathLength: 1, opacity: 1 },
  animate: {
    pathLength: [0.3, 1],
    opacity: [0.5, 1],
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const Share2Icon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
        <motion.svg
          className="w-full h-full"
          animate={controls}
          variants={SVG_VARIANTS}
          initial="normal"
          fill={fill}
          height={size}
          stroke={color || "currentColor"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
          style={{ transformOrigin: "12px 12px" }}
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <motion.line
            x1="8.59"
            x2="15.42"
            y1="13.51"
            y2="17.49"
            variants={LINE_VARIANTS}
            animate={controls}
            initial="normal"
          />
          <motion.line
            x1="15.41"
            x2="8.59"
            y1="6.51"
            y2="10.49"
            variants={LINE_VARIANTS}
            animate={controls}
            initial="normal"
          />
        </motion.svg>
      </div>
    );
  }
);

Share2Icon.displayName = "Share2Icon";

export { Share2Icon as default, Share2Icon, Share2Icon as Share2, Share2Icon as Share };
