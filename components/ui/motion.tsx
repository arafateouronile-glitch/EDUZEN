/**
 * Wrapper optimisé pour framer-motion
 * 
 * Centralise les imports de framer-motion pour améliorer le tree-shaking
 * et permettre une optimisation future (remplacement par une alternative plus légère)
 * 
 * Usage:
 *   import { motion, AnimatePresence } from '@/components/ui/motion'
 *   au lieu de
 *   import { motion, AnimatePresence } from 'framer-motion'
 */

// Imports spécifiques pour améliorer le tree-shaking
// Next.js et webpack peuvent mieux optimiser les imports nommés
export {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  useSpring,
  useAnimationControls,
  useScroll,
  Reorder,
  type MotionProps,
  type AnimatePresenceProps,
  type MotionValue,
} from 'framer-motion'
