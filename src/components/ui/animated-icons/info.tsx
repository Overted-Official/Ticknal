"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from "./types";

const DOT_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -3, 0], transition: { duration: 0.35, ease: "easeOut" } },
};
const BODY_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: { scale: [1, 1.06, 1], transition: { duration: 0.4 } },
};

const InfoIcon: AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
          <motion.g animate={controls} variants={BODY_VARIANTS} initial="normal" style={{ transformOrigin: "12px 12px" }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
        </motion.g>
        <motion.path
          d="M12 8h.01"
          animate={controls}
          variants={DOT_VARIANTS}
          initial="normal"
        />
        </svg>
      </div>
    );
  }
);

InfoIcon.displayName = "InfoIcon";

export { InfoIcon as default, InfoIcon, InfoIcon as Info };
