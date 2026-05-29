"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Scan,
  AlertTriangle,
  AlertOctagon,
  Info,
  ChevronDown,
  Copy,
  Check,
  Zap,
  Eye,
  FileCode,
  Bug,
  Lock,
  ExternalLink,
  Sparkles,
  X,
  Terminal,
  BookOpen,
  BarChart3,
  ShieldX,
  Activity,
  Hash,
  Clock,
  Gauge,
  Search,
  List,
  Filter,
  Keyboard,
  Play,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  Loader2,
  Sun,
  Moon,
  Download,
  FileText,
  Layers,
  CreditCard,
  Phone,
  Mail,
  Key,
  Globe,
  Shuffle,
  Dices,
  GraduationCap,
  ChevronRight,
  FileSpreadsheet,
  Code,
  ToggleLeft,
  ToggleRight,
  Wand2,
  Bot,
  LayoutList,
  Highlighter,
  Braces,
  ScanLine,
  Radar,
  Plus,
  Trash2,
  Save,
  FilePlus,
  History,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { Finding, ScanResult, CustomRule } from "@/app/_types";
import { CATEGORY_COLORS } from "@/app/_data";

// ─── Severity Helpers ────────────────────────────────────────────────────────


export function getSeverityConfig(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return {
        color: "text-red-700 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/40",
        border: "border-red-200 dark:border-red-800",
        badgeBg: "bg-red-500",
        icon: AlertOctagon,
        dot: "bg-red-500",
        ring: "ring-red-500/20",
      };
    case "HIGH":
      return {
        color: "text-orange-700 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-950/40",
        border: "border-orange-200 dark:border-orange-800",
        badgeBg: "bg-orange-500",
        icon: AlertTriangle,
        dot: "bg-orange-500",
        ring: "ring-orange-500/20",
      };
    case "MEDIUM":
      return {
        color: "text-yellow-700 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-950/40",
        border: "border-yellow-200 dark:border-yellow-800",
        badgeBg: "bg-yellow-500",
        icon: AlertTriangle,
        dot: "bg-yellow-500",
        ring: "ring-yellow-500/20",
      };
    case "LOW":
      return {
        color: "text-blue-700 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/40",
        border: "border-blue-200 dark:border-blue-800",
        badgeBg: "bg-blue-500",
        icon: Info,
        dot: "bg-blue-500",
        ring: "ring-blue-500/20",
      };
    default:
      return {
        color: "text-gray-700 dark:text-gray-400",
        bg: "bg-gray-50 dark:bg-gray-800/40",
        border: "border-gray-200 dark:border-gray-700",
        badgeBg: "bg-gray-500",
        icon: Info,
        dot: "bg-gray-500",
        ring: "ring-gray-500/20",
      };
  }
}

export function getCategoryIcon(category: string) {
  switch (category) {
    case "prompt-injection": return <Zap className="w-3.5 h-3.5" />;
    case "jailbreak": return <ShieldAlert className="w-3.5 h-3.5" />;
    case "system-prompt-leak": return <Lock className="w-3.5 h-3.5" />;
    case "obfuscation": return <Eye className="w-3.5 h-3.5" />;
    case "goal-hijacking": return <Bug className="w-3.5 h-3.5" />;
    case "pii-exfiltration": return <Key className="w-3.5 h-3.5" />;
    default: return <Shield className="w-3.5 h-3.5" />;
  }
}

export function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    "prompt-injection": "Prompt Injection",
    jailbreak: "Jailbreak",
    "system-prompt-leak": "System Leak",
    obfuscation: "Obfuscation",
    "goal-hijacking": "Goal Hijacking",
    "pii-exfiltration": "PII Exfiltration",
  };
  return labels[category] || category;
}

export function getScoreColor(score: number) {
  if (score >= 75) return "text-red-600 dark:text-red-400";
  if (score >= 45) return "text-orange-600 dark:text-orange-400";
  if (score >= 30) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 10) return "text-blue-600 dark:text-blue-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function getScoreStroke(score: number) {
  if (score >= 75) return "#ef4444";
  if (score >= 45) return "#f97316";
  if (score >= 30) return "#eab308";
  if (score >= 10) return "#3b82f6";
  return "#10b981";
}

export function getScoreLabel(score: number) {
  if (score >= 75) return "CRITICAL";
  if (score >= 45) return "HIGH RISK";
  if (score >= 30) return "ELEVATED";
  if (score >= 10) return "LOW";
  return "SAFE";
}

