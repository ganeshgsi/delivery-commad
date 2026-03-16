import React, { useState, useMemo, useEffect } from 'react';
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
  LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc, query } from 'firebase/firestore';

// Configuration constants
const BUSINESS_UNITS = ["Web & Mobile", "Gaming", "Data", "Video Tech"];
const QUARTERS = ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024", "Q1 2025"];
const SHARED_PASSWORD = "CDO_GATEKEEPER_2025"; 

const KRA_METRICS = [
  { id: 'margin', label: 'Contribution Margin', icon: DollarSign, suffix: '%', min: 0, max: 100, step: "1" },
  { id: 'otd', label: 'On-Time Delivery', icon: Clock, suffix: '%', min: 0, max: 100, step: "5" },
  { id: 'obd', label: 'On-Budget Delivery', icon: DollarSign, suffix: '%', min: 0, max: 100, step: "5" },
  { id: 'csat', label: 'CSAT Score', icon: Smile, suffix: '/5', min: 1, max: 5, step: "0.1" },
  { id: 'techDebt', label: 'Tech Debt Index', icon: ShieldAlert, suffix: '%', min: 0, max: 100, inverse: true, step: "5" },
  { id: 'aiFirst', label: 'AI First Dev %', icon: Cpu, suffix: '%', min: 0, max: 100, step: "5" },
];

const GOVERNANCE_RULES = {
  dos: [
    "Use the official CSV template for all uploads.",
    "Input hard data verified by Jira or SonarQube.",
    "Report Tech Debt honestly—transparency is the only way to get budget for refactoring.",
    "Ensure Business Unit names match exactly ('Web & Mobile', etc.)."
  ],
  donts: [
    "Don't use the legacy 1-10 CSAT scale; 1-5 is the mandatory standard.",
    "Don't round numbers manually; the system enforces multiples of 5 for delivery metrics.",
    "Don't hide failing projects; the Board View will flag anomalies regardless.",
    "Don't share the gatekeeper password with unauthorized personnel."
  ]
};

// Firebase Setup
// Read config from Vite env instead of relying on globals like __firebase_config
const rawFirebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG;

let firebaseConfig = null;
try {
  firebaseConfig = rawFirebaseConfig ? JSON.parse(rawFirebaseConfig) : null;
} catch (e) {
  console.error('Invalid VITE_FIREBASE_CONFIG JSON:', e);
}

let app = null;
let auth = null;
let db = null;

