"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, ChevronDown, FlaskConical, Play, RefreshCw, XCircle } from "lucide-react";
import { api, EvalSummary } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { Badge, Btn, Card, Empty, ErrorBox, fmtDate, PageTitle, Spinner } from "@/components/ui";

const Stat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <Card className="p-4 space-y-1">
    <div className="text-xs text-slate-400">{label}</div>
    <div className="font-heading text-2xl font-bold text-white">{value}</div>
    {sub && <div className="text-[11px] text-cyan-300">{sub}</div>}
  </Card>
);

export default function Evaluation() {
  const { data, error, loading, reload } = useApi<EvalSummary>("/evaluation/results");
  const [mode, setMode] = useState<"local" | "live">("local");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/evaluation/run", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const s = data?.summary;
  const tone = (x: string) =>
    (x === "passed" ? "green" : x === "failed" ? "red" : "amber") as "green" | "red" | "amber";

  const rows = (data?.results || []).filter((r) => !filter || r.status === filter);
  const latency = (data?.results || [])
    .filter((r) => r.latency_ms !== null)
    .map((r) => ({ case: r.case_id, ms: r.latency_ms }));
  const tokens = (data?.results || [])
    .filter((r) => r.total_tokens !== null)
    .map((r) => ({ case: r.case_id, tokens: r.total_tokens }));

  const runBtn = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Evaluation mode"
        value={mode}
        onChange={(e) => setMode(e.target.value as "local" | "live")}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
      >
        <option value="local" className="bg-navy-900">Local deterministic (no LLM)</option>
        <option value="live" className="bg-navy-900">Live provider inference</option>
      </select>
      <Btn onClick={run} disabled={busy}>
        <Play className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
        <span>{busy ? "Running Suite…" : "Run Evaluation"}</span>
      </Btn>
      <Btn variant="ghost" onClick={reload} aria-label="Refresh results">
        <RefreshCw className="h-4 w-4" />
      </Btn>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageTitle
        title="Model Evaluation & Benchmarking"
        sub="Observed behavior scored across 10 deterministic scenarios. Blocked cases are never counted as passed."
        action={runBtn}
      />

      {(err || error) && <ErrorBox message={(err || error)!} />}
      {loading && <Spinner />}

      {!loading && !s && (
        <Empty
          title="No evaluation runs recorded"
          text="Run the 10 scenarios from data/evaluation_cases.json against the agent. Results are persisted to SQLite."
          action={
            <Btn onClick={run} disabled={busy}>
              <Play className="h-4 w-4 mr-2" />
              <span>Run Evaluation Benchmark</span>
            </Btn>
          }
        />
      )}

      {s && data?.run && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Run #{data.run.id} · mode: <b className="text-white">{data.run.mode}</b>
            </span>
            <span>Triggered {fmtDate(data.run.started_at)}</span>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total Executed" value={s.executed} sub={s.blocked ? `${s.blocked} blocked` : undefined} />
            <Stat label="Passed / Failed" value={`${s.passed} / ${s.failed}`} />
            <Stat
              label="Success Rate"
              value={s.success_rate === null ? "—" : `${s.success_rate}%`}
            />
            <Stat
              label="Tool Accuracy"
              value={s.tool_selection_accuracy === null ? "—" : `${s.tool_selection_accuracy}%`}
            />
            <Stat
              label="Average Latency"
              value={s.avg_latency_ms === null ? "—" : `${s.avg_latency_ms} ms`}
            />
            <Stat
              label="Median Latency"
              value={s.median_latency_ms === null ? "—" : `${s.median_latency_ms} ms`}
            />
            <Stat
              label="Provider Tokens"
              value={s.token_total ?? "unavailable"}
              sub={s.token_cases ? `${s.token_cases} live case(s)` : "Local mode makes zero LLM calls"}
            />
            <Stat label="Last Run Date" value={new Date(data.run.started_at).toLocaleDateString()} />
          </div>

          {/* Recharts Analytics Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Pie Chart */}
            <Card className="p-5">
              <h3 className="font-heading text-sm font-semibold text-white mb-3">
                Pass / Fail Distribution
              </h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { n: "passed", v: s.passed },
                        { n: "failed", v: s.failed },
                        { n: "blocked", v: s.blocked },
                      ].filter((d) => d.v > 0)}
                      dataKey="v"
                      nameKey="n"
                      innerRadius={45}
                      outerRadius={75}
                    >
                      {["passed", "failed", "blocked"].map((k, i) => (
                        <Cell
                          key={k}
                          fill={["#10b981", "#ef4444", "#f59e0b"][i]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a1a",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Latency Bar Chart */}
            <Card className="p-5">
              <h3 className="font-heading text-sm font-semibold text-white mb-3">
                Latency per Case (ms)
              </h3>
              <div className="h-56">
                {latency.length ? (
                  <ResponsiveContainer>
                    <BarChart data={latency}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="case" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a1a",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="ms" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 py-20 text-center">No latency data available.</p>
                )}
              </div>
            </Card>

            {/* Results by Category */}
            <Card className="p-5">
              <h3 className="font-heading text-sm font-semibold text-white mb-3">
                Results by Test Category
              </h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={s.by_category}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="category" fontSize={10} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a1a",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="passed" stackId="a" fill="#10b981" />
                    <Bar dataKey="failed" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Tool Usage Distribution */}
            <Card className="p-5">
              <h3 className="font-heading text-sm font-semibold text-white mb-3">
                Registered Tool Invocations
              </h3>
              <div className="h-56">
                {s.tool_usage.length ? (
                  <ResponsiveContainer>
                    <BarChart data={s.tool_usage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="tool" fontSize={10} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a1a",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 py-20 text-center">No tool calls recorded.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Cases Filter & Table */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-white">
                Case Scenarios ({rows.length})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter status:</span>
                <select
                  aria-label="Filter status"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none"
                >
                  <option value="" className="bg-navy-900">All results</option>
                  <option value="passed" className="bg-navy-900">Passed</option>
                  <option value="failed" className="bg-navy-900">Failed</option>
                  <option value="blocked" className="bg-navy-900">Blocked</option>
                </select>
              </div>
            </div>

            <Card className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-400">
                    <th className="py-3 px-4">Case</th>
                    <th className="py-3 px-4">Scenario</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Expected Route</th>
                    <th className="py-3 px-4">Actual Route</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {rows.map((r) => (
                    <Fragment key={r.case_id}>
                      <tr
                        tabIndex={0}
                        onClick={() => setOpen(open === r.case_id ? null : r.case_id)}
                        onKeyDown={(e) => e.key === "Enter" && setOpen(open === r.case_id ? null : r.case_id)}
                        className="cursor-pointer hover:bg-white/[0.04] transition group"
                      >
                        <td className="py-3 px-4 font-mono text-xs text-cyan-300 font-semibold">
                          {r.case_id}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">{r.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-400">{r.category}</td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-300">
                          {r.expected_route}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-300">
                          {r.actual_route ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone={tone(r.status)}>{r.status}</Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-300">
                          {r.latency_ms ?? "—"} ms
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {r.trace_id ? (
                            <Link
                              className="font-mono text-cyan-400 hover:underline"
                              href={`/app/traces?id=${r.trace_id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.trace_id}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                      {open === r.case_id && (
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <td colSpan={8} className="p-4 text-xs text-slate-300 space-y-1">
                            <div>
                              <b className="text-white">Audit Notes:</b> {r.note}
                            </div>
                            <div>
                              <b className="text-white">Evidence Chunks:</b>{" "}
                              {r.evidence_ids?.join(", ") || "none"}
                            </div>
                            <div>
                              <b className="text-white">Tool Expectations:</b> Expected &ldquo;
                              {r.expected_tool ?? "none"}&rdquo; · Actual &ldquo;
                              {r.actual_tools?.join(", ") || "none"}&rdquo;
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