export function getScoreGrade(score: number): { grade: string; color: string; bg: string } {
  if (score >= 80) return { grade: "F", color: "text-red-700 dark:text-red-300", bg: "bg-red-500" };
  if (score >= 60) return { grade: "D", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500" };
  if (score >= 40) return { grade: "C", color: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-500" };
  if (score >= 20) return { grade: "B", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500" };
  return { grade: "A+", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500" };
}

// ─── Animated Score Counter ──────────────────────────────────────────────────

export function AnimatedCounter({ target }: { target: number }) {
  const [displayValue, setDisplayValue] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    prevTarget.current = target;
    if (diff === 0) return;

    const duration = 800;
    const startTime = performance.now();

    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }, [target]);

  return <>{displayValue}</>;
}

// ─── Risk Score Gauge ────────────────────────────────────────────────────────

export function RiskGauge({ score, animate }: { score: number; animate?: boolean }) {
  const circumference = 2 * Math.PI * 52;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={score >= 50 ? "#ef4444" : "#10b981"} />
            <stop offset="100%" stopColor={getScoreStroke(score)} />
          </linearGradient>
        </defs>
        <circle
          cx="60" cy="60" r="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-muted/20"
        />
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * 360;
          const rad = (angle * Math.PI) / 180;
          const x1 = 60 + 46 * Math.cos(rad);
          const y1 = 60 + 46 * Math.sin(rad);
          const x2 = 60 + 49 * Math.cos(rad);
          const y2 = 60 + 49 * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted/30"
            />
          );
        })}
        <circle
          cx="60" cy="60" r="52"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
          stroke="url(#gaugeGradient)"
          filter="url(#glow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-3xl font-bold tabular-nums ${getScoreColor(score)}`}
          initial={animate ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatedCounter target={score} />
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

// ─── Finding Card ────────────────────────────────────────────────────────────

export function FindingCard({ finding, index, expanded: externalExpanded }: { finding: Finding; index: number; expanded?: boolean }) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = externalExpanded ?? internalExpanded;
  const config = getSeverityConfig(finding.severity);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden shadow-sm hover:shadow-md transition-all ring-1 ${config.ring}`}
    >
      <button
        type="button"
        className="w-full p-4 flex items-start gap-3 text-left cursor-pointer"
        onClick={() => setInternalExpanded(!expanded)}
      >
        <div className={`mt-0.5 p-1.5 rounded-lg ${config.badgeBg} text-white shrink-0 shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-mono ${config.color} border-current/20`}>
              {finding.rule_id}
            </Badge>
            <Badge variant="secondary" className="text-[10px] gap-1">
              {getCategoryIcon(finding.category)}
              {getCategoryLabel(finding.category)}
            </Badge>
            <Badge className={`text-[10px] ${config.badgeBg} text-white shadow-sm`}>
              {finding.severity}
            </Badge>
          </div>
          <h4 className={`font-semibold text-sm ${config.color}`}>{finding.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{finding.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${config.dot}`} />
            <span className="text-[10px] font-mono text-muted-foreground">{(finding.confidence * 100).toFixed(0)}%</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Matched Text</p>
                <code className="text-xs bg-background/80 px-2.5 py-1.5 rounded-md border block overflow-x-auto font-mono">
                  &quot;{finding.matched_text}&quot;
                </code>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Confidence</p>
                  <div className="flex items-center gap-2">
                    <Progress value={finding.confidence * 100} className="h-2 flex-1" />
                    <span className="text-xs font-mono tabular-nums">{(finding.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Position</p>
                  <span className="text-xs font-mono">{finding.position}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Remediation
                </p>
                <p className="text-xs text-foreground leading-relaxed">{finding.remediation}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Detected by:</span>
                <Badge variant="outline" className="text-[10px] font-mono">{finding.detector}</Badge>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Stats Summary ───────────────────────────────────────────────────────────

export function StatsSummary({ result }: { result: ScanResult }) {
  const stats = [
    { icon: Gauge, label: "Risk Score", value: result.risk_score, color: getScoreColor(result.risk_score), suffix: "" },
    { icon: Hash, label: "Findings", value: result.findings.length, color: "", suffix: "" },
    { icon: Clock, label: "Duration", value: result.metadata.scan_duration_ms, color: "", suffix: "ms" },
    { icon: Activity, label: "Status", value: result.is_safe ? "SAFE" : "UNSAFE", color: result.is_safe ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400", suffix: "", isText: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-0 shadow-sm bg-muted/30 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold tabular-nums ${stat.color}`}>
                {stat.value}
                {stat.suffix && <span className="text-xs font-normal text-muted-foreground">{stat.suffix}</span>}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Severity Breakdown Chart ────────────────────────────────────────────────

export function SeverityChart({ result }: { result: ScanResult }) {
  const severityCounts = result.findings.reduce(
    (acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          Severity Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {severities.map((sev) => {
          const count = severityCounts[sev] || 0;
          const maxCount = Math.max(...Object.values(severityCounts), 1);
          const pct = (count / maxCount) * 100;
          const config = getSeverityConfig(sev);
          return (
            <div key={sev} className="flex items-center gap-2">
              <span className={`text-[10px] font-mono w-14 ${config.color}`}>{sev}</span>
              <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${config.badgeBg}`}
                />
              </div>
              <span className="text-[10px] font-mono w-4 text-right tabular-nums">{count}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Category Breakdown ──────────────────────────────────────────────────────

export function CategoryChart({ result }: { result: ScanResult }) {
  const categoryCounts = result.findings.reduce(
    (acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const categories = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {categories.map(([cat, count]) => (
          <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              {getCategoryIcon(cat)}
              <span className="text-xs font-medium">{getCategoryLabel(cat)}</span>
            </div>
            <Badge variant="secondary" className="text-[10px] tabular-nums">{count}</Badge>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="text-center py-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">No threats detected</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

export function DonutChart({ result }: { result: ScanResult }) {
  const categoryCounts = result.findings.reduce(
    (acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const total = result.findings.length;
  const radius = 52;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const rawSegments = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => ({
      category: cat,
      count,
      color: CATEGORY_COLORS[cat] || "#6b7280",
      proportion: count / total,
    }));

  // Pre-compute cumulative offsets for each segment
  const segments = rawSegments.reduce<{ category: string; count: number; color: string; proportion: number; offset: number }[]>(
    (acc, seg) => {
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].proportion * circumference : 0;
      return [...acc, { ...seg, offset: prevOffset }];
    },
    []
  );

  if (total === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Radar className="w-3.5 h-3.5 text-muted-foreground" />
            Attack Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">No threats</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Prompt is safe</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <Radar className="w-3.5 h-3.5 text-muted-foreground" />
          Attack Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/20"
            />
            {/* Segments */}
            {segments.map((seg, i) => {
              const segmentLength = seg.proportion * circumference;
              const dashOffset = circumference - seg.offset;
              return (
                <motion.circle
                  key={seg.category}
                  cx="60" cy="60" r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={dashOffset}
                  initial={{ opacity: 0, strokeDasharray: `0 ${circumference}` }}
                  animate={{ opacity: 1, strokeDasharray: `${segmentLength} ${circumference - segmentLength}` }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                />
              );
            })}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-bold tabular-nums"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {total}
            </motion.span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {total === 1 ? "finding" : "findings"}
            </span>
          </div>
        </div>
        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 w-full">
          {segments.map((seg) => (
            <div key={seg.category} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[10px] text-muted-foreground truncate">{getCategoryLabel(seg.category)}</span>
              <span className="text-[10px] font-mono tabular-nums ml-auto">{seg.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Scan Metadata ───────────────────────────────────────────────────────────

export function ScanMetadata({ result }: { result: ScanResult }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
          Scan Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Prompt Length</span>
          <span className="font-mono tabular-nums">{result.metadata.prompt_length} chars</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Scan Duration</span>
          <span className="font-mono tabular-nums">{result.metadata.scan_duration_ms}ms</span>
        </div>
        <Separator className="my-1" />
        <div>
          <span className="text-muted-foreground">Detectors</span>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {result.metadata.detectors_used.map((d) => (
              <Badge key={d} variant="outline" className="text-[10px] font-mono">{d}</Badge>
            ))}
          </div>
        </div>
        {result.metadata.transformations_applied.length > 0 && (
          <>
            <Separator className="my-1" />
            <div>
              <span className="text-muted-foreground">Transformations</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {result.metadata.transformations_applied.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Normalization Preview ───────────────────────────────────────────────────

export function NormalizationPreview({ result, originalPrompt }: { result: ScanResult; originalPrompt: string }) {
  const normalized = result.normalized_prompt;
  const hasTransformations = result.metadata.transformations_applied.length > 0;

  if (!hasTransformations || !normalized) return null;

  // Character-level diff: compute LCS-style inline diff
  // Simple approach: highlight characters that changed
  const originalChars = originalPrompt.split("");
  const normalizedChars = normalized.split("");

  // Build inline diff for original (show removed chars struck through)
  const originalSegments: { text: string; type: "same" | "removed" }[] = [];
  const normalizedSegments: { text: string; type: "same" | "added" }[] = [];

  let oi = 0;
  let ni = 0;

  while (oi < originalChars.length || ni < normalizedChars.length) {
    const oChar = oi < originalChars.length ? originalChars[oi] : null;
    const nChar = ni < normalizedChars.length ? normalizedChars[ni] : null;

    if (oChar !== null && nChar !== null && oChar.toLowerCase() === nChar.toLowerCase()) {
      // Same character (case-insensitive match)
      const lastOrig = originalSegments[originalSegments.length - 1];
      const lastNorm = normalizedSegments[normalizedSegments.length - 1];
      if (lastOrig?.type === "same") {
        lastOrig.text += oChar;
      } else {
        originalSegments.push({ text: oChar, type: "same" });
      }
      if (lastNorm?.type === "same") {
        lastNorm.text += nChar;
      } else {
        normalizedSegments.push({ text: nChar, type: "same" });
      }
      oi++;
      ni++;
    } else if (oChar !== null && nChar !== null && oChar.toLowerCase() !== nChar.toLowerCase()) {
      // Different character
      const lastOrig = originalSegments[originalSegments.length - 1];
      const lastNorm = normalizedSegments[normalizedSegments.length - 1];
      if (lastOrig?.type === "removed") {
        lastOrig.text += oChar;
      } else {
        originalSegments.push({ text: oChar, type: "removed" });
      }
      if (lastNorm?.type === "added") {
        lastNorm.text += nChar;
      } else {
        normalizedSegments.push({ text: nChar, type: "added" });
      }
      oi++;
      ni++;
    } else if (oChar !== null) {
      // Only original has this char (removed)
      const lastOrig = originalSegments[originalSegments.length - 1];
      if (lastOrig?.type === "removed") {
        lastOrig.text += oChar;
      } else {
        originalSegments.push({ text: oChar, type: "removed" });
      }
      oi++;
    } else if (nChar !== null) {
      // Only normalized has this char (added)
      const lastNorm = normalizedSegments[normalizedSegments.length - 1];
      if (lastNorm?.type === "added") {
        lastNorm.text += nChar;
      } else {
        normalizedSegments.push({ text: nChar, type: "added" });
      }
      ni++;
    }
  }

  const changeCount = originalSegments.filter((s) => s.type === "removed").length + normalizedSegments.filter((s) => s.type === "added").length;

  return (
    <Card className="shadow-sm border-purple-200 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-purple-500" />
          Normalization Diff
        </CardTitle>
        <CardDescription className="text-[10px]">
          {result.metadata.transformations_applied.join(" → ")} • {changeCount} change{changeCount !== 1 ? "s" : ""} detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-red-200 dark:bg-red-800/50" />
              Original
            </p>
            <pre className="text-[11px] bg-background/80 p-2.5 rounded-md border font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto leading-relaxed custom-scrollbar">
              {originalSegments.map((seg, idx) => (
                <span
                  key={idx}
                  className={seg.type === "removed" ? "bg-red-200/60 dark:bg-red-800/40 text-red-700 dark:text-red-300 line-through decoration-red-400/50 rounded px-0.5" : ""}
                >
                  {seg.text}
                </span>
              ))}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-emerald-200 dark:bg-emerald-800/50" />
              Normalized
            </p>
            <pre className="text-[11px] bg-background/80 p-2.5 rounded-md border font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto leading-relaxed custom-scrollbar">
              {normalizedSegments.map((seg, idx) => (
                <span
                  key={idx}
                  className={seg.type === "added" ? "bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 rounded px-0.5" : ""}
                >
                  {seg.text}
                </span>
              ))}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Rule Editor ──────────────────────────────────────────────────────

export function CustomRuleEditor({ customRules, setCustomRules }: { customRules: CustomRule[]; setCustomRules: React.Dispatch<React.SetStateAction<CustomRule[]>> }) {
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    severity: "MEDIUM",
    category: "prompt-injection",
  });
  const [patternError, setPatternError] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleAddRule = useCallback(() => {
    if (!newRule.pattern || !newRule.title) return;

    // Validate regex
    try {
      new RegExp(newRule.pattern);
    } catch (e) {
      setPatternError(e instanceof Error ? e.message : "Invalid regex pattern");
      return;
    }
    setPatternError(null);

    const rule: CustomRule = {
      id: `USER-${Date.now()}`,
      pattern: newRule.pattern,
      severity: newRule.severity || "MEDIUM",
      category: newRule.category || "prompt-injection",
      title: newRule.title,
      description: newRule.description || "Custom user-defined rule",
      remediation: newRule.remediation || "Review this custom finding",
    };

    setCustomRules((prev) => [...prev, rule]);
    setNewRule({ severity: "MEDIUM", category: "prompt-injection" });
  }, [newRule, setCustomRules]);

  const handleRemoveRule = useCallback((id: string) => {
    setCustomRules((prev) => prev.filter((r) => r.id !== id));
  }, [setCustomRules]);

  const handleExport = useCallback(() => {
    if (customRules.length === 0) return;
    const blob = new Blob([JSON.stringify(customRules, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-guard-custom-rules-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [customRules]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data)) return;
        const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
        const validCategories = ["prompt-injection", "jailbreak", "system-prompt-leak", "obfuscation", "goal-hijacking", "pii-exfiltration"];
        const validRules: CustomRule[] = [];
        for (const rule of data) {
          if (
            typeof rule.pattern === "string" &&
            typeof rule.title === "string" &&
            validSeverities.includes(rule.severity) &&
            validCategories.includes(rule.category)
          ) {
            // Validate the regex pattern
            try { new RegExp(rule.pattern); } catch { continue; }
            validRules.push({
              id: rule.id || `USER-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              pattern: rule.pattern,
              severity: rule.severity,
              category: rule.category,
              title: rule.title,
              description: rule.description || "Imported custom rule",
              remediation: rule.remediation || "Review this custom finding",
            });
          }
        }
        if (validRules.length > 0) {
          setCustomRules((prev) => {
            const merged = [...prev, ...validRules];
            return merged.slice(0, 20);
          });
        }
      } catch {
        // Invalid JSON, ignore
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  }, [setCustomRules]);

  return (
    <Card className="shadow-sm border-indigo-200/50 dark:border-indigo-900/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <FilePlus className="w-3.5 h-3.5 text-indigo-500" />
            Custom Rules
          </CardTitle>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-[10px] h-6 px-2" onClick={handleExport} disabled={customRules.length === 0}>
                  <Download className="w-3 h-3" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>{customRules.length > 0 ? "Export rules as JSON" : "No rules to export"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-[10px] h-6 px-2" onClick={() => importFileRef.current?.click()}>
                  <Upload className="w-3 h-3" />
                  Import
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import rules from JSON</TooltipContent>
            </Tooltip>
            <input
              ref={importFileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
        <CardDescription className="text-[10px]">
          Add your own regex patterns to detect custom threats. Max 20 rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new rule form */}
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Rule title"
            value={newRule.title || ""}
            onChange={(e) => setNewRule((prev) => ({ ...prev, title: e.target.value }))}
            className="h-7 text-xs"
          />
          <div className="relative">
            <Input
              placeholder="Regex pattern (e.g. bypass|override)"
              value={newRule.pattern || ""}
              onChange={(e) => {
                setNewRule((prev) => ({ ...prev, pattern: e.target.value }));
                setPatternError(null);
              }}
              className={`h-7 text-xs font-mono ${patternError ? "border-red-400" : ""}`}
            />
          </div>
          <select
            value={newRule.severity || "MEDIUM"}
            onChange={(e) => setNewRule((prev) => ({ ...prev, severity: e.target.value }))}
            className="h-7 text-xs rounded-md border bg-background px-2"
          >
            {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((sev) => (
              <option key={sev} value={sev}>{sev}</option>
            ))}
          </select>
          <select
            value={newRule.category || "prompt-injection"}
            onChange={(e) => setNewRule((prev) => ({ ...prev, category: e.target.value }))}
            className="h-7 text-xs rounded-md border bg-background px-2"
          >
            {[
              { value: "prompt-injection", label: "Injection" },
              { value: "jailbreak", label: "Jailbreak" },
              { value: "system-prompt-leak", label: "Leakage" },
              { value: "obfuscation", label: "Obfuscation" },
              { value: "goal-hijacking", label: "Hijacking" },
              { value: "pii-exfiltration", label: "PII" },
            ].map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        {patternError && (
          <p className="text-[10px] text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {patternError}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-[10px] h-7 w-full"
          onClick={handleAddRule}
          disabled={!newRule.pattern || !newRule.title || customRules.length >= 20}
        >
          <Plus className="w-3 h-3" />
          Add Rule
        </Button>

        {/* List of custom rules */}
        {customRules.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <p className="text-[10px] text-muted-foreground font-medium">{customRules.length} custom rule{customRules.length !== 1 ? "s" : ""}</p>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {customRules.map((rule) => {
                  const config = getSeverityConfig(rule.severity);
                  return (
                    <div key={rule.id} className={`flex items-center gap-2 p-2 rounded-lg ${config.bg} border ${config.border} text-xs`}>
                      <Badge className={`text-[8px] px-1 py-0 ${config.badgeBg} text-white`}>{rule.severity}</Badge>
                      <span className={`font-medium ${config.color} flex-1 line-clamp-1`}>{rule.title}</span>
                      <code className="text-[9px] text-muted-foreground font-mono line-clamp-1 max-w-[120px]">{rule.pattern}</code>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Code Snippet Dialog ─────────────────────────────────────────────────────

export function CodeSnippetDialog({ prompt: promptText }: { prompt: string }) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const code = `from prompt_guard import scan\n\nresult = scan("${promptText.replace(/"/g, '\\"').replace(/\n/g, "\\n")}")\nprint(f"Risk Score: {result.risk_score}")\nprint(f"Is Safe: {result.is_safe}")\nfor finding in result.findings:\n    print(f"  [{finding.severity}] {finding.rule_id}: {finding.title}")`;

  const curlCode = `curl -X POST http://localhost:3000/api/scan \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "${promptText.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"}'`;

  const jsCode = `const response = await fetch('/api/scan', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ prompt: "${promptText.replace(/"/g, '\\"').replace(/\n/g, "\\n")}" })\n});\nconst result = await response.json();\nconsole.log(\`Risk Score: \${result.risk_score}\`);\nconsole.log(\`Is Safe: \${result.is_safe}\`);`;

  const handleCopy = (text: string, tab: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const CopyButton = ({ text, tab }: { text: string; tab: string }) => (
    <Button
      size="sm"
      variant="ghost"
      className="absolute top-2 right-2 h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100"
      onClick={() => handleCopy(text, tab)}
    >
      {copiedTab === tab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Get Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Integration Code
          </DialogTitle>
          <DialogDescription>
            Copy and paste this code to integrate prompt-guard into your application.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="python" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="python" className="flex-1 text-xs">Python SDK</TabsTrigger>
            <TabsTrigger value="curl" className="flex-1 text-xs">cURL</TabsTrigger>
            <TabsTrigger value="javascript" className="flex-1 text-xs">JavaScript</TabsTrigger>
          </TabsList>
          {[
            { value: "python", code },
            { value: "curl", code: curlCode },
            { value: "javascript", code: jsCode },
          ].map(({ value, code: c }) => (
            <TabsContent key={value} value={value} className="mt-3">
              <div className="relative">
                <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto max-h-60 font-mono leading-relaxed">
                  <code>{c}</code>
                </pre>
                <CopyButton text={c} tab={value} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Keyboard Shortcuts Dialog ───────────────────────────────────────────────

export function KeyboardShortcutsDialog() {
  const shortcuts = [
    { keys: ["Ctrl", "Enter"], desc: "Scan prompt" },
    { keys: ["Ctrl", "K"], desc: "Clear prompt & results" },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Keyboard className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {shortcuts.map((s) => (
            <div key={s.desc} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <React.Fragment key={k}>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">{k}</kbd>
                    {i < s.keys.length - 1 && <span className="text-xs text-muted-foreground">+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Threat Highlighter ───────────────────────────────────────────────────────

export function ThreatHighlighter({ prompt, findings }: { prompt: string; findings: Finding[] }) {
  if (findings.length === 0) return null;

  // Build threat regions from findings
  const regions: { start: number; end: number; severity: string; rule_id: string }[] = [];

  for (const f of findings) {
    const matched = f.matched_text;
    if (!matched || matched.includes("character(s)") || matched.includes("keywords found")) continue;

    // Try to find the matched text in the prompt
    const searchStr = matched.length > 60 ? matched.substring(0, 60) : matched;
    let idx = prompt.toLowerCase().indexOf(searchStr.toLowerCase());
    if (idx === -1) {
      // Try finding individual words
      const words = searchStr.split(/\s+/).filter((w) => w.length > 3);
      for (const word of words.slice(0, 3)) {
        idx = prompt.toLowerCase().indexOf(word.toLowerCase());
        if (idx !== -1) break;
      }
    }
    if (idx !== -1) {
      const end = Math.min(idx + searchStr.length, prompt.length);
      regions.push({ start: idx, end, severity: f.severity, rule_id: f.rule_id });
    }
  }

  // Sort and merge overlapping regions
  regions.sort((a, b) => a.start - b.start);
  const merged: typeof regions = [];
  for (const r of regions) {
    if (merged.length > 0 && r.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
      // Keep the higher severity
      const sevOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
      if (sevOrder.indexOf(r.severity) < sevOrder.indexOf(merged[merged.length - 1].severity)) {
        merged[merged.length - 1].severity = r.severity;
        merged[merged.length - 1].rule_id = r.rule_id;
      }
    } else {
      merged.push({ ...r });
    }
  }

  if (merged.length === 0) return null;

  // Build highlighted segments
  const segments: { text: string; isThreat: boolean; severity: string }[] = [];
  let lastEnd = 0;
  for (const r of merged) {
    if (r.start > lastEnd) {
      segments.push({ text: prompt.substring(lastEnd, r.start), isThreat: false, severity: "" });
    }
    segments.push({ text: prompt.substring(r.start, r.end), isThreat: true, severity: r.severity });
    lastEnd = r.end;
  }
  if (lastEnd < prompt.length) {
    segments.push({ text: prompt.substring(lastEnd), isThreat: false, severity: "" });
  }

  function getThreatBg(severity: string) {
    switch (severity) {
      case "CRITICAL": return "bg-red-200/60 dark:bg-red-800/40 border-b-2 border-red-500";
      case "HIGH": return "bg-orange-200/60 dark:bg-orange-800/40 border-b-2 border-orange-500";
      case "MEDIUM": return "bg-yellow-200/60 dark:bg-yellow-800/40 border-b-2 border-yellow-500";
      default: return "bg-blue-200/60 dark:bg-blue-800/40 border-b-2 border-blue-500";
    }
  }

  return (
    <Card className="shadow-sm border-amber-200 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          Threat Map
        </CardTitle>
        <CardDescription className="text-[10px]">
          {merged.length} threat region{merged.length !== 1 ? "s" : ""} highlighted in your prompt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-3 rounded-lg bg-background/80 border font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          {segments.map((seg, i) =>
            seg.isThreat ? (
              <span key={i} className={`${getThreatBg(seg.severity)} rounded-sm px-0.5`} title={seg.severity}>
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => {
            const hasSev = merged.some((r) => r.severity === sev);
            if (!hasSev) return null;
            const config = getSeverityConfig(sev);
            return (
              <div key={sev} className="flex items-center gap-1">
                <div className={`w-3 h-2 rounded-sm ${config.badgeBg}`} />
                <span className="text-[9px] text-muted-foreground">{sev}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Safety Tips Card ─────────────────────────────────────────────────────────

export function SafetyTipsCard({ result }: { result: ScanResult }) {
  if (result.findings.length === 0) return null;

  const tips: { icon: React.ElementType; tip: string; color: string }[] = [];
  const categories = new Set(result.findings.map(f => f.category));

  if (categories.has("prompt-injection")) {
    tips.push({ icon: Zap, tip: "Sanitize user input before including it in prompts. Use clear delimiters between instructions and user content.", color: "text-red-500" });
  }
  if (categories.has("jailbreak")) {
    tips.push({ icon: ShieldAlert, tip: "Implement role boundaries. The model should refuse to adopt alternative personas that bypass safety constraints.", color: "text-orange-500" });
  }
  if (categories.has("system-prompt-leak")) {
    tips.push({ icon: Lock, tip: "Never store secrets in system prompts. Monitor for probing questions about your configuration.", color: "text-amber-500" });
  }
  if (categories.has("obfuscation")) {
    tips.push({ icon: Eye, tip: "Always normalize input before analysis — decode Unicode, base64, and leetspeak to catch hidden attacks.", color: "text-purple-500" });
  }
  if (categories.has("goal-hijacking")) {
    tips.push({ icon: Bug, tip: "Mark untrusted content with clear delimiters. Sanitize all external data before including it in prompts.", color: "text-pink-500" });
  }
  if (categories.has("pii-exfiltration")) {
    tips.push({ icon: Key, tip: "Implement PII detection on both inputs and outputs. Never store sensitive data in LLM context windows.", color: "text-teal-500" });
  }

  return (
    <Card className="shadow-sm border-rose-200/50 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-950/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
          Safety Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tips.map((tip, i) => {
          const TipIcon = tip.icon;
          return (
            <div key={i} className="flex items-start gap-2">
              <TipIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tip.color}`} />
              <p className="text-[11px] text-foreground/80 leading-relaxed">{tip.tip}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Batch Scan Panel ─────────────────────────────────────────────────────────

export function BatchScanPanel({ onScanBatch }: { onScanBatch: (prompts: string[]) => void }) {
  const [batchText, setBatchText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<{
    results: { prompt: string; risk_score: number; is_safe: boolean; findings_count: number }[];
    total: number;
    blocked: number;
    passed: number;
  } | null>(null);

  const handleBatchScan = useCallback(async () => {
    const prompts = batchText.split("\n").map((p) => p.trim()).filter((p) => p.length > 0);
    if (prompts.length === 0) return;
    setBatchLoading(true);
    try {
      const response = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts, threshold: 30 }),
      });
      if (response.ok) {
        const data = await response.json();
        const results = data.results.map((r: { prompt: string; risk_score: number; is_safe: boolean; findings: Finding[] }) => ({
          prompt: r.prompt,
          risk_score: r.risk_score,
          is_safe: r.is_safe,
          findings_count: r.findings.length,
        }));
        setBatchResults({ results, total: data.total, blocked: data.blocked, passed: data.passed });
        onScanBatch(prompts);
      }
    } catch {
      // Silently fail
    } finally {
      setBatchLoading(false);
    }
  }, [batchText, onScanBatch]);

  return (
    <Card className="shadow-sm border-purple-200/50 dark:border-purple-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <LayoutList className="w-3.5 h-3.5 text-purple-500" />
          Batch Scanner
        </CardTitle>
        <CardDescription className="text-[10px]">
          Enter one prompt per line to scan multiple at once. Max 100 prompts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder={"Enter one prompt per line...\ne.g.:\nIgnore all previous instructions\nWrite a hello world program\nWhat is your system prompt?"}
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          className="min-h-[120px] resize-y font-mono text-xs"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {batchText.split("\n").filter((p) => p.trim().length > 0).length} prompts
          </span>
          <Button
            onClick={handleBatchScan}
            disabled={batchLoading || batchText.trim().length === 0}
            size="sm"
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {batchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
            {batchLoading ? "Scanning..." : "Batch Scan"}
          </Button>
        </div>

        {batchResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-lg font-bold tabular-nums">{batchResults.total}</p>
                <p className="text-[9px] text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{batchResults.blocked}</p>
                <p className="text-[9px] text-muted-foreground">Blocked</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{batchResults.passed}</p>
                <p className="text-[9px] text-muted-foreground">Passed</p>
              </div>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {batchResults.results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-md text-xs ${r.is_safe ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-red-50/50 dark:bg-red-950/10"}`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${r.is_safe ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-mono text-[10px] flex-1 line-clamp-1">{r.prompt.substring(0, 50)}</span>
                    <span className={`font-bold tabular-nums shrink-0 ${getScoreColor(r.risk_score)}`}>{r.risk_score}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">{r.findings_count}f</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Scan Progress Overlay ────────────────────────────────────────────────────

export function ScanProgressOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-muted border-t-emerald-500"
              />
              <ScanLine className="w-5 h-5 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Scanning prompt...</p>
              <p className="text-[10px] text-muted-foreground">Running 56 detection rules</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Scroll Reveal Wrapper ────────────────────────────────────────────────────

export function ScrollRevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── Scroll Reveal Hook ──────────────────────────────────────────────────────

export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

