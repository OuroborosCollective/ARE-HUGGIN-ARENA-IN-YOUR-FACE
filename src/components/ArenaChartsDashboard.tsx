import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { BarChart3, TrendingUp, ShieldCheck, Zap } from 'lucide-react';

interface ArenaParticipant {
  rank: number;
  model_id: string;
  name: string;
  org: string;
  elo: number;
  wins: number;
  losses: number;
  evidence_points: number;
  ast_accuracy: number;
  last_receipt_hash: string;
}

interface ArenaChartsDashboardProps {
  leaderboard: ArenaParticipant[];
}

export const ArenaChartsDashboard: React.FC<ArenaChartsDashboardProps> = ({ leaderboard }) => {
  // Compute chart data
  const chartData = leaderboard.map((p) => {
    const totalMatches = p.wins + p.losses;
    const winRate = totalMatches > 0 ? Math.round((p.wins / totalMatches) * 100) : 0;
    const logicEfficiency = Math.round(p.evidence_points / Math.max(1, p.wins));

    return {
      name: p.name.replace('-Instruct', '').replace('ouroboros/', ''),
      fullName: p.name,
      elo: p.elo,
      winRate,
      astAccuracy: p.ast_accuracy,
      evidencePoints: p.evidence_points,
      logicEfficiency,
      wins: p.wins,
      losses: p.losses
    };
  });

  const radarData = leaderboard.slice(0, 4).map((p) => ({
    model: p.name.split('/')[1] || p.name.split(' ')[0],
    eloNorm: Math.round(((p.elo - 1800) / 400) * 100),
    accuracy: Math.round(p.ast_accuracy),
    winRate: Math.round((p.wins / Math.max(1, p.wins + p.losses)) * 100),
    ptsNorm: Math.round((p.evidence_points / 10000) * 100)
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Peak Tournament Elo</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">
            {leaderboard[0]?.elo || 2180}
          </p>
          <p className="text-[11px] text-amber-400 truncate font-mono">
            {leaderboard[0]?.name || 'ARE-rLOGIC-70B'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Highest AST Accuracy</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {Math.max(...leaderboard.map(p => p.ast_accuracy), 98.4)}%
          </p>
          <p className="text-[11px] text-slate-500">Formal Invariant Proof Robustness</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Evidence Points</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold font-mono text-indigo-300">
            {leaderboard.reduce((acc, p) => acc + p.evidence_points, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500">Backreadable Revision Ledger</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Contender Models</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400">
            {leaderboard.length}
          </p>
          <p className="text-[11px] text-emerald-400">All MCP Protocol Compatible</p>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Win-Rate & AST Accuracy Bar Chart */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Win-Rate % vs AST Logic Accuracy Distribution
              </h4>
              <p className="text-[11px] text-slate-400">
                Direct comparison of match win percentage and AST invariant verification accuracy.
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="winRate" name="Win-Rate %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="astAccuracy" name="AST Accuracy %" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Elo & Evidence Logic Efficiency Chart */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Logic Efficiency (Pts / Win)
              </h4>
              <p className="text-[11px] text-slate-400">
                Average evidence revision logic points scored per victorious turn.
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 15, left: 15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                />
                <Bar dataKey="logicEfficiency" name="Points / Win" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
