/**
 * The platform's only icon entry point.
 *
 * Components import icons from here so icon style, animations, package choice, and
 * future substitutions remain centralized.
 *
 * Animated icons are imported from @/components/ui/animated-icons (powered by Framer Motion,
 * matching pqoqubbw/icons & lucide-animated.com).
 * Any icon without an animated replacement seamlessly falls back to lucide-react.
 */
import type React from 'react';

// Re-export fallback icons and Lucide types from lucide-react
export * from 'lucide-react';

export type LucideProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  fill?: string;
  className?: string;
  absoluteStrokeWidth?: boolean;
};

export type LucideIcon = React.ComponentType<any>;

// Explicitly export all animated icons (named exports override wildcard exports in ES module semantics)
export {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Award,
  BarChart2,
  BarChart3,
  Bell,
  BellOff,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Clock,
  Coins,
  Compass,
  Cpu,
  Crosshair,
  Delete,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Globe,
  HelpCircle,
  Home,
  Info,
  KeyRound,
  Landmark,
  Laptop,
  Layers,
  LayoutGrid,
  LineChart,
  Lock,
  LogOut,
  Magnet,
  Mail,
  Menu,
  Monitor,
  MoreHorizontal,
  Move,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Ruler,
  Scale,
  Search,
  Send,
  Settings,
  Shapes,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  Target,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Type,
  User,
  Wallet,
  X,
  Zap,
  ZoomIn,
} from './animated-icons';
