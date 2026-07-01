import {
  Activity,
  AlertTriangle,
  Box,
  Camera,
  ChartLine,
  Circle,
  Gauge,
  House,
  ImageOff,
  Lightbulb,
  MousePointerClick,
  PanelTop,
  Sparkles,
  Thermometer,
  Type,
  Zap,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle,
  Box,
  Camera,
  ChartLine,
  Circle,
  Gauge,
  House,
  ImageOff,
  Lightbulb,
  MousePointerClick,
  PanelTop,
  Sparkles,
  Thermometer,
  Type,
  Zap,
};

export interface RuntimeIconProps {
  name?: string | undefined;
  size?: number | undefined;
  className?: string | undefined;
}

export function RuntimeIcon({ name = "Circle", size = 22, className }: RuntimeIconProps) {
  const Icon = iconMap[name] ?? Circle;
  return <Icon aria-hidden="true" className={className} size={size} />;
}