if (firebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = import.meta.env.VITE_APP_ID || 'delivery-cmd-default';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [allClients, setAllClients] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1 2025");
  const [isUploading, setIsUploading] = useState(false);

  // Toggle state for BU categories
  const [expandedBUs, setExpandedBUs] = useState(
    BUSINESS_UNITS.reduce((acc, bu) => ({ ...acc, [bu]: true }), {})
  );

  // Auth Effect
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      // eslint-disable-next-line no-undef
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
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
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubscribe = onSnapshot(query(colRef), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setAllClients(data);
    }, (err) => console.error("Firestore Error:", err));
    return () => unsubscribe();
  }, [user, isAuthorized]);

  // Derived State
  const currentClients = useMemo(
    () => allClients.filter(c => c.quarter === selectedQuarter),
    [allClients, selectedQuarter]
  );

  const prevQuarter = useMemo(() => {
    const idx = QUARTERS.indexOf(selectedQuarter);
    return idx > 0 ? QUARTERS[idx - 1] : null;
  }, [selectedQuarter]);

  const calculateStats = (clientList) => {
    const stats = {};
    BUSINESS_UNITS.forEach(bu => {
      stats[bu] = {};
      KRA_METRICS.forEach(kra => {
        const values = clientList
          .filter(c => c.activeBUs.includes(bu))
          .map(c => c.buData[bu]?.[kra.id])
          .filter(v => v !== undefined);
        stats[bu][kra.id] = values.length
          ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
          : null;
      });
    });
    return stats;
  };

  const activeStats = useMemo(() => calculateStats(currentClients), [currentClients]);

  const historicalStats = useMemo(() => {
    if (!prevQuarter) return null;
    return calculateStats(allClients.filter(c => c.quarter === prevQuarter));
  }, [allClients, prevQuarter]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === SHARED_PASSWORD) {
      setIsAuthorized(true);
      setLoginError("");
    } else {
      setLoginError("Invalid authorization code.");
    }
  };

  const toggleBU = (bu) => {
    setExpandedBUs(prev => ({ ...prev, [bu]: !prev[bu] }));
  };

  const saveClient = async (clientData) => {
    if (!user || !db) return;
    const compositeId = `${clientData.quarter}_${clientData.name.replace(/\s+/g, '_')}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', compositeId), {
      ...clientData,
      id: compositeId
    });
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = typeof event.target?.result === 'string' ? event.target.result : '';
      const rows = text
        .split('\n')
        .map(r => r.split(',').map(c => c.trim()))
        .filter(r => r.length >= 6);

      const quarterMap = new Map();
      for (let i = 1; i < rows.length; i += 1) {
        const [name, bu, margin, otd, obd, csat] = rows[i];
        if (!name || !BUSINESS_UNITS.includes(bu)) continue;
        if (!quarterMap.has(name)) {
          quarterMap.set(name, {
            name,
            quarter: selectedQuarter,
            activeBUs: [],
            buData: {}
          });
        }
        const client = quarterMap.get(name);
        if (!client.activeBUs.includes(bu)) client.activeBUs.push(bu);
        client.buData[bu] = {
          margin: Number.parseFloat(margin) || 0,
          otd: Math.round((Number.parseFloat(otd) || 0) / 5) * 5,
          obd: Math.round((Number.parseFloat(obd) || 0) / 5) * 5,
          csat: Number.parseFloat(csat) || 0,
          techDebt: 0,
          aiFirst: 0
        };
      }

      // Persist all clients
      for (const client of quarterMap.values()) {
        // eslint-disable-next-line no-await-in-loop
        await saveClient(client);
      }
      setIsUploading(false);
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const deleteClient = async (id) => {
    if (!db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id));
  };

  const updateMetric = (clientId, bu, metricId, value) => {
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;
    void saveClient({
      ...client,
      buData: {
        ...client.buData,
        [bu]: {
          ...client.buData[bu],
          [metricId]: Number.parseFloat(value) || 0
        }
      }
    });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
            Executive Gateway
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              placeholder="Authorization Code"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-center"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            {loginError && (
              <div className="text-rose-600 text-xs font-bold flex items-center justify-center gap-1">
                <AlertTriangle size={14}/> 
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all"
            >
              Authorize Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 max-w-7xl mx-auto space-y-10 pb-20">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" />
            Strategic Delivery Command
          </h1>
          <p className="text-slate-500 font-medium mt-1">Institutional Governance Matrix</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar size={18} className="text-slate-400 mr-2" />
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              {QUARTERS.map(q => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all">
            <UploadCloud size={18} />
            {isUploading ? 'Syncing...' : 'Upload Quarter CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          <button
            type="button"
            onClick={() => setIsAuthorized(false)}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 transition-colors"
          >
            <LogOut size={20}/>
          </button>
        </div>
      </header>

      {/* Summary Table */}
      <section className="bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-400" size={20} />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Quarterly Trends: {selectedQuarter}
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-tighter text-slate-500">
              <tr>
                <th className="px-8 py-4">Business Unit</th>
                {KRA_METRICS.map(m => (
                  <th key={m.id} className="px-4 py-4 text-center">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {BUSINESS_UNITS.map(bu => (
                <tr key={bu} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-8 py-5 font-bold text-sm">{bu}</td>
                  {KRA_METRICS.map(kra => {
                    const currentVal = activeStats[bu][kra.id];
                    const prevVal = historicalStats ? historicalStats[bu][kra.id] : null;
                    const delta =
                      currentVal && prevVal
                        ? (Number.parseFloat(currentVal) - Number.parseFloat(prevVal)).toFixed(1)
                        : null;
                    return (
                      <td key={kra.id} className="px-4 py-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-lg font-bold">
                            {currentVal || '—'}
                            <span className="text-[10px] opacity-30 ml-0.5">{kra.suffix}</span>
                          </span>
                          {delta && delta !== '0.0' && (
                            <span
                              className={`text-[9px] font-black flex items-center gap-0.5 ${
                                Number.parseFloat(delta) > 0
                                  ? kra.inverse
                                    ? 'text-rose-500'
                                    : 'text-emerald-500'
                                  : kra.inverse
                                  ? 'text-emerald-500'
                                  : 'text-rose-500'
                              }`}
                            >
                              {Number.parseFloat(delta) > 0 ? (
                                <ArrowUp size={10}/>
                              ) : (
                                <ArrowDown size={10}/>
                              )}{' '}
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
        <div className="flex items-center gap-2">
          <Users className="text-indigo-600" size={20} />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Portfolio Drilldown (By Business Unit)
          </h2>
        </div>

        {BUSINESS_UNITS.map(bu => {
          const buClients = currentClients.filter(c => c.activeBUs.includes(bu));
          const isExpanded = expandedBUs[bu];
          
          return (
            <div
              key={bu}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all"
            >
              {/* BU Category Header */}
              <button 
                type="button"
                onClick={() => toggleBU(bu)}
                className={`w-full p-5 flex items-center justify-between transition-colors ${
                  isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <BarChart3 size={18} />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-900">
                      {bu}
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {buClients.length} Active Clients
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
                    <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4 w-64">Client Name</th>
                        {KRA_METRICS.map(m => (
                          <th key={m.id} className="px-4 py-4 text-center">
                            {m.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {buClients.map(client => (
                        <tr key={`${client.id}-${bu}`} className="hover:bg-indigo-50/10 transition-colors group">
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">
                                {client.name}
                              </span>
                              <button 
                                type="button"
                                onClick={() => deleteClient(client.id)}
                                className="text-[9px] text-rose-500 font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1"
                              >
                                <Trash2 size={10} /> Delete Record
                              </button>
                            </div>
                          </td>
                          {KRA_METRICS.map(kra => (
                            <td key={kra.id} className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <input 
                                  type="number" 
                                  step={kra.step} 
                                  value={client.buData[bu][kra.id]} 
                                  onChange={(e) =>
                                    updateMetric(client.id, bu, kra.id, e.target.value)
                                  }
                                  className="w-16 bg-white border border-slate-200 rounded-lg text-center font-bold text-sm p-1 outline-none focus:ring-2 focus:ring-indigo-100"
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
                            No clients currently mapped to {bu} for this quarter.
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
      <footer className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-slate-200">
        <div>
          <h3 className="text-emerald-600 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle2 size={16}/> Governance Dos
          </h3>
          <ul className="space-y-3">
            {GOVERNANCE_RULES.dos.map((rule, i) => (
              <li key={rule} className="text-sm text-slate-600 flex gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-rose-600 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle size={16}/> Governance Don&apos;ts
          </h3>
          <ul className="space-y-3">
            {GOVERNANCE_RULES.donts.map((rule) => (
              <li key={rule} className="text-sm text-slate-600 flex gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}

