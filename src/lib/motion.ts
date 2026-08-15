import { Variants, TargetAndTransition } from 'framer-motion';

export const containerStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const itemFadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const itemScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const hoverLift: TargetAndTransition = {
  y: -2,
  transition: { duration: 0.2, ease: 'easeOut' },
};

export const tapPress: TargetAndTransition = {
  scale: 0.98,
  transition: { duration: 0.1 },
};
