import React, { useState, useMemo, useEffect } from "react";
import {
  Clock,
  DollarSign,
  Smile,
  ShieldAlert,
  Cpu,
  Plus,
  LayoutDashboard,
  Users,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  BarChart3,
  Trash2,
  Edit3,
  X,
  Check,
  Info,
  Lock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  UploadCloud,
  Calendar,
  AlertTriangle,
  LogOut,
  Download,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  collection,
  deleteDoc,
  query,
} from "firebase/firestore";

import AnalyticsSection from "./components/AnalyticsSection.jsx";

// Configuration constants
const BUSINESS_UNITS = ["Web & Mobile", "Gaming", "Data", "Video Tech"];
const MONTHS = [
  "Feb 2026",
  "Mar 2026",
  "Apr 2026",
  "May 2026",
  "Jun 2026",
  "Jul 2026",
  "Aug 2026",
  "Sep 2026",
  "Oct 2026",
  "Nov 2026",
  "Dec 2026",
];
const SHARED_PASSWORDS = (() => {
  const raw = import.meta.env.VITE_SHARED_PASSWORD ?? "CDO_GATEKEEPER_2025";
  if (typeof raw !== "string") return ["CDO_GATEKEEPER_2025"];
  const list = raw.split(",").map((p) => p.trim()).filter(Boolean);
  return list.length > 0 ? list : ["CDO_GATEKEEPER_2025"];
})();

const KRA_METRICS = [
  {
    id: "margin",
    label: "Contribution Margin",
    icon: DollarSign,
    suffix: "%",
    min: 0,
    max: 100,
    step: "1",
  },
  {
    id: "otd",
    label: "On-Time Delivery",
    icon: Clock,
    suffix: "%",
    min: 0,
    max: 100,
    step: "5",
  },
  {
    id: "obd",
    label: "On-Budget Delivery",
    icon: DollarSign,
    suffix: "%",
    min: 0,
    max: 100,
    step: "5",
  },
  {
    id: "csat",
    label: "CSAT Score",
    icon: Smile,
    suffix: "/5",
    min: 1,
    max: 5,
    step: "0.1",
  },
  {
    id: "techDebt",
    label: "Tech Debt Index",
    icon: ShieldAlert,
    suffix: "%",
    min: 0,
    max: 100,
    inverse: true,
    step: "5",
  },
  {
    id: "aiFirst",
    label: "AI First Dev %",
    icon: Cpu,
    suffix: "%",
    min: 0,
    max: 100,
    step: "5",
  },
];

const GOVERNANCE_RULES = {
  dos: [
    "Use the official CSV template for all uploads.",
    "Input hard data verified by Jira or SonarQube.",
    "Report Tech Debt honestly—transparency is the only way to get budget for refactoring.",
    "Ensure Business Unit names match exactly ('Web & Mobile', etc.).",
  ],
  donts: [
    "Don't use the legacy 1-10 CSAT scale; 1-5 is the mandatory standard.",
    "Don't round numbers manually; the system enforces multiples of 5 for delivery metrics.",
    "Don't hide failing projects; the Board View will flag anomalies regardless.",
    "Don't share the gatekeeper password with unauthorized personnel.",
  ],
};

// Firebase Setup
// Read config from Vite env instead of relying on globals like __firebase_config
const rawFirebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG;

let firebaseConfig = null;
try {
  firebaseConfig = rawFirebaseConfig ? JSON.parse(rawFirebaseConfig) : null;
} catch (e) {
  console.error("Invalid VITE_FIREBASE_CONFIG JSON:", e);
}

let app = null;
let auth = null;
let db = null;

