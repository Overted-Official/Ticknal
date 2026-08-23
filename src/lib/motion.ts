import { Variants, TargetAndTransition } from 'framer-motion';

export const containerStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.04,
    },
  },
};

export const itemFadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const itemScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const hoverLift: TargetAndTransition = {
  y: -4,
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

export const flyoutReveal: Variants = {
  hidden: { opacity: 0, x: -8, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.16,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const tapPress: TargetAndTransition = {
  scale: 0.98,
  transition: { duration: 0.1 },
};

export const controlHover: TargetAndTransition = {
  y: -1,
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
};

export const controlTap: TargetAndTransition = {
  scale: 0.97,
  transition: { duration: 0.1, ease: [0.22, 1, 0.36, 1] },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};
