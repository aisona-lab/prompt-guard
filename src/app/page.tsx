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

import type { Finding, ScanResult, CustomRule } from "./_types";
import {
  DETECTORS,
  SECURITY_LESSONS,
  EXAMPLE_PROMPTS,
  CATEGORY_COLORS,
  generateRandomAttack,
} from "./_data";

// Presentational components & helpers for the playground (extracted from this file).
import {
  getSeverityConfig,
  getCategoryIcon,
  getCategoryLabel,
  getScoreColor,
  getScoreGrade,
  AnimatedCounter,
  RiskGauge,
  FindingCard,
  StatsSummary,
  SeverityChart,
  CategoryChart,
  DonutChart,
  ScanMetadata,
  NormalizationPreview,
  CustomRuleEditor,
  CodeSnippetDialog,
  KeyboardShortcutsDialog,
  ThreatHighlighter,
  SafetyTipsCard,
  BatchScanPanel,
  ScanProgressOverlay,
  ScrollRevealSection,
} from "@/components/prompt-guard/playground";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<
    { prompt: string; result: ScanResult; timestamp: number }[]
  >([]);
  const [rulesData, setRulesData] = useState<
    { id: string; title: string; severity: string; category: string; pattern: string; description: string; remediation: string }[] | null
  >(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesFilter, setRulesFilter] = useState<string>("all");
  const [threshold, setThreshold] = useState(30);
  const [autoScan, setAutoScan] = useState(false);
  const [totalScans, setTotalScans] = useState(0);
  const [threatsBlocked, setThreatsBlocked] = useState(0);
  const [enabledDetectors, setEnabledDetectors] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"single" | "batch">("single");
  const [llmResult, setLlmResult] = useState<{ is_safe: boolean; risk_score: number; attack_type: string; explanation: string } | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [customScanLoading, setCustomScanLoading] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "safe" | "unsafe">("all");
  const [showHistory, setShowHistory] = useState(false);
  const [liveThreatLevel, setLiveThreatLevel] = useState<"none" | "low" | "medium" | "high">("none");

  // Load scan history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("prompt-guard-history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScanHistory(parsed.slice(0, 10));
        }
      }
      const savedStats = localStorage.getItem("prompt-guard-stats");
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        if (stats.totalScans) setTotalScans(stats.totalScans);
        if (stats.threatsBlocked) setThreatsBlocked(stats.threatsBlocked);
      }
      const savedRules = localStorage.getItem("prompt-guard-custom-rules");
      if (savedRules) {
        const rules = JSON.parse(savedRules);
        if (Array.isArray(rules)) setCustomRules(rules);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Save scan history to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("prompt-guard-history", JSON.stringify(scanHistory.slice(0, 10)));
    } catch {
      // Silently fail
    }
  }, [scanHistory]);

  // Save stats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("prompt-guard-stats", JSON.stringify({ totalScans, threatsBlocked }));
    } catch {
      // Silently fail
    }
  }, [totalScans, threatsBlocked]);

  // Save custom rules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("prompt-guard-custom-rules", JSON.stringify(customRules));
    } catch {
      // Silently fail
    }
  }, [customRules]);

  useEffect(() => setMounted(true), []);

  const handleBatchScanned = useCallback((_prompts: string[]) => {
    setTotalScans((prev) => prev + _prompts.length);
  }, []);

  const toggleDetector = useCallback((id: string) => {
    setEnabledDetectors((prev) => {
      // If no specific selection (all active), start with all detector IDs
      const allIds = DETECTORS.map((d) => d.id);
      const currentActive = prev.length === 0 ? allIds : prev;

      if (currentActive.includes(id)) {
        const newActive = currentActive.filter((d) => d !== id);
        // If all are selected, return empty (meaning all active)
        return newActive.length === allIds.length ? [] : newActive;
      } else {
        const newActive = [...currentActive, id];
        // If all are now selected, return empty (meaning all active)
        return newActive.length === allIds.length ? [] : newActive;
      }
    });
  }, []);

  const handleExport = useCallback((format: "json" | "csv") => {
    if (!result) return;

    if (format === "csv") {
      const headers = ["Rule ID", "Category", "Severity", "Title", "Confidence", "Position", "Matched Text", "Remediation"];
      const rows = result.findings.map((f) =>
        [f.rule_id, f.category, f.severity, `"${f.title}"`, (f.confidence * 100).toFixed(0), f.position, `"${f.matched_text.replace(/"/g, '""')}"`, `"${f.remediation.replace(/"/g, '""')}"`].join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-guard-report-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const report = {
        timestamp: new Date().toISOString(),
        prompt,
        risk_score: result.risk_score,
        is_safe: result.is_safe,
        threshold,
        findings: result.findings,
        metadata: result.metadata,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-guard-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [result, prompt, threshold]);

  const handleScan = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { prompt, threshold, include_normalized: true };
      if (enabledDetectors.length > 0) body.detectors = enabledDetectors;

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Scan failed: ${response.statusText}`);

      const data: ScanResult = await response.json();
      setResult(data);
      setScanHistory((prev) => [
        { prompt, result: data, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      setTotalScans((prev) => prev + 1);
      if (!data.is_safe) setThreatsBlocked((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, threshold, enabledDetectors]);

  // Auto-scan with debounce
  useEffect(() => {
    if (!autoScan || !prompt.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleScan();
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [prompt, autoScan, handleScan]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPrompt("");
        setResult(null);
        setError(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Real-time threat level indicator (debounced keyword check)
  useEffect(() => {
    if (autoScan || !prompt.trim()) {
      setLiveThreatLevel("none");
      return;
    }
    const threatKeywords = ["ignore", "instructions", "system", "jailbreak", "DAN", "developer mode", "bypass", "override", "sk-", "ssn", "credit card", "api key", "hack", "exploit", "inject", "malicious", "unrestricted", "unfiltered", "no limits", "no rules"];
    const debounceTimer = setTimeout(() => {
      const lowerPrompt = prompt.toLowerCase();
      const matchCount = threatKeywords.filter((kw) => lowerPrompt.includes(kw.toLowerCase())).length;
      if (matchCount === 0) setLiveThreatLevel("none");
      else if (matchCount === 1) setLiveThreatLevel("low");
      else if (matchCount <= 3) setLiveThreatLevel("medium");
      else setLiveThreatLevel("high");
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [prompt, autoScan]);

  const handleExampleClick = useCallback(
    (examplePrompt: string) => {
      setPrompt(examplePrompt);
      setResult(null);
      setError(null);
    },
    []
  );

  const handleClear = useCallback(() => {
    setPrompt("");
    setResult(null);
    setError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleScan();
      }
    },
    [handleScan]
  );

  const fetchRules = useCallback(async () => {
    if (rulesData) return;
    setRulesLoading(true);
    try {
      const response = await fetch("/api/rules");
      if (response.ok) {
        const data = await response.json();
        setRulesData(data.rules);
      }
    } catch {
      // Silently fail
    } finally {
      setRulesLoading(false);
    }
  }, [rulesData]);

  const handleRandomAttack = useCallback(() => {
    const attack = generateRandomAttack();
    setPrompt(attack);
    setResult(null);
    setError(null);
    setLlmResult(null);
  }, []);

  const handleLlmScan = useCallback(async () => {
    if (!prompt.trim()) return;
    setLlmLoading(true);
    setLlmResult(null);
    try {
      const response = await fetch("/api/scan/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.llm) {
          setLlmResult(data.llm);
        }
      }
    } catch {
      // LLM scan failed, ignore
    } finally {
      setLlmLoading(false);
    }
  }, [prompt]);

  const handleCustomScan = useCallback(async () => {
    if (!prompt.trim() || customRules.length === 0) return;
    setCustomScanLoading(true);
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        prompt,
        custom_rules: customRules.map((r) => ({
          id: r.id,
          pattern: r.pattern,
          severity: r.severity,
          category: r.category,
          title: r.title,
          description: r.description,
          remediation: r.remediation,
        })),
        threshold,
        include_normalized: true,
      };
      if (enabledDetectors.length > 0) body.detectors = enabledDetectors;

      const response = await fetch("/api/scan/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Custom scan failed: ${response.statusText}`);

      const data: ScanResult = await response.json();
      setResult(data);
      setScanHistory((prev) => [
        { prompt, result: data, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      setTotalScans((prev) => prev + 1);
      if (!data.is_safe) setThreatsBlocked((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Custom scan failed");
    } finally {
      setLoading(false);
      setCustomScanLoading(false);
    }
  }, [prompt, customRules, threshold, enabledDetectors]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 shrink-0">
                <img src="/prompt-guard-logo.png" alt="Prompt Guard" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight flex items-center gap-1.5">
                  prompt-guard
                  <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0">v0.1.0</Badge>
                </h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block truncate">
                  LLM prompt security linter
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {mounted && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>
              )}
              <KeyboardShortcutsDialog />
              <Dialog onOpenChange={(open) => { if (open) fetchRules(); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rules</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <List className="w-5 h-5" />
                      Detection Rules
                    </DialogTitle>
                    <DialogDescription>
                      Browse {rulesData ? `${rulesData.length}` : ""} detection rules across 6 categories
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center gap-2 mt-1">
                    <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: "all", label: "All" },
                        { value: "prompt-injection", label: "Injection" },
                        { value: "jailbreak", label: "Jailbreak" },
                        { value: "system-prompt-leak", label: "Leakage" },
                        { value: "obfuscation", label: "Obfuscation" },
                        { value: "goal-hijacking", label: "Hijacking" },
                        { value: "pii-exfiltration", label: "PII" },
                      ].map((filter) => (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setRulesFilter(filter.value)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            rulesFilter === filter.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ScrollArea className="max-h-[55vh] mt-2">
                    {rulesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {rulesData
                          ?.filter((r) => rulesFilter === "all" || r.category === rulesFilter)
                          .map((rule, i) => {
                            const config = getSeverityConfig(rule.severity);
                            return (
                              <motion.div
                                key={rule.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.015, duration: 0.2 }}
                                className={`p-3 rounded-lg border ${config.border} ${config.bg}`}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Badge className={`text-[9px] px-1.5 py-0 ${config.badgeBg} text-white`}>{rule.severity}</Badge>
                                  <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">{rule.id}</Badge>
                                  <Badge variant="secondary" className="text-[9px] gap-0.5 px-1.5 py-0">
                                    {getCategoryIcon(rule.category)}
                                    {getCategoryLabel(rule.category)}
                                  </Badge>
                                </div>
                                <h4 className={`font-semibold text-sm ${config.color}`}>{rule.title}</h4>
                                {rule.description && <p className="text-[11px] text-muted-foreground mt-0.5">{rule.description}</p>}
                                <code className="text-[9px] bg-background/60 px-1.5 py-0.5 rounded font-mono break-all mt-1.5 inline-block">{rule.pattern}</code>
                                {rule.remediation && (
                                  <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
                                    <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
                                    {rule.remediation}
                                  </p>
                                )}
                              </motion.div>
                            );
                          })}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">API</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>API Documentation</DialogTitle>
                    <DialogDescription>REST API endpoints for prompt-guard</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Badge className="bg-emerald-500 text-[10px]">POST</Badge>
                          /api/scan
                        </h4>
                        <p className="text-muted-foreground text-xs mt-1">Scan a prompt for security threats.</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-2 overflow-x-auto">{`{
  "prompt": "string",
  "threshold": 30,
  "detectors": ["injection", "jailbreak"],
  "include_normalized": false
}`}</pre>
                        <p className="text-muted-foreground text-[10px] mt-1.5 font-medium">Response:</p>
                        <pre className="bg-muted p-2 rounded text-[10px] mt-1 overflow-x-auto">{`{
  "risk_score": 87,
  "is_safe": false,
  "findings": [{ "rule_id": "INJ-001", ... }],
  "metadata": { "scan_duration_ms": 12 }
}`}</pre>
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Badge className="bg-emerald-500 text-[10px]">POST</Badge>
                          /api/scan/batch
                        </h4>
                        <p className="text-muted-foreground text-xs mt-1">Scan multiple prompts at once (max 100).</p>
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Badge className="bg-violet-500 text-[10px]">POST</Badge>
                          /api/scan/llm
                        </h4>
                        <p className="text-muted-foreground text-xs mt-1">Optional LLM-powered classification alongside regex scan.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Badge className="bg-indigo-500 text-[10px]">POST</Badge>
                          /api/scan/custom
                        </h4>
                        <p className="text-muted-foreground text-xs mt-1">Scan with custom user-defined regex rules alongside built-in rules.</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-2 overflow-x-auto">{`{
  "prompt": "string",
  "custom_rules": [{
    "id": "001", "pattern": "bypass|override",
    "severity": "HIGH", "category": "prompt-injection",
    "title": "Custom Rule"
  }],
  "threshold": 30
}`}</pre>
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Badge className="bg-blue-500 text-[10px]">GET</Badge>
                          /api/rules
                        </h4>
                        <p className="text-muted-foreground text-xs mt-1">List all active detection rules.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Badge className="bg-blue-500 text-[10px]">GET</Badge>
                          /api/health
                        </h4>
                        <p className="text-muted-foreground text-xs mt-1">Health check endpoint.</p>
                      </div>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 space-y-6">
          {/* Hero with animated gradient background */}
          <section className="relative text-center space-y-3 py-4 md:py-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-transparent to-teal-50/60 dark:from-emerald-950/20 dark:via-transparent dark:to-teal-950/10 -z-10 animate-gradient" />
            <div className="absolute inset-0 opacity-30 dark:opacity-10 -z-10" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, rgba(16,185,129,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(20,184,166,0.1) 0%, transparent 50%)",
            }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-3">
                <Sparkles className="w-3 h-3" />
                100% offline — no API keys required
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                Protect your LLM prompts{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">before</span>{" "}
                they reach the model
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mt-2 text-sm md:text-base">
                Detect prompt injection, jailbreaks, system prompt leaks, obfuscation, PII exfiltration, and goal hijacking
                with regex-powered heuristics. No API keys needed.
              </p>
            </motion.div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {[
                { icon: Shield, label: "56 Rules", color: "text-emerald-600 dark:text-emerald-400" },
                { icon: Zap, label: "Instant Scan", color: "text-amber-600 dark:text-amber-400" },
                { icon: Lock, label: "100% Offline", color: "text-blue-600 dark:text-blue-400" },
                { icon: Bot, label: "AI Classifier", color: "text-violet-600 dark:text-violet-400" },
                { icon: FilePlus, label: "Custom Rules", color: "text-indigo-600 dark:text-indigo-400" },
              ].map((badge, i) => {
                const BadgeIcon = badge.icon;
                return (
                  <motion.div
                    key={badge.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.3 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 dark:bg-background/40 border border-border/50 shadow-sm ${badge.color} text-xs font-medium`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    {badge.label}
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Stats Bar */}
          {(totalScans > 0) && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /><AnimatedCounter target={totalScans} /> scans</span>
              <span className="flex items-center gap-1.5"><ShieldX className="w-3 h-3 text-red-500" /><AnimatedCounter target={threatsBlocked} /> blocked</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-emerald-500" /><AnimatedCounter target={totalScans - threatsBlocked} /> passed</span>
            </motion.div>
          )}

          {/* Scan Section */}
          <section className="space-y-4">
            {/* Scan Mode Tabs */}
            <div className="flex items-center gap-2">
              {[
                { mode: "single" as const, label: "Single Scan", icon: Scan },
                { mode: "batch" as const, label: "Batch Scan", icon: LayoutList },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.mode}
                    type="button"
                    onClick={() => setScanMode(tab.mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      scanMode === tab.mode
                        ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Input Panel */}
              <div className="lg:col-span-3 space-y-4">
                {scanMode === "single" ? (
                <>
                <Card className="shadow-sm border-emerald-200/50 dark:border-emerald-900/30 relative overflow-hidden animate-shimmer hover:border-emerald-400/60 dark:hover:border-emerald-700/50 hover:shadow-emerald-100/50 dark:hover:shadow-emerald-950/30 hover:shadow-lg transition-all">
                  <ScanProgressOverlay visible={loading} />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Scan className="w-4 h-4 text-emerald-500" />
                      Prompt Scanner
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enter a prompt to scan for security threats. Press Ctrl+Enter to scan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Textarea
                        placeholder="Enter a prompt to scan for security threats..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[140px] resize-y font-mono text-sm pr-12"
                      />
                      {prompt && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="absolute top-2.5 right-2.5 p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Live Threat Level Indicator */}
                    <AnimatePresence>
                      {liveThreatLevel !== "none" && !result && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="rounded-lg overflow-hidden border"
                        >
                          {/* Thin colored bar */}
                          <div className={`h-1 ${
                            liveThreatLevel === "low" ? "bg-blue-500" :
                            liveThreatLevel === "medium" ? "bg-amber-500" :
                            "bg-red-500"
                          }`} />
                          {/* Text badge */}
                          <div className={`px-3 py-1.5 text-[10px] font-medium flex items-center gap-1.5 ${
                            liveThreatLevel === "low" ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400" :
                            liveThreatLevel === "medium" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" :
                            "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                          }`}>
                            <AlertTriangle className="w-3 h-3" />
                            {liveThreatLevel === "low" && "Low threat detected"}
                            {liveThreatLevel === "medium" && "Medium threat detected"}
                            {liveThreatLevel === "high" && "High threat detected"}
                            <span className="opacity-60 ml-1">— run scan for full analysis</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleScan}
                          disabled={loading || !prompt.trim()}
                          className={`gap-2 bg-emerald-600 hover:bg-emerald-700 text-white ${prompt.trim() && !result && !loading ? "animate-pulse" : ""}`}
                          size="sm"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                          {loading ? "Scanning..." : "Scan Prompt"}
                        </Button>
                        <CodeSnippetDialog prompt={prompt} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={handleRandomAttack}>
                              <Dices className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Random</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Generate random attack prompt</TooltipContent>
                        </Tooltip>
                        {result && (
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleExport("json")}>
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">JSON</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Export JSON report</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleExport("csv")}>
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">CSV</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Export CSV report</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => { navigator.clipboard.writeText(prompt); }}>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Copy</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy prompt text</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="auto-scan"
                            checked={autoScan}
                            onCheckedChange={setAutoScan}
                            className="scale-75"
                          />
                          <Label htmlFor="auto-scan" className="text-[10px] text-muted-foreground cursor-pointer">
                            Auto-scan
                          </Label>
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{prompt.length} chars</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Settings + Detector Toggles */}
                <Card className="shadow-sm">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] text-muted-foreground">Risk Threshold</Label>
                          <span className="text-xs font-mono tabular-nums">{threshold}</span>
                        </div>
                        <Slider
                          value={[threshold]}
                          onValueChange={([v]) => setThreshold(v)}
                          min={5}
                          max={80}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">Prompts scoring ≥{threshold}</p>
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">BLOCKED</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <Layers className="w-3 h-3" />
                          Detector Selection
                        </Label>
                        <button
                          type="button"
                          onClick={() => setEnabledDetectors(enabledDetectors.length === 0 ? DETECTORS.map((d) => d.id) : [])}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {enabledDetectors.length === 0 ? "Select all" : "Clear all"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {DETECTORS.map((det) => {
                          const Icon = det.icon;
                          const isActive = enabledDetectors.length === 0 || enabledDetectors.includes(det.id);
                          return (
                            <button
                              key={det.id}
                              type="button"
                              onClick={() => toggleDetector(det.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer border ${
                                isActive
                                  ? `${det.bg} ${det.color} border-current/20`
                                  : "bg-muted/30 text-muted-foreground border-transparent opacity-50"
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {det.label}
                            </button>
                          );
                        })}
                      </div>
                      {enabledDetectors.length > 0 && enabledDetectors.length < DETECTORS.length && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Only {enabledDetectors.length} of {DETECTORS.length} detectors active
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Example Prompts */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Try Example Prompts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {EXAMPLE_PROMPTS.map((example) => {
                        const Icon = example.icon;
                        return (
                          <button
                            key={example.label}
                            type="button"
                            onClick={() => handleExampleClick(example.prompt)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border ${example.border} ${example.bg} hover:shadow-sm transition-all text-left group cursor-pointer`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${example.color}`} />
                            <span className="text-xs font-medium group-hover:text-foreground text-muted-foreground transition-colors">
                              {example.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Rule Editor */}
                <CustomRuleEditor customRules={customRules} setCustomRules={setCustomRules} />

                {/* Custom Scan Button */}
                {customRules.length > 0 && (
                  <Button
                    onClick={handleCustomScan}
                    disabled={loading || !prompt.trim() || customScanLoading}
                    variant="outline"
                    className="gap-2 border-indigo-200 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 w-full"
                    size="sm"
                  >
                    {customScanLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FilePlus className="w-4 h-4" />
                    )}
                    {customScanLoading ? "Scanning with Custom Rules..." : `Scan with ${customRules.length} Custom Rule${customRules.length !== 1 ? "s" : ""}`}
                  </Button>
                )}
                </>
                ) : (
                  <BatchScanPanel onScanBatch={handleBatchScanned} />
                )}
              </div>

              {/* Results Panel */}
              <div className="lg:col-span-2 space-y-3">
                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 shadow-sm">
                      <CardContent className="p-4 flex items-start gap-3">
                        <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Scan Error</p>
                          <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">{error}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {result ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Risk Score Card */}
                    <Card className={`shadow-sm overflow-hidden ${!result.is_safe ? "border-red-200 dark:border-red-900/50" : "border-emerald-200 dark:border-emerald-900/50"}`}>
                      <div className={`h-1.5 ${!result.is_safe ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-600" : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <RiskGauge score={result.risk_score} animate />
                          <div className="flex-1 min-w-0">
                            {(() => { const grade = getScoreGrade(result.risk_score); return (
                            <div className="flex items-center gap-2 mb-1.5">
                              {result.is_safe ? (
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <ShieldX className="w-5 h-5 text-red-500" />
                              )}
                              <span className={`text-lg font-bold ${result.is_safe ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                {result.is_safe ? "PASSED" : "BLOCKED"}
                              </span>
                              <span className={`ml-2 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black ${grade.color} bg-gradient-to-br ${result.is_safe ? "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20" : "from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-950/20"}`}>
                                {grade.grade}
                              </span>
                            </div>
                            ); })() }
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {result.is_safe
                                ? "This prompt appears safe to send to an LLM."
                                : `Flagged with ${result.findings.length} finding${result.findings.length !== 1 ? "s" : ""}. Review before sending.`}
                            </p>
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((sev) => {
                                const count = result.findings.filter((f) => f.severity === sev).length;
                                if (count === 0) return null;
                                const config = getSeverityConfig(sev);
                                return (
                                  <Badge key={sev} className={`text-[9px] px-1.5 py-0 ${config.badgeBg} text-white`}>
                                    {count} {sev}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <StatsSummary result={result} />

                    <div className="grid grid-cols-2 gap-2">
                      <SeverityChart result={result} />
                      <DonutChart result={result} />
                    </div>
                    <CategoryChart result={result} />

                    <ScanMetadata result={result} />

                    {/* Normalization Preview */}
                    <NormalizationPreview result={result} originalPrompt={prompt} />

                    {/* Threat Highlighter */}
                    <ThreatHighlighter prompt={prompt} findings={result.findings} />

                    {/* Safety Tips */}
                    <SafetyTipsCard result={result} />

                    {/* LLM Classifier */}
                    <Card className="shadow-sm border-violet-200 dark:border-violet-900/30 bg-violet-50/30 dark:bg-violet-950/10">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2">
                            <Bot className="w-3.5 h-3.5 text-violet-500" />
                            AI Classifier
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-[10px] h-6"
                            onClick={handleLlmScan}
                            disabled={llmLoading || !prompt.trim()}
                          >
                            {llmLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                            {llmLoading ? "Analyzing..." : "Run AI Scan"}
                          </Button>
                        </div>
                        <CardDescription className="text-[10px]">
                          Optional LLM-powered analysis for deeper threat assessment
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {llmResult ? (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${llmResult.is_safe ? "bg-emerald-500" : "bg-red-500"}`} />
                              <span className={`text-xs font-semibold ${llmResult.is_safe ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                {llmResult.is_safe ? "SAFE" : "UNSAFE"}
                              </span>
                              <span className={`text-xs font-bold tabular-nums ${getScoreColor(llmResult.risk_score)}`}>
                                Score: {llmResult.risk_score}
                              </span>
                            </div>
                            {llmResult.attack_type && llmResult.attack_type !== "none" && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-violet-300 dark:border-violet-800">
                                <Zap className="w-3 h-3" />
                                {llmResult.attack_type}
                              </Badge>
                            )}
                            {llmResult.explanation && (
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{llmResult.explanation}</p>
                            )}
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[9px] text-muted-foreground">Regex: {result.risk_score}</span>
                              <span className="text-[9px] text-muted-foreground/40">&middot;</span>
                              <span className="text-[9px] text-muted-foreground">AI: {llmResult.risk_score}</span>
                              <span className="text-[9px] text-muted-foreground/40">&middot;</span>
                              <span className="text-[9px] text-muted-foreground">Combined: {Math.max(result.risk_score, llmResult.risk_score)}</span>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-[10px] text-muted-foreground">Click "Run AI Scan" for LLM-powered analysis</p>
                            <p className="text-[9px] text-muted-foreground/60 mt-0.5">Uses AI to catch threats regex may miss</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="shadow-sm h-72 flex items-center justify-center border-dashed border-2 border-muted-foreground/20">
                    <CardContent className="text-center space-y-3">
                      <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-950/10 animate-pulse-ring" />
                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-950/10 flex items-center justify-center">
                          <Shield className="w-8 h-8 text-emerald-400" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No scan results yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Enter a prompt and click Scan to analyze it
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRandomAttack}>
                        <Wand2 className="w-3.5 h-3.5" />
                        Try a random attack
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </section>

          {/* Findings Section */}
          {result && result.findings.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold">Findings</h3>
                <Badge variant="secondary" className="tabular-nums">{result.findings.length}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7 ml-auto"
                  onClick={() => setAllExpanded(!allExpanded)}
                >
                  {allExpanded ? "Collapse All" : "Expand All"}
                  <ChevronDown className={`w-3 h-3 ${allExpanded ? "rotate-180" : ""}`} />
                </Button>
              </div>
              <div className="space-y-2">
                {result.findings.map((finding, index) => (
                  <FindingCard key={`${finding.rule_id}-${index}`} finding={finding} index={index} expanded={allExpanded} />
                ))}
              </div>
            </section>
          )}

          {/* Scan History Panel */}
          {scanHistory.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs h-8"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="w-3.5 h-3.5" />
                  Scan History
                  <Badge variant="secondary" className="tabular-nums text-[9px] px-1.5 py-0">{scanHistory.length}</Badge>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                </Button>
              </div>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            Scan History
                            <Badge variant="secondary" className="tabular-nums text-[9px] px-1.5 py-0">{scanHistory.length}</Badge>
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[10px] h-6 px-2 text-red-500 hover:text-red-600"
                            onClick={() => { setScanHistory([]); setShowHistory(false); }}
                          >
                            <Trash2 className="w-3 h-3" />
                            Clear History
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Search + Filter */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search history..."
                              value={historySearch}
                              onChange={(e) => setHistorySearch(e.target.value)}
                              className="h-7 text-xs pl-7"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {(["all", "safe", "unsafe"] as const).map((filter) => (
                              <button
                                key={filter}
                                type="button"
                                onClick={() => setHistoryFilter(filter)}
                                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer capitalize ${
                                  historyFilter === filter
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                }`}
                              >
                                {filter}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Timeline + History Items */}
                        <ScrollArea className="max-h-64">
                          <div className="space-y-2">
                            {scanHistory
                              .filter((item) => {
                                if (historySearch && !item.prompt.toLowerCase().includes(historySearch.toLowerCase())) return false;
                                if (historyFilter === "safe" && !item.result.is_safe) return false;
                                if (historyFilter === "unsafe" && item.result.is_safe) return false;
                                return true;
                              })
                              .map((item, i) => {
                                const timeDiff = Date.now() - item.timestamp;
                                const relTime = timeDiff < 60000 ? `${Math.floor(timeDiff / 1000)}s ago` :
                                  timeDiff < 3600000 ? `${Math.floor(timeDiff / 60000)}m ago` :
                                  timeDiff < 86400000 ? `${Math.floor(timeDiff / 3600000)}h ago` :
                                  `${Math.floor(timeDiff / 86400000)}d ago`;
                                const barColor = item.result.risk_score >= 60 ? "bg-red-500" :
                                  item.result.risk_score >= 30 ? "bg-yellow-500" : "bg-emerald-500";
                                return (
                                  <motion.div
                                    key={`${item.timestamp}-${i}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03, duration: 0.2 }}
                                    className="p-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group"
                                  >
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.result.is_safe ? "bg-emerald-500" : "bg-red-500"}`} />
                                      <span className="text-xs text-muted-foreground line-clamp-1 font-mono flex-1">
                                        {item.prompt.substring(0, 50)}{item.prompt.length > 50 ? "..." : ""}
                                      </span>
                                      <span className={`text-xs font-bold tabular-nums shrink-0 ${getScoreColor(item.result.risk_score)}`}>
                                        {item.result.risk_score}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground shrink-0">{relTime}</span>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => { setPrompt(item.prompt); setResult(item.result); }}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
                                          >
                                            <RotateCcw className="w-3 h-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Restore this scan</TooltipContent>
                                      </Tooltip>
                                    </div>
                                    {/* Attack Timeline Bar */}
                                    <div className="relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.result.risk_score}%` }}
                                        transition={{ duration: 0.5, delay: i * 0.05 }}
                                        className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                                      />
                                      {/* Threshold dots */}
                                      <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-muted-foreground/30" style={{ left: "30%" }} />
                                      <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-muted-foreground/30" style={{ left: "60%" }} />
                                    </div>
                                  </motion.div>
                                );
                              })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* How it works */}
          <ScrollRevealSection className="py-6 space-y-5">
            <section className="space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 text-xs font-medium mb-2">
                  <Braces className="w-3 h-3" />
                  Detection Pipeline
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">How prompt-guard works</h3>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  A multi-layered detection pipeline that normalizes, analyzes, and scores prompts.
                </p>
              </div>
              <div className="relative">
                {/* Connection line */}
                <div className="hidden md:block absolute top-1/2 left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-blue-300 via-amber-300 to-emerald-300 dark:from-blue-800 dark:via-amber-800 dark:to-emerald-800 -translate-y-1/2 z-0" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                  {[
                    { icon: Scan, title: "Normalize", step: "01", description: "Decodes unicode escapes, base64, ROT13, strips zero-width chars, normalizes homoglyphs and leetspeak.", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", gradient: "from-blue-500/10 to-blue-500/5" },
                    { icon: Search, title: "Detect", step: "02", description: "Runs 43 regex rules across 6 detector categories: injection, jailbreak, leakage, obfuscation, hijacking, and PII.", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", gradient: "from-amber-500/10 to-amber-500/5" },
                    { icon: ShieldCheck, title: "Score & Protect", step: "03", description: "Calculates a 0-100 risk score with severity-weighted confidence. Block unsafe prompts before they reach your LLM.", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", gradient: "from-emerald-500/10 to-emerald-500/5" },
                  ].map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}>
                        <Card className={`shadow-sm h-full hover:shadow-md transition-all bg-gradient-to-b ${feature.gradient} to-card`}>
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center animate-float`} style={{ animationDelay: `${i * 0.5}s` }}>
                                <Icon className={`w-5 h-5 ${feature.color}`} />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground/60">{feature.step}</span>
                            </div>
                            <h4 className="font-semibold">{feature.title}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </section>
          </ScrollRevealSection>

          {/* Detection Categories */}
          <ScrollRevealSection className="space-y-3">
            <section className="space-y-3">
              <h3 className="text-lg font-bold tracking-tight text-center">Detection Categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { icon: Zap, title: "Prompt Injection", description: "Override instructions, delimiter injection, role manipulation", rules: "10 rules", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-900/30" },
                  { icon: ShieldAlert, title: "Jailbreak", description: "DAN, developer mode, fictional framing, grandma attack", rules: "10 rules", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-900/30" },
                  { icon: Lock, title: "System Leak", description: "Prompt extraction, instruction probing, format attacks", rules: "7 rules", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-900/30" },
                  { icon: Eye, title: "Obfuscation", description: "Base64, zero-width, homoglyphs, hex, ROT13, leetspeak", rules: "6 checks", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-900/30" },
                  { icon: Bug, title: "Goal Hijacking", description: "Indirect injection, hidden instructions, URL redirects, data exfiltration", rules: "10 rules", color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/20", border: "border-pink-200 dark:border-pink-900/30" },
                  { icon: Key, title: "PII Exfiltration", description: "SSN, credit cards, emails, phone numbers, API keys, IPs", rules: "7 rules", color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/20", border: "border-teal-200 dark:border-teal-900/30" },
                ].map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <motion.div key={cat.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}>
                      <Card className={`shadow-sm h-full hover:shadow-md hover:scale-[1.01] transition-all ${cat.border}`}>
                        <CardContent className="p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className={`w-7 h-7 rounded-lg ${cat.bg} flex items-center justify-center`}>
                              <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                            </div>
                            <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">{cat.rules}</Badge>
                          </div>
                          <h4 className="font-semibold text-xs">{cat.title}</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{cat.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </ScrollRevealSection>

          {/* Security Education Section */}
          <section className="py-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-medium mb-2">
                <GraduationCap className="w-3 h-3" />
                Security Education
              </div>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">Learn about prompt attacks</h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Understand common attack vectors and how to defend against them.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SECURITY_LESSONS.map((lesson, i) => {
                const Icon = lesson.icon;
                const isExpanded = showLearnMore === lesson.title;
                return (
                  <motion.div
                    key={lesson.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                  >
                    <Card className={`shadow-sm h-full hover:shadow-md transition-all ${lesson.border}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${lesson.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${lesson.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{lesson.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                              {lesson.description}
                            </p>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="space-y-2 pt-2">
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Example Attack
                                  </p>
                                  <code className="text-[10px] bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-2 py-1 rounded block mt-1 font-mono break-all">
                                    {lesson.example}
                                  </code>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Defense
                                  </p>
                                  <p className="text-[10px] text-foreground mt-1 leading-relaxed">{lesson.defense}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <button
                          type="button"
                          onClick={() => setShowLearnMore(isExpanded ? null : lesson.title)}
                          className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {isExpanded ? "Show less" : "Learn more"}
                          <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>prompt-guard v0.1.0</span>
              <span className="text-muted-foreground/40">&middot;</span>
              <span>MIT License</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
              <span>100% offline</span>
              <span className="text-muted-foreground/30">&middot;</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-medium">56 rules</span>
              <span className="text-muted-foreground/30">&middot;</span>
              <span>6 categories</span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
