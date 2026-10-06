import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  Layers,
  Activity,
  Database,
  RefreshCw,
  Trophy,
  Swords,
  Shield,
  Award,
  Filter,
  Download,
  UploadCloud,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CombatRevisionRecord } from '../utils/combatEngine';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { D3CombatZoneHeatmap } from './D3CombatZoneHeatmap';

interface FirestoreCombatAnalyticsDashboardProps {
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
  onSelectReplayMatch?: (revision: CombatRevisionRecord) => void;
}

export const FirestoreCombatAnalyticsDashboard: React.FC<FirestoreCombatAnalyticsDashboardProps> = ({
  onExportToHf,
  onSelectReplayMatch
}) => {
  const { user } = useFirebaseAuth();

  const [revisions, setRevisions] = useState<CombatRevisionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('are_local_combat_revisions_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'VICTORY' | 'DEFEAT'>('ALL');
  const [activeMetricTab, setActiveMetricTab] = useState<'d3_heatmap' | 'win_rates' | 'damage' | 'outcomes'>('d3_heatmap');

  // Real-time Firestore query for finalized combat revisions
  useEffect(() => {
    if (!user) {
      try {
        const saved = localStorage.getItem('are_local_combat_revisions_v1');
        if (saved) setRevisions(JSON.parse(saved));
      } catch (e) {
        console.warn('Local combat revisions read error:', e);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const path = `users/${user.uid}/combat_revisions`;
    const colRef = collection(db, 'users', user.uid, 'combat_revisions');

    try {
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const cloudRevisions: CombatRevisionRecord[] = [];
          snapshot.forEach((docSnap) => {
            cloudRevisions.push(docSnap.data() as CombatRevisionRecord);
          });

          // Chronological descending
          cloudRevisions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRevisions(cloudRevisions);
          setLoading(false);
          localStorage.setItem('are_local_combat_revisions_v1', JSON.stringify(cloudRevisions));
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, path);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn('Firestore combat analytics listener error:', err);
      setLoading(false);
    }
  }, [user]);

  // Aggregate Computations directly from finalized Firestore revisions
  const totalMatches = revisions.length;
  const victories = revisions.filter((r) => r.outcome === 'VICTORY').length;
  const defeats = revisions.filter((r) => r.outcome === 'DEFEAT').length;
  const draws = revisions.filter((r) => r.outcome === 'DRAW').length;
  const overallWinRate = totalMatches > 0 ? Math.round((victories / totalMatches) * 100) : 0;

  // Average Damage Calculations
  const totalHeroDamage = revisions.reduce((acc, r) => acc + (r.combatSummary?.totalDamageDealtByHero || 0), 0);
  const totalOpponentDamage = revisions.reduce((acc, r) => acc + (r.combatSummary?.totalDamageDealtByOpponent || 0), 0);
  const avgDamageDealt = totalMatches > 0 ? Math.round(totalHeroDamage / totalMatches) : 0;
  const avgDamageTaken = totalMatches > 0 ? Math.round(totalOpponentDamage / totalMatches) : 0;
  const totalEvidencePoints = revisions.reduce((acc, r) => acc + (r.pointsAwarded || 0), 0);
  const totalXpYield = revisions.reduce((acc, r) => acc + (r.xpAwarded || 0), 0);

  // Model-specific Breakdown (Both Hero classes and Opponent Models)
  const modelStatsMap: Record<
    string,
    { modelName: string; matches: number; wins: number; totalDamage: number; avgDamage: number; winRate: number }
  > = {};

  revisions.forEach((r) => {
    // 1. Attacker / Hero Class
    const attackerKey = r.attacker || 'Hero Fighter';
    if (!modelStatsMap[attackerKey]) {
      modelStatsMap[attackerKey] = { modelName: attackerKey, matches: 0, wins: 0, totalDamage: 0, avgDamage: 0, winRate: 0 };
    }
    modelStatsMap[attackerKey].matches += 1;
    if (r.outcome === 'VICTORY') modelStatsMap[attackerKey].wins += 1;
    modelStatsMap[attackerKey].totalDamage += r.combatSummary?.totalDamageDealtByHero || 0;

    // 2. Defender / Opponent Model
    const defenderKey = r.defender || 'Opponent Node';
    if (!modelStatsMap[defenderKey]) {
      modelStatsMap[defenderKey] = { modelName: defenderKey, matches: 0, wins: 0, totalDamage: 0, avgDamage: 0, winRate: 0 };
    }
    modelStatsMap[defenderKey].matches += 1;
    if (r.outcome === 'DEFEAT') modelStatsMap[defenderKey].wins += 1;
    modelStatsMap[defenderKey].totalDamage += r.combatSummary?.totalDamageDealtByOpponent || 0;
  });

  // Calculate averages & win rates
  const modelStatsArray = Object.values(modelStatsMap).map((stat) => {
    return {
      ...stat,
      displayName: stat.modelName.split('/').pop() || stat.modelName,
      avgDamage: Math.round(stat.totalDamage / Math.max(1, stat.matches)),
      winRate: Math.round((stat.wins / Math.max(1, stat.matches)) * 100)
    };
  });

  modelStatsArray.sort((a, b) => b.matches - a.matches);

  // Chart Data: Model Win Rate Breakdown
  const winRateChartData = modelStatsArray.slice(0, 8).map((m) => ({
    name: m.displayName,
    winRate: m.winRate,
    matches: m.matches,
    wins: m.wins
  }));

  // Chart Data: Average Damage Output vs Taken
  const damageChartData = modelStatsArray.slice(0, 8).map((m) => ({
    name: m.displayName,
    avgDamage: m.avgDamage,
    totalDamage: m.totalDamage
  }));

  // Chart Data: Outcomes Pie Distribution
  const outcomePieData = [
    { name: 'Victories', value: victories, color: '#10b981' },
    { name: 'Defeats', value: defeats, color: '#f43f5e' },
    { name: 'Draws', value: draws, color: '#94a3b8' }
  ].filter((d) => d.value > 0);

  // Cumulative Damage Progression over Matches (Chronological oldest to newest)
  const sortedChronological = [...revisions].reverse();
  let runningHeroDmg = 0;
  let runningOppDmg = 0;
  const progressionData = sortedChronological.slice(-12).map((r, idx) => {
    runningHeroDmg += r.combatSummary?.totalDamageDealtByHero || 0;
    runningOppDmg += r.combatSummary?.totalDamageDealtByOpponent || 0;
    return {
      match: `M-${idx + 1}`,
      heroDamage: r.combatSummary?.totalDamageDealtByHero || 0,
      opponentDamage: r.combatSummary?.totalDamageDealtByOpponent || 0,
      cumulativeHero: runningHeroDmg
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Top Banner with Firestore Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 text-amber-400 rounded-2xl shadow-lg shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                Real-Time Firestore Combat Analytics
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                Live Firestore Stream
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregate combat metrics, win rate distributions by model, and average damage calculated from finalized battle revisions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onExportToHf && (
            <button
              onClick={() =>
                onExportToHf(
                  'arena_tournament',
                  `ARE Tournament Finalized Analytics Summary (${totalMatches} Battles)`,
                  {
                    totalMatches,
                    victories,
                    defeats,
                    overallWinRate,
                    avgDamageDealt,
                    avgDamageTaken,
                    modelStats: modelStatsArray
                  },
                  'ouroboroscollective/ARE-rLOGIC-class'
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md min-h-[38px]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Export Analytics to HF</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Finalized Matches */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Finalized Battles</span>
            <Swords className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-100">
            {totalMatches}
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-emerald-400 font-bold">{victories}W</span>
            <span className="text-slate-600">·</span>
            <span className="text-rose-400 font-bold">{defeats}L</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{draws}D</span>
          </div>
        </div>

        {/* Overall Win Rate */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Overall Win Rate</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-400">
            {overallWinRate}%
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {victories} victories across {totalMatches} duels
          </p>
        </div>

        {/* Average Damage Dealt */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Avg Damage Dealt</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-300">
            {avgDamageDealt} <span className="text-xs text-slate-400 font-normal">HP/match</span>
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Avg taken: <span className="text-rose-400">{avgDamageTaken} HP</span>
          </p>
        </div>

        {/* Total Points & XP Generated */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Points &amp; XP Yield</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black font-mono text-indigo-300">
            +{totalEvidencePoints} <span className="text-xs text-slate-400 font-normal">pts</span>
          </p>
          <p className="text-[11px] text-emerald-400 font-mono">
            +{totalXpYield} XP earned in total
          </p>
        </div>
      </div>

      {/* Main Charts & Visualizations Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
        {/* Metric Tabs Switcher */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono flex-wrap">
            <button
              onClick={() => setActiveMetricTab('d3_heatmap')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeMetricTab === 'd3_heatmap'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>D3.js Combat Zone Heatmap</span>
            </button>

            <button
              onClick={() => setActiveMetricTab('win_rates')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeMetricTab === 'win_rates'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Win Rate by Model</span>
            </button>

            <button
              onClick={() => setActiveMetricTab('damage')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeMetricTab === 'damage'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Average Damage</span>
            </button>

            <button
              onClick={() => setActiveMetricTab('outcomes')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeMetricTab === 'outcomes'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Battle Progression</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Aggregated across {revisions.length} Firestore revisions
          </span>
        </div>

        {/* TAB 0: D3.JS COMBAT ZONE & DAMAGE TYPE HEATMAP */}
        {activeMetricTab === 'd3_heatmap' && (
          <div className="space-y-3">
            <D3CombatZoneHeatmap initialRevisions={revisions} />
          </div>
        )}

        {/* TAB 1: WIN RATE BY MODEL BAR CHART */}
        {activeMetricTab === 'win_rates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">Win Rate Percentage (%) by Combatant Model</span>
              <span className="text-emerald-400">Higher is better</span>
            </div>

            {winRateChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={winRateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#fbbf24' }}
                    />
                    <Bar dataKey="winRate" name="Win Rate %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
                No finalized battle records in Firestore yet. Complete a battle in ARE Logic Arena to populate!
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AVERAGE DAMAGE DEALT BAR CHART */}
        {activeMetricTab === 'damage' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">Average Damage Output (HP Dealt per Match)</span>
              <span className="text-rose-400">Total Combat DPS</span>
            </div>

            {damageChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={damageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#f43f5e' }}
                    />
                    <Bar dataKey="avgDamage" name="Avg Damage (HP)" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
                No damage data recorded yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BATTLE PROGRESSION AREA CHART */}
        {activeMetricTab === 'outcomes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">Recent Match Damage Trajectory</span>
              <span className="text-indigo-400">Chronological Stream</span>
            </div>

            {progressionData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="heroDmgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="match" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="heroDamage" name="Hero Damage" stroke="#f59e0b" fillOpacity={1} fill="url(#heroDmgGrad)" />
                    <Area type="monotone" dataKey="opponentDamage" name="Opponent Damage" stroke="#f43f5e" fillOpacity={0.2} fill="#f43f5e" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
                No progression trajectory recorded.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Model Performance Aggregate Breakdown Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Combatant Model Aggregate Ledger</span>
          </h4>
          <span className="text-[11px] text-slate-500">Sorted by match count</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Model / Class</th>
                <th className="py-2.5 px-3 text-right">Matches</th>
                <th className="py-2.5 px-3 text-right">Victories</th>
                <th className="py-2.5 px-3 text-right">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Avg Damage</th>
                <th className="py-2.5 px-3 text-right">Total DPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {modelStatsArray.map((m) => (
                <tr key={m.modelName} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-100">{m.modelName}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{m.matches}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{m.wins}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      m.winRate >= 60
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : m.winRate >= 40
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {m.winRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-300 font-bold">{m.avgDamage} HP</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{m.totalDamage.toLocaleString()} HP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
