'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { itemFadeInUp, hoverLift } from '@/lib/motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  enableHover?: boolean;
  enableSpecular?: boolean;
}

export default function GlassCard({
  children,
  className = '',
  enableHover = true,
  enableSpecular = true,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      variants={itemFadeInUp}
      whileHover={enableHover ? hoverLift : undefined}
      className={`glass-panel ${enableHover ? 'glass-panel-hover' : ''} ${!enableSpecular ? 'before:hidden' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