if (firebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = import.meta.env.VITE_APP_ID || "delivery-cmd-default";

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [allClients, setAllClients] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState("Feb 2026");
  const [isUploading, setIsUploading] = useState(false);
  const [yearlyUploadsList, setYearlyUploadsList] = useState([]);

  // Toggle state for BU categories
  const [expandedBUs, setExpandedBUs] = useState(
    BUSINESS_UNITS.reduce((acc, bu) => ({ ...acc, [bu]: true }), {}),
  );

  // Auth Effect
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      // eslint-disable-next-line no-undef
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        // eslint-disable-next-line no-undef
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    void initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Firestore Sync Effect
  useEffect(() => {
    if (!db || !user || !isAuthorized) return;
    const colRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "clients",
    );
    const unsubscribe = onSnapshot(
      query(colRef),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        setAllClients(data);
      },
      (err) => console.error("Firestore Error:", err),
    );
    return () => unsubscribe();
  }, [user, isAuthorized]);

  // Yearly uploads sync (to know which months already have data)
  useEffect(() => {
    if (!db || !user || !isAuthorized) return;
    const currentYear = new Date().getFullYear();
    const yearlyRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "yearlyUploads",
      String(currentYear),
    );
    const unsubscribe = onSnapshot(
      yearlyRef,
      (snapshot) => {
        const list = snapshot.exists() ? snapshot.data().periods || [] : [];
        setYearlyUploadsList(list);
      },
      (err) => console.error("Yearly uploads sync error:", err),
    );
    return () => unsubscribe();
  }, [user, isAuthorized]);

  // Derived State
  const currentClients = useMemo(
    () => allClients.filter((c) => c.quarter === selectedQuarter),
    [allClients, selectedQuarter],
  );

  const prevQuarter = useMemo(() => {
    const idx = MONTHS.indexOf(selectedQuarter);
    return idx > 0 ? MONTHS[idx - 1] : null;
  }, [selectedQuarter]);

  const selectedMonthHasData = useMemo(
    () =>
      yearlyUploadsList.some(
        (entry) => (entry.month || entry.period) === selectedQuarter,
      ),
    [yearlyUploadsList, selectedQuarter],
  );

  const calculateStats = (clientList) => {
    const stats = {};
    BUSINESS_UNITS.forEach((bu) => {
      stats[bu] = {};
      KRA_METRICS.forEach((kra) => {
        const values = clientList
          .filter((c) => c.activeBUs.includes(bu))
          .map((c) => c.buData[bu]?.[kra.id])
          .filter((v) => v !== undefined);
        stats[bu][kra.id] = values.length
          ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
          : null;
      });
    });
    return stats;
  };

  const activeStats = useMemo(
    () => calculateStats(currentClients),
    [currentClients],
  );

  const historicalStats = useMemo(() => {
    if (!prevQuarter) return null;
    return calculateStats(allClients.filter((c) => c.quarter === prevQuarter));
  }, [allClients, prevQuarter]);

  const statsByMonth = useMemo(() => {
    const out = {};
    MONTHS.forEach((m) => {
      out[m] = calculateStats(allClients.filter((c) => c.quarter === m));
    });
    return out;
  }, [allClients]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (SHARED_PASSWORDS.includes(passwordInput)) {
      setIsAuthorized(true);
      setLoginError("");
    } else {
      setLoginError("Invalid authorization code.");
    }
  };

  const toggleBU = (bu) => {
    setExpandedBUs((prev) => ({ ...prev, [bu]: !prev[bu] }));
  };

  const saveClient = async (clientData) => {
    if (!user || !db) return;
    const compositeId = `${clientData.quarter}_${clientData.name.replace(/\s+/g, "_")}`;
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "clients", compositeId),
      {
        ...clientData,
        id: compositeId,
      },
    );
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text =
          typeof event.target?.result === "string" ? event.target.result : "";
        const rows = text
          .split("\n")
          .map((r) => r.split(",").map((c) => c.trim()))
          .filter((r) => r.length >= 6);

        const quarterMap = new Map();
        for (let i = 1; i < rows.length; i += 1) {
          const [name, bu, margin, otd, obd, csat, techDebtRaw, aiFirstRaw] =
            rows[i];
          if (!name || !BUSINESS_UNITS.includes(bu)) continue;
          if (!quarterMap.has(name)) {
            quarterMap.set(name, {
              name,
              quarter: selectedQuarter,
              activeBUs: [],
              buData: {},
            });
          }
          const client = quarterMap.get(name);
          if (!client.activeBUs.includes(bu)) client.activeBUs.push(bu);
          const techDebt =
            rows[i].length >= 7 ? Number.parseFloat(techDebtRaw) || 0 : 0;
          const aiFirst =
            rows[i].length >= 8 ? Number.parseFloat(aiFirstRaw) || 0 : 0;
          client.buData[bu] = {
            margin: Number.parseFloat(margin) || 0,
            otd: Math.round((Number.parseFloat(otd) || 0) / 5) * 5,
            obd: Math.round((Number.parseFloat(obd) || 0) / 5) * 5,
            csat: Number.parseFloat(csat) || 0,
            techDebt: Math.round(techDebt / 5) * 5,
            aiFirst: Math.round(aiFirst / 5) * 5,
          };
        }

        const clients = Array.from(quarterMap.values());
        const results = await Promise.allSettled(
          clients.map((client) =>
            saveClient(client).catch((err) => {
              console.error("saveClient failed for", client.name, err);
              throw err;
            }),
          ),
        );

        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          console.error("Some rows failed to sync:", failed);
          alert(
            `Some rows failed to sync (${failed.length}). Check console for details.`,
          );
        }

        // Build array of row objects for yearly JSON (one per client-BU row, matching CSV structure)
        const periodData = [];
        clients.forEach((client) => {
          client.activeBUs.forEach((bu) => {
            const d = client.buData[bu];
            if (!d) return;
            periodData.push({
              clientName: client.name,
              businessUnit: bu,
              contributionMargin: d.margin,
              onTimeDelivery: d.otd,
              onBudgetDelivery: d.obd,
              csat: d.csat,
              techDebtIndex: d.techDebt,
              aiFirstDevPercent: d.aiFirst,
            });
          });
        });

        // Persist to Firestore yearly uploads (create once, then update by month)
        if (db && periodData.length > 0) {
          const currentYear = new Date().getFullYear();
          const yearlyRef = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "yearlyUploads",
            String(currentYear),
          );
          const yearlySnap = await getDoc(yearlyRef);
          let periods = yearlySnap.exists()
            ? yearlySnap.data().periods || []
            : [];
          const monthKey = (p) => p.month || p.period;
          const periodIndex = periods.findIndex(
            (p) => monthKey(p) === selectedQuarter,
          );
          const monthEntry = { month: selectedQuarter, data: periodData };
          if (periodIndex >= 0) {
            periods = [
              ...periods.slice(0, periodIndex),
              monthEntry,
              ...periods.slice(periodIndex + 1),
            ];
          } else {
            periods = [...periods, monthEntry].sort((a, b) => {
              const idxA = MONTHS.indexOf(monthKey(a));
              const idxB = MONTHS.indexOf(monthKey(b));
              return idxA - idxB;
            });
          }
          await setDoc(
            yearlyRef,
            { year: currentYear, periods },
            { merge: true },
          );
        }
      } catch (err) {
        console.error("CSV upload failed:", err);
        alert("Upload failed while syncing data. Check console for details.");
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  const deleteClient = async (id) => {
    if (!db) return;
    await deleteDoc(
      doc(db, "artifacts", appId, "public", "data", "clients", id),
    );
  };

  const escapeCsvValue = (val) => {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleDownloadYearlyCsv = async () => {
    if (!db) return;
    const currentYear = new Date().getFullYear();
    const yearlyRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "yearlyUploads",
      String(currentYear),
    );
    let snap;
    try {
      snap = await getDoc(yearlyRef);
    } catch (err) {
      const isOffline =
        err?.message?.includes("offline") || err?.code === "unavailable";
      if (isOffline) {
        try {
          snap = await getDocFromCache(yearlyRef);
        } catch (cacheErr) {
          alert(
            "You're offline and yearly data hasn't been loaded yet. Connect to the internet and try again.",
          );
          return;
        }
      } else {
        console.error("Download yearly CSV failed:", err);
        alert("Download failed. Check your connection and try again.");
        return;
      }
    }
    const raw = snap.exists() ? snap.data().periods || [] : [];
    const payload = raw.map((entry) => ({
      month: entry.month || entry.period,
      data: entry.data || [],
    }));
    const headers = [
      "month",
      "clientName",
      "businessUnit",
      "contributionMargin",
      "onTimeDelivery",
      "onBudgetDelivery",
      "csat",
      "techDebtIndex",
      "aiFirstDevPercent",
    ];
    const rows = [headers.join(",")];
    payload.forEach((entry) => {
      const month = entry.month;
      (entry.data || []).forEach((row) => {
        rows.push(
          headers
            .map((h) => escapeCsvValue(h === "month" ? month : row[h]))
            .join(","),
        );
      });
    });
    const csv = rows.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-data-${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateMetric = (clientId, bu, metricId, value) => {
    const client = allClients.find((c) => c.id === clientId);
    if (!client) return;
    void saveClient({
      ...client,
      buData: {
        ...client.buData,
        [bu]: {
          ...client.buData[bu],
          [metricId]: Number.parseFloat(value) || 0,
        },
      },
    });
  };

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f8] bg-mesh-light p-6">
        <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white/90 p-10 text-center shadow-premium-lg backdrop-blur-xl">
          <div className="mb-6 flex justify-center">
            <img
              src="https://www.sportzinteractive.net/static-assets/images/si-logo.svg?v=2.2"
              alt="SI Logo"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md bg-brand-cta text-white shadow-brand-red">
            <Lock size={30} strokeWidth={2.25} />
          </div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">
            Strategic Delivery Command
          </p>
          <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-slate-900">
            Executive gateway
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Authorization code"
              className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-center font-mono text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            {loginError && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-red">
                <AlertTriangle size={14} />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-brand-red py-3.5 text-sm font-semibold text-white shadow-brand-red transition hover:bg-brand-red-dark"
            >
              Authorize access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef0f4] bg-mesh-light text-slate-900 font-sans">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="mx-auto max-w-[1580px] space-y-10 px-4 pb-24 pt-6 md:px-8 md:pt-10">
        {/* Header */}
        <header className="flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/75 p-5 shadow-premium backdrop-blur-xl md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <img
              src="https://www.sportzinteractive.net/static-assets/images/si-logo.svg?v=2.2"
              alt="SI Logo"
              className="h-11 w-auto shrink-0 object-contain md:h-12"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">
                Strategic Delivery Command
              </p>
              <h1 className="mt-1 text-balance text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                Executive pitch report
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
                Live KPIs by business unit, portfolio drilldown, and export-ready
                monthly data.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 md:justify-end md:gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-sm">
              <Calendar size={17} className="shrink-0 text-brand-blue" />
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="max-w-[200px] cursor-pointer bg-transparent text-sm font-semibold text-slate-800 outline-none"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {!selectedMonthHasData && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-brand-red transition hover:bg-brand-red-dark">
                <UploadCloud size={18} />
                {isUploading ? "Syncing..." : "Upload month CSV"}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
              </label>
            )}
            <button
              type="button"
              onClick={handleDownloadYearlyCsv}
              className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-blue-dark"
            >
              <Download size={18} />
              Yearly CSV
            </button>
            <button
              type="button"
              onClick={() => setIsAuthorized(false)}
              className="rounded-md border border-slate-300 bg-slate-100 p-2.5 text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <AnalyticsSection
          months={MONTHS}
          businessUnits={BUSINESS_UNITS}
          metrics={KRA_METRICS.map(({ id, label, suffix }) => ({
            id,
            label,
            suffix,
          }))}
          statsByMonth={statsByMonth}
          activeStats={activeStats}
          selectedQuarter={selectedQuarter}
          currentClients={currentClients}
        />

        <div className="relative py-2 md:py-4">
          <div
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-300/90 to-transparent"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-2 text-center">
            <span className="rounded-full border border-slate-200/90 bg-[#eef0f4]/95 px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 shadow-sm backdrop-blur-sm">
              KPI tables &amp; portfolio
            </span>
            <p className="max-w-lg text-sm text-slate-500">
              Month-over-month averages and editable client rows by business unit
            </p>
          </div>
        </div>

        {/* Summary Table */}
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white shadow-premium-lg shadow-slate-900/30">
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-6 py-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15 ring-1 ring-brand-blue/35">
                <TrendingUp className="text-brand-blue-light" size={20} />
              </div>
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Monthly KPI matrix
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {selectedQuarter}
                  <span className="ml-2 font-normal text-slate-400">
                    · BU averages vs prior month
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-8 py-4">Business Unit</th>
                {KRA_METRICS.map((m) => (
                  <th key={m.id} className="px-4 py-4 text-center">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {BUSINESS_UNITS.map((bu) => (
                <tr
                  key={bu}
                  className="transition-colors hover:bg-white/[0.04]"
                >
                  <td className="px-8 py-5 text-sm font-semibold text-slate-100">
                    {bu}
                  </td>
                  {KRA_METRICS.map((kra) => {
                    const currentVal = activeStats[bu][kra.id];
                    const prevVal = historicalStats
                      ? historicalStats[bu][kra.id]
                      : null;
                    const delta =
                      currentVal && prevVal
                        ? (
                            Number.parseFloat(currentVal) -
                            Number.parseFloat(prevVal)
                          ).toFixed(1)
                        : null;
                    return (
                      <td key={kra.id} className="px-4 py-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-lg font-bold">
                            {currentVal || "—"}
                            <span className="text-[10px] opacity-30 ml-0.5">
                              {kra.suffix}
                            </span>
                          </span>
                          {delta && delta !== "0.0" && (
                            <span
                              className={`text-[9px] font-black flex items-center gap-0.5 ${
                                Number.parseFloat(delta) > 0
                                  ? kra.inverse
                                    ? "text-brand-red"
                                    : "text-brand-blue"
                                  : kra.inverse
                                    ? "text-brand-blue"
                                    : "text-brand-red"
                              }`}
                            >
                              {Number.parseFloat(delta) > 0 ? (
                                <ArrowUp size={10} />
                              ) : (
                                <ArrowDown size={10} />
                              )}{" "}
                              {Math.abs(Number(delta))}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* Portfolio Categorised by BU */}
        <section className="space-y-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue text-white shadow-brand">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Portfolio drilldown
                </h2>
                <p className="text-lg font-bold text-slate-900">
                  By business unit
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Edit metrics inline; changes sync to Firestore.
            </p>
          </div>

        {BUSINESS_UNITS.map((bu) => {
          const buClients = currentClients.filter((c) =>
            c.activeBUs.includes(bu),
          );
          const isExpanded = expandedBUs[bu];

          return (
            <div
              key={bu}
              className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-premium transition-all hover:border-brand-blue/35 hover:shadow-premium-lg"
            >
              {/* BU Category Header */}
              <button
                type="button"
                onClick={() => toggleBU(bu)}
                className={`flex w-full items-center justify-between p-5 transition-colors ${
                  isExpanded
                    ? "border-b border-slate-100 bg-slate-50/80"
                    : "hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-2.5 ${
                      isExpanded
                        ? "bg-brand-blue text-white shadow-brand"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <BarChart3 size={18} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-800">
                      {bu}
                    </span>
                    <p className="text-[11px] font-medium text-slate-500">
                      {buClients.length} active client{buClients.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown size={20} className="text-slate-400" />
                ) : (
                  <ChevronRight size={20} className="text-slate-400" />
                )}
              </button>

              {/* Clients Table (Conditional Render) */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-8 py-4 w-64">Client Name</th>
                        {KRA_METRICS.map((m) => (
                          <th key={m.id} className="px-4 py-4 text-center">
                            {m.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {buClients.map((client) => (
                        <tr
                          key={`${client.id}-${bu}`}
                          className="transition-colors hover:bg-brand-blue/[0.06] group"
                        >
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">
                                {client.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => deleteClient(client.id)}
                                className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase text-brand-red opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <Trash2 size={10} /> Delete Record
                              </button>
                            </div>
                          </td>
                          {KRA_METRICS.map((kra) => (
                            <td key={kra.id} className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <input
                                  type="number"
                                  step={kra.step}
                                  value={client.buData[bu][kra.id]}
                                  onChange={(e) =>
                                    updateMetric(
                                      client.id,
                                      bu,
                                      kra.id,
                                      e.target.value,
                                    )
                                  }
                                  className="w-16 rounded-lg border border-slate-200 bg-white p-1.5 text-center text-sm font-semibold outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                                />
                                <div className="text-[8px] font-black text-slate-300 uppercase mt-0.5">
                                  {kra.suffix}
                                </div>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                      {buClients.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-8 py-10 text-center text-slate-400 text-xs italic font-medium"
                          >
                            No clients currently mapped to {bu} for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </section>

        {/* Governance Protocol */}
        <footer className="grid grid-cols-1 gap-8 rounded-3xl border border-slate-200/80 bg-white/70 p-8 shadow-premium backdrop-blur-md md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-blue">
              <CheckCircle2 size={16} strokeWidth={2.25} /> Governance — do
            </h3>
            <ul className="space-y-3">
              {GOVERNANCE_RULES.dos.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              <AlertTriangle size={16} strokeWidth={2.25} /> Governance — don&apos;t
            </h3>
            <ul className="space-y-3">
              {GOVERNANCE_RULES.donts.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-red" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
