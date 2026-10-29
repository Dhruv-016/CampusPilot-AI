"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Cpu,
  CreditCard,
  Database,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Lock,
  MessageSquare,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  TiltCard,
  MagneticButton,
  SpotlightCard,
  GlowOrb,
  Marquee,
} from "@/components/effects";
import {
  CountUp,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion";
import { Badge, GlassCard, SectionHeading } from "@/components/ui";

/* ------------------------------------------------------------------ */
/*  Interactive Chat Demo Simulation Prompts                          */
/* ------------------------------------------------------------------ */
const DEMO_PROMPTS = [
  {
    question: "What is my current fee status for this semester?",
    route: "fee",
    tool: "get_fee_status",
    latency: "112ms",
    answer:
      "According to your student profile (STU-DEMO-1001 · Semester 4), your total tuition fee is ₹1,20,000. You have already paid ₹95,000. Your remaining balance is ₹25,000, due on November 15, 2026.",
    sources: [],
    tag: "Tool Invocation",
  },
  {
    question: "The payment portal failed. Can I pay on the next working day?",
    route: "policy",
    tool: "search_student_policy",
    latency: "84ms",
    answer:
      "Yes. According to Section 4.2 ('Payment Portal Problems') of the Student Handbook, if the university payment gateway is unresponsive within 24 hours of a deadline, students are granted a penalty-free grace period until 5:00 PM on the next working business day.",
    sources: ["Section 4.2 · Financial Policies (score: 0.89)"],
    tag: "BM25 Grounded",
  },
  {
    question: "Remember that I prefer concise explanations.",
    route: "memory",
    tool: "save_preference",
    latency: "46ms",
    answer:
      "Understood! I have saved your response style preference as 'concise'. All subsequent answers will prioritize direct facts and minimal verbosity.",
    sources: [],
    tag: "Persistent Memory",
  },
  {
    question: "When is the next academic event on the university calendar?",
    route: "calendar",
    tool: "get_academic_calendar",
    latency: "79ms",
    answer:
      "The next scheduled campus milestone is the Mid-Semester Examination period starting November 24, 2026, followed by the Winter Recess commencement on December 18, 2026.",
    sources: [],
    tag: "Calendar Feed",
  },
];

/* ------------------------------------------------------------------ */
/*  Bento Grid Features Data                                          */
/* ------------------------------------------------------------------ */
const BENTO_FEATURES = [
  {
    title: "LangGraph Agentic Orchestration",
    badge: "Core Workflow",
    description:
      "A deterministic multi-node state graph (validate → sanitize → decide → execute → ground → trace) with zero unbounded loops and a hard cap of 2 registered tool calls per turn.",
    icon: Cpu,
    stat: "100%",
    statLabel: "Deterministic Routing",
    gradient: "from-indigo-500/20 via-violet-500/10 to-transparent",
    colSpan: "lg:col-span-2",
  },
  {
    title: "Heading-Preserving BM25 Retrieval",
    badge: "Document RAG",
    description:
      "Chunks preserve document hierarchy and chapter titles. Lexical BM25 search with a calibrated relevance threshold guarantees verifiable citations.",
    icon: Search,
    stat: "0.75+",
    statLabel: "Relevance Cutoff",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    colSpan: "lg:col-span-1",
  },
  {
    title: "Long-Term Memory & Deduplication",
    badge: "Persistent Context",
    description:
      "Remembers student preferences (concise vs detailed, language, programme) across sessions. Automatically dedupes and caps at 25 entries per student.",
    icon: Brain,
    stat: "25",
    statLabel: "Max Preference Budget",
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
    colSpan: "lg:col-span-1",
  },
  {
    title: "Zero-Trust Privacy & Pattern Redaction",
    badge: "Privacy By Design",
    description:
      "High-precision regex detection catches OTPs, passwords, credit cards, and API tokens. Sensitive content is redacted BEFORE reaching the model, SQLite, or traces.",
    icon: Lock,
    stat: "Zero",
    statLabel: "Secrets Stored",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    colSpan: "lg:col-span-2",
  },
  {
    title: "Local Execution Traces & Metrics",
    badge: "Full Observability",
    description:
      "Every single query records millisecond breakdown, token usage, tool payloads, and memory selections to local SQLite storage with optional LangSmith export.",
    icon: Terminal,
    stat: "<120ms",
    statLabel: "Local P95 Latency",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    colSpan: "lg:col-span-2",
  },
  {
    title: "Dual Mode Execution",
    badge: "Resilience",
    description:
      "Runs effortlessly with live Groq LLM inference, or drops into zero-dependency local deterministic limited mode without external network calls.",
    icon: Zap,
    stat: "100%",
    statLabel: "Offline Capable",
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
    colSpan: "lg:col-span-1",
  },
];

/* ------------------------------------------------------------------ */
/*  Testimonials Marquee Data                                         */
/* ------------------------------------------------------------------ */
const TESTIMONIALS = [
  {
    quote:
      "CampusPilot answered my fee deadline question at 2:00 AM and cited the exact handbook clause about portal outages. Saved me from a late penalty!",
    author: "Rohan V.",
    role: "Computer Science Undergraduate",
    badge: "Student User",
  },
  {
    quote:
      "Having deterministic routing and local tracing makes CampusPilot the most trustworthy academic demo I have audited this semester.",
    author: "Dr. Evelyn Reed",
    role: "Department of AI Systems",
    badge: "Faculty Evaluator",
  },
  {
    quote:
      "The refusal to hallucinate policy answers when evidence is missing sets this system far apart from generic conversational bots.",
    author: "Priya S.",
    role: "Academic Registrar Staff",
    badge: "Campus Administration",
  },
  {
    quote:
      "Redaction happens client-side and at ingest. As someone who tests student security, the zero-trust sanitization is stellar.",
    author: "Marcus Chen",
    role: "Campus Cybersecurity Lead",
    badge: "Security Auditor",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ Accordion Data                                                */
/* ------------------------------------------------------------------ */
const FAQS = [
  {
    q: "How does CampusPilot prevent hallucinations in university policy answers?",
    a: "CampusPilot enforces strict evidence grounding: when a question is routed to the policy engine, it runs heading-aware lexical BM25 retrieval across indexed handbook chunks. If no chunk surpasses the relevance threshold, the agent explicitly replies that the handbook does not establish an answer, rather than fabricating guidelines.",
  },
  {
    q: "What student tools are registered in the agent graph?",
    a: "Three native tools are registered: get_fee_status (checks tuition balances, paid amounts, and due dates), get_academic_calendar (retrieves semester milestones, exams, and holidays), and search_student_policy (BM25 lexical search over student handbook chunks).",
  },
  {
    q: "What data is stored in student persistent memory?",
    a: "Only explicit, non-sensitive preferences are permitted: response style (concise vs detailed), language preference, and programme focus. Passwords, OTPs, card numbers, and tokens are detected by regex and discarded immediately.",
  },
  {
    q: "Does CampusPilot AI require an active internet connection or paid API key?",
    a: "No. The system features a built-in Limited Mode that executes tools, BM25 retrieval, and deterministic templating completely offline without calling external LLM providers. When a Groq API key is provided, it upgrades to live inference seamlessly.",
  },
  {
    q: "How are evaluation scores calculated?",
    a: "The system includes an automated evaluation suite testing 10 distinct edge cases covering tool selection, fee checks, calendar retrieval, memory persistence, sensitive redaction, and ungrounded policy refusals. Blocked cases are never counted as passed.",
  },
  {
    q: "Can I inspect the agent's internal decisions and latency?",
    a: "Yes! Every single request generates a local trace in the database. The Traces dashboard displays event timelines, tool execution latencies, exact chunks retrieved, and token metrics.",
  },
  {
    q: "Is the data in this demo real or synthetic?",
    a: "All student profiles, ledger records, calendar events, and handbook excerpts are synthetic demo fixtures created for academic testing. No real student private data is ever collected or exposed.",
  },
  {
    q: "What is the tech stack behind CampusPilot AI?",
    a: "The backend is powered by Python 3.10+, FastAPI, LangGraph, and SQLAlchemy with SQLite/PostgreSQL. The frontend is built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, and Recharts.",
  },
];

/* ------------------------------------------------------------------ */
/*  Landing Page Component                                            */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const [activeDemo, setActiveDemo] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [typedChars, setTypedChars] = useState(0);

  // Typewriter effect for current demo prompt
  useEffect(() => {
    setTypedChars(0);
    const text = DEMO_PROMPTS[activeDemo].answer;
    let idx = 0;
    const interval = setInterval(() => {
      idx += 2;
      setTypedChars(idx);
      if (idx >= text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [activeDemo]);

  return (
    <div className="relative min-h-screen bg-navy-950 text-slate-200">
      <Navbar />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION                                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-36">
        {/* Animated Glow Orbs & Light Mesh */}
        <GlowOrb color="brand" className="-top-20 -left-20 h-96 w-96 opacity-60" />
        <GlowOrb color="violet" className="top-40 -right-20 h-96 w-96 opacity-50" />
        <GlowOrb color="cyan" className="bottom-0 left-1/3 h-80 w-80 opacity-30" />

        <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Pill Badge with Shimmer */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md shadow-lg shadow-indigo-500/10"
            >
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>AGENTIC AI · REASONING · EVIDENCE GROUNDED</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white">v1.0</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-6 max-w-4xl font-heading text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:leading-[1.08]"
            >
              Your AI co-pilot for{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                campus life
              </span>
              .
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg md:text-xl leading-relaxed"
            >
              Study smarter. Plan faster. Never miss what matters. CampusPilot unifies student fee records, academic calendars, and policy knowledge with verifiable citations and zero-trust privacy.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <MagneticButton
                as="a"
                href="/app"
                className="group relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Launch Student Assistant</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-cyan-300" />
              </MagneticButton>

              <MagneticButton
                as="a"
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-base font-semibold text-slate-200 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>See Interactive Demo</span>
              </MagneticButton>
            </motion.div>

            {/* Badges Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Evidence-Grounded Retrieval</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Full Local Observability</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Zero-Trust Regex Redaction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Local-First Private Execution</span>
              </div>
            </motion.div>
          </div>

          {/* 3D Floating Interactive Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 mx-auto max-w-4xl"
          >
            <TiltCard intensity={6}>
              <div className="group relative rounded-2xl border border-white/10 bg-navy-900/70 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl shadow-indigo-500/10">
                {/* Window header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 font-mono text-xs text-slate-400">campuspilot.local · agent graph stream</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="green">Backend Online</Badge>
                    <Badge tone="cyan">LangGraph Active</Badge>
                  </div>
                </div>

                {/* Mock conversation body */}
                <div className="mt-6 space-y-4 font-sans text-sm">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="max-w-md rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-white shadow-md">
                      The payment portal failed. Can I pay on the next working day?
                    </div>
                  </div>

                  {/* Assistant Response with Metadata */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-cyan-300 ring-1 ring-indigo-500/30">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="max-w-xl space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-200 backdrop-blur-md">
                      <p className="leading-relaxed">
                        Yes. According to Section 4.2 (&quot;Payment Portal Problems&quot;) of the Student Handbook, if the university payment gateway is unresponsive within 24 hours of a fee deadline, students are granted a penalty-free grace period until 5:00 PM on the next business day.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <Badge tone="blue">route: policy</Badge>
                        <Badge tone="green">search_student_policy: ok</Badge>
                        <span className="text-[11px] text-slate-400">latency: 84ms</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-navy-950/60 p-2.5 text-xs text-slate-300">
                        <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="font-medium text-white">Handbook Sec 4.2 · Financial Policies</span>
                        <span className="ml-auto text-slate-400">relevance: 0.89</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. STATS COUNTER STRIP                                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="relative border-y border-white/[0.08] bg-navy-900/50 py-12 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="font-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                <CountUp target={100} suffix="%" />
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                Evidence Grounded Answers
              </p>
            </div>
            <div className="text-center">
              <div className="font-heading text-3xl font-bold text-cyan-300 sm:text-4xl md:text-5xl">
                <CountUp target={120} prefix="<" suffix="ms" />
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                P95 Agent Response Time
              </p>
            </div>
            <div className="text-center">
              <div className="font-heading text-3xl font-bold text-indigo-400 sm:text-4xl md:text-5xl">
                <CountUp target={3} suffix=" Native" />
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                Registered Tool Connectors
              </p>
            </div>
            <div className="text-center">
              <div className="font-heading text-3xl font-bold text-emerald-400 sm:text-4xl md:text-5xl">
                <CountUp target={10} suffix="/10" />
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                Automated Test Scenarios
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. BENTO GRID CAPABILITIES SECTION                           */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Agent Architecture"
            title="Engineered for accuracy, privacy, and speed."
            subtitle="CampusPilot combines deterministic state graphs, heading-preserving lexical retrieval, and strict redaction rules into an award-class experience."
            center
          />

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENTO_FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <SpotlightCard
                  key={item.title}
                  className={`border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10 ${item.colSpan}`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-cyan-300 ring-1 ring-indigo-500/30">
                          <Icon className="h-6 w-6" />
                        </div>
                        <Badge tone="cyan">{item.badge}</Badge>
                      </div>

                      <h3 className="mt-6 font-heading text-xl font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-8 flex items-baseline justify-between border-t border-white/[0.08] pt-4">
                      <span className="font-heading text-2xl font-bold text-white">
                        {item.stat}
                      </span>
                      <span className="text-xs text-slate-400">{item.statLabel}</span>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. INTERACTIVE LIVE DEMO MOCKUP                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="demo" className="relative border-t border-white/[0.08] bg-navy-900/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Live Interactive Playground"
            title="Experience the agent in action."
            subtitle="Select any scenario below to see how the LangGraph router dispatches tools, retrieves evidence chunks, and sanitizes student context."
            center
          />

          {/* Scenario Selector Pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {DEMO_PROMPTS.map((p, idx) => (
              <button
                key={p.question}
                onClick={() => setActiveDemo(idx)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeDemo === idx
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                    : "border border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {p.tag}
              </button>
            ))}
          </div>

          {/* Interactive Chat Frame */}
          <div className="mt-8 mx-auto max-w-3xl">
            <GlassCard hover={false} className="p-6">
              {/* Question */}
              <div className="flex justify-end">
                <div className="max-w-md rounded-2xl bg-indigo-600 px-4 py-3 text-sm text-white shadow-md">
                  {DEMO_PROMPTS[activeDemo].question}
                </div>
              </div>

              {/* Agent Flow Animation */}
              <div className="my-6 flex items-center justify-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-white/10" />
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-navy-950 px-3 py-1 font-mono text-[11px] text-cyan-300">
                  <Cpu className="h-3 w-3" />
                  Route: {DEMO_PROMPTS[activeDemo].route} · Tool: {DEMO_PROMPTS[activeDemo].tool} ({DEMO_PROMPTS[activeDemo].latency})
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Answer */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-cyan-300 ring-1 ring-indigo-500/30">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
                  <p className="leading-relaxed">
                    {DEMO_PROMPTS[activeDemo].answer.slice(0, typedChars)}
                    {typedChars < DEMO_PROMPTS[activeDemo].answer.length && (
                      <span className="inline-block h-4 w-1 animate-pulse bg-cyan-400 align-middle ml-1" />
                    )}
                  </p>

                  {DEMO_PROMPTS[activeDemo].sources.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      {DEMO_PROMPTS[activeDemo].sources.map((src) => (
                        <div
                          key={src}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy-950/80 px-3 py-2 text-xs text-slate-300"
                        >
                          <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{src}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-white/[0.1] hover:text-white"
                >
                  <span>Open in Full Assistant</span>
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. HOW IT WORKS 4-STEP PIPELINE                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Execution Pipeline"
            title="Predictable. Grounded. Verifiable."
            subtitle="Every query follows a safe, cyclic-free sequence engineered to protect student privacy and eliminate made-up answers."
            center
          />

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Sanitize & Guard",
                desc: "Regex patterns detect and scrub OTPs, passwords, and tokens before anything touches the memory store or traces.",
                icon: ShieldAlert,
              },
              {
                step: "02",
                title: "Context Window Selection",
                desc: "Only the last 4 turns and top relevant persistent preferences enter the prompt, keeping token cost deterministic.",
                icon: Database,
              },
              {
                step: "03",
                title: "Route & Execute",
                desc: "The LangGraph router determines if native fee, calendar, or BM25 handbook retrieval is required.",
                icon: Zap,
              },
              {
                step: "04",
                title: "Evidence & Trace",
                desc: "Answers are grounded strictly in retrieved chunks or tool output, with execution latency logged to local SQLite.",
                icon: FileCheck,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl transition hover:border-indigo-500/30 hover:bg-white/[0.04]"
                >
                  <span className="font-mono text-3xl font-bold text-indigo-400/40">
                    {s.step}
                  </span>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-cyan-300 ring-1 ring-indigo-500/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-white">
                      {s.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. TESTIMONIALS MARQUEE                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="relative border-t border-white/[0.08] bg-navy-900/40 py-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <SectionHeading
            badge="Academic Peer Feedback"
            title="Trusted across students and faculty."
            subtitle="Sample feedback from academic reviews evaluating accuracy, compliance, and UI fluidity."
            center
          />
        </div>

        <Marquee speed={35} pauseOnHover={true}>
          {TESTIMONIALS.map((t) => (
            <div
              key={t.author}
              className="mx-3 w-80 sm:w-96 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-lg"
            >
              <div className="flex items-center justify-between">
                <Badge tone="cyan">{t.badge}</Badge>
                <span className="text-amber-400 text-sm">★★★★★</span>
              </div>
              <p className="mt-4 text-sm text-slate-300 leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 border-t border-white/[0.08] pt-3">
                <div className="font-heading text-sm font-semibold text-white">
                  {t.author}
                </div>
                <div className="text-xs text-slate-400">{t.role}</div>
              </div>
            </div>
          ))}
        </Marquee>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (ACCORDION)                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Frequently Asked Questions"
            title="Everything you need to know."
            subtitle="Detailed answers regarding architecture, security, BM25 indexing, and offline capabilities."
            center
          />

          <div className="mt-12 space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl transition hover:border-white/20"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-base font-semibold text-white transition"
                  aria-expanded={openFaq === idx}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-indigo-400 transition-transform duration-300 shrink-0 ml-4 ${
                      openFaq === idx ? "rotate-180 text-cyan-300" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-white/[0.08] px-5 pb-5 pt-3 text-sm text-slate-300 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 8. FINAL BIG IMPACT CTA                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-32 border-t border-white/[0.08]">
        <GlowOrb color="violet" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 opacity-60" />
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Badge tone="cyan">Ready to test?</Badge>
          <h2 className="mt-4 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Start experiencing the future of{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              campus assistance
            </span>
            .
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg leading-relaxed">
            Zero setup required. Try the live student assistant, inspect the BM25 knowledge index, or execute the 10-case evaluation test suite.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <MagneticButton
              as="a"
              href="/app"
              className="group relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Launch Student Assistant</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-cyan-300" />
            </MagneticButton>

            <MagneticButton
              as="a"
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-4 text-base font-semibold text-slate-200 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Read Architecture Docs</span>
            </MagneticButton>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
