import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  PieChart as PieChartIcon,
  Sparkles,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";

const BU_COLORS = {
  "Web & Mobile": "#6366f1",
  Gaming: "#a855f7",
  Data: "#0ea5e9",
  "Video Tech": "#f59e0b",
};

/** Short X-axis label (ASCII) — must stay in sync with ReferenceLine x */
function monthTickLabel(period) {
  const parts = period.trim().split(/\s+/);
  if (parts.length < 2) return period;
  const [mon, year] = parts;
  if (!year || year.length < 2) return period;
  return `${mon.slice(0, 3)} '${year.slice(-2)}`;
}

function parseStat(raw) {
  if (raw == null || raw === "") return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function TrendTooltip({ active, payload, suffix }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const title = row?.fullLabel ?? "";
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-xs shadow-premium-lg backdrop-blur-sm">
      <div className="mb-1.5 font-semibold text-slate-800">{title}</div>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={String(p.name)} className="flex justify-between gap-8">
            <span className="font-medium" style={{ color: p.color }}>
              {p.name}
            </span>
            <span className="font-mono tabular-nums text-slate-900">
              {p.value != null && p.value !== ""
                ? `${Number(p.value).toFixed(2)}${suffix}`
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarTooltip({ active, payload, suffix }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = p?.payload?.bu ?? p?.name;
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs shadow-premium backdrop-blur-sm">
      <div className="font-semibold text-slate-800">{name}</div>
      <div className="font-mono tabular-nums text-slate-900">
        {p?.value != null && p?.value !== ""
          ? `${Number(p.value).toFixed(2)}${suffix}`
          : "—"}
      </div>
    </div>
  );
}

export default function AnalyticsSection({
  months,
  businessUnits,
  metrics,
  statsByMonth,
  activeStats,
  selectedQuarter,
  currentClients,
}) {
  const [metricId, setMetricId] = useState("margin");
  const selectedMetric = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const suffix = selectedMetric?.suffix ?? "";

  const lineData = useMemo(() => {
    return months.map((period) => {
      const row = {
        period,
        fullLabel: period,
        displayLabel: monthTickLabel(period),
      };
      businessUnits.forEach((bu) => {
        const raw = statsByMonth[period]?.[bu]?.[metricId];
        row[bu] = parseStat(raw);
      });
      return row;
    });
  }, [months, businessUnits, statsByMonth, metricId]);

  const barData = useMemo(() => {
    return businessUnits.map((bu) => ({
      bu,
      short:
        bu === "Web & Mobile"
          ? "Web & Mob."
          : bu === "Video Tech"
            ? "Video"
            : bu,
      value: parseStat(activeStats[bu]?.[metricId]),
    }));
  }, [businessUnits, activeStats, metricId]);

  const pieData = useMemo(() => {
    return businessUnits.map((bu) => ({
      name: bu,
      value: currentClients.filter((c) => c.activeBUs.includes(bu)).length,
    }));
  }, [businessUnits, currentClients]);

  const hasAnyLinePoint = useMemo(() => {
    return lineData.some((row) =>
      businessUnits.some((bu) => row[bu] != null),
    );
  }, [lineData, businessUnits]);

  const pieTotal = pieData.reduce((a, p) => a + p.value, 0);

  const selectedMonthDisplayLabel = useMemo(
    () => lineData.find((d) => d.period === selectedQuarter)?.displayLabel,
    [lineData, selectedQuarter],
  );

  const monthsWithTrendData = useMemo(() => {
    return lineData.filter((row) =>
      businessUnits.some((bu) => row[bu] != null),
    ).length;
  }, [lineData, businessUnits]);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-white via-white to-indigo-50/[0.35] p-[1px] shadow-premium-lg shadow-indigo-950/[0.07]">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative rounded-[2rem] bg-white/80 p-6 backdrop-blur-xl md:p-8 lg:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">
              <Sparkles size={14} className="text-indigo-500" />
              Reports &amp; analytics
            </div>
            <h2 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Executive insights
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Visual trends across months, business-unit comparison for{" "}
              <span className="font-semibold text-slate-900">{selectedQuarter}</span>
              , and how clients distribute across BUs.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:max-w-xs lg:shrink-0">
            <label
              htmlFor="analytics-metric"
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"
            >
              Chart metric
            </label>
            <div className="relative">
              <BarChart2
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-indigo-500"
                aria-hidden
              />
              <select
                id="analytics-metric"
                value={metricId}
                onChange={(e) => setMetricId(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
              >
                {metrics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-5 shadow-insetSoft md:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
                    <LayoutDashboard size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedMetric?.label}
                      <span className="font-normal text-slate-500">
                        {" "}
                        — multi-month performance
                      </span>
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Gradient areas show BU averages over time. The marker is
                      your selected month from the header.
                    </p>
                    {hasAnyLinePoint && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        <span className="rounded-md bg-white/90 px-2 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200/90">
                          {monthsWithTrendData} month
                          {monthsWithTrendData === 1 ? "" : "s"} with data
                        </span>
                        <span className="ml-2 text-slate-400">
                          Full timeline shown; gaps when a month has no upload.
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fixed pixel height: ResponsiveContainer % height fails inside flex/min-h parents */}
              {hasAnyLinePoint ? (
                <div className="w-full min-w-0">
                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-200/70 pb-3">
                    {businessUnits.map((bu) => (
                      <div
                        key={bu}
                        className="flex items-center gap-2 text-[11px] font-medium text-slate-600"
                      >
                        <span
                          className="h-2.5 w-4 shrink-0 rounded-sm shadow-sm"
                          style={{
                            background: `linear-gradient(180deg, ${BU_COLORS[bu] ?? "#64748b"}cc, ${BU_COLORS[bu] ?? "#64748b"}33)`,
                          }}
                        />
                        <span className="max-w-[10rem] truncate">{bu}</span>
                      </div>
                    ))}
                  </div>
                  <div className="relative h-[320px] w-full min-h-[280px] sm:h-[380px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" debounce={32}>
                      <AreaChart
                        data={lineData}
                        margin={{ top: 8, right: 6, left: 0, bottom: 4 }}
                      >
                        <defs>
                          {businessUnits.map((bu, i) => {
                            const c = BU_COLORS[bu] ?? "#64748b";
                            return (
                              <linearGradient
                                key={bu}
                                id={`buAreaGrad-${i}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop offset="0%" stopColor={c} stopOpacity={0.42} />
                                <stop offset="55%" stopColor={c} stopOpacity={0.12} />
                                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                              </linearGradient>
                            );
                          })}
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e8eaef"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="displayLabel"
                          tick={{
                            fontSize: 10,
                            fill: "#64748b",
                          }}
                          tickLine={false}
                          axisLine={{ stroke: "#e2e8f0" }}
                          tickMargin={10}
                          interval={0}
                          angle={-32}
                          textAnchor="end"
                          height={54}
                        />
                        <YAxis
                          width={46}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                          tickFormatter={(v) =>
                            Number.isFinite(v) ? String(Math.round(v * 100) / 100) : ""
                          }
                        />
                        <Tooltip
                          content={<TrendTooltip suffix={suffix} />}
                          cursor={{
                            stroke: "#818cf8",
                            strokeWidth: 1,
                            strokeDasharray: "4 4",
                          }}
                        />
                        {businessUnits.map((bu, i) => (
                          <Area
                            key={bu}
                            type="monotone"
                            dataKey={bu}
                            name={bu}
                            stroke={BU_COLORS[bu] ?? "#64748b"}
                            strokeWidth={2}
                            fill={`url(#buAreaGrad-${i})`}
                            fillOpacity={1}
                            activeDot={{
                              r: 5,
                              strokeWidth: 2,
                              stroke: "#fff",
                            }}
                            connectNulls
                            isAnimationActive={false}
                          />
                        ))}
                        {selectedMonthDisplayLabel != null && (
                          <ReferenceLine
                            x={selectedMonthDisplayLabel}
                            stroke="#4338ca"
                            strokeDasharray="6 4"
                            strokeWidth={1.5}
                            label={{
                              value: "Selected month",
                              position: "top",
                              fill: "#4338ca",
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-slate-400">
                    Overlapping regions show how BUs compare; missing months stay
                    on the axis without a point.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 text-center text-sm text-slate-500">
                  Upload or enter data for at least one month to unlock trend
                  charts.
                </div>
              )}
            </div>
          </div>

          <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-5 shadow-insetSoft md:p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm shadow-violet-500/25">
                <PieChartIcon size={18} strokeWidth={2.25} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Client mix</h3>
                <p className="text-xs text-slate-500">
                  {selectedQuarter} · {pieTotal} mapped client
                  {pieTotal === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="min-h-[260px] flex-1">
              {pieTotal > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={
                            BU_COLORS[entry.name] ??
                            ["#6366f1", "#a855f7", "#0ea5e9", "#f59e0b"][
                              index % 4
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} clients`, name]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                        boxShadow:
                          "0 10px 40px -12px rgba(15, 23, 42, 0.15)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value) => (
                        <span className="text-slate-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 text-center text-xs text-slate-500">
                  No clients for this month yet — upload a CSV or add records
                  below.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-5 shadow-insetSoft md:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedMetric?.label}
                <span className="font-normal text-slate-500">
                  {" "}
                  — BU snapshot ({selectedQuarter})
                </span>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Compare average performance across business units for the
                selected month.
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e8eaef"
                  vertical={false}
                />
                <XAxis
                  dataKey="short"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={<BarTooltip suffix={suffix} />}
                  cursor={{ fill: "rgba(241, 245, 249, 0.9)" }}
                />
                <Bar
                  dataKey="value"
                  radius={[10, 10, 0, 0]}
                  name={selectedMetric?.label}
                >
                  {barData.map((entry) => (
                    <Cell key={entry.bu} fill={BU_COLORS[entry.bu] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
