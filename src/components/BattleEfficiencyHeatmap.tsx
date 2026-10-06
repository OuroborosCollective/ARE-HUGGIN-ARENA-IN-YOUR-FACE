import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart3,
  TrendingUp,
  Filter,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  Database,
  Search,
  RefreshCw,
  Zap
} from 'lucide-react';

interface HeatmapCell {
  strategy: string;
  category: string;
  efficiency: number; // 0..100
  totalMatches: number;
  wins: number;
  avgLatencyMs: number;
  scoreDelta: number;
}

interface BattleTrendsData {
  timeframe: string;
  strategies: string[];
  categories: string[];
  matrix: HeatmapCell[];
}

interface BattleEfficiencyHeatmapProps {
  onSelectCategory?: (category: string) => void;
}

export const BattleEfficiencyHeatmap: React.FC<BattleEfficiencyHeatmapProps> = ({ onSelectCategory }) => {
  const [data, setData] = useState<BattleTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [timeframe, setTimeframe] = useState<'30_days' | '7_days' | 'all_time'>('30_days');

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arena/battle-trends');
      const jsonData = await res.json();
      setData(jsonData);
      if (jsonData.matrix && jsonData.matrix.length > 0) {
        setSelectedCell(jsonData.matrix[0]);
      }
    } catch (err) {
      console.error('Failed to load battle trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [timeframe]);

  if (loading || !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading 30-Day D3 Battle Efficiency Trends Heatmap...</span>
        </div>
      </div>
    );
  }

  // Helper to color heatmap cells dynamically based on efficiency
  const getCellBgColor = (efficiency: number) => {
    if (efficiency >= 85) return 'bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 border-emerald-400/80';
    if (efficiency >= 70) return 'bg-emerald-600/80 text-slate-100 font-bold hover:bg-emerald-500 border-emerald-500/60';
    if (efficiency >= 55) return 'bg-amber-500/80 text-slate-950 font-bold hover:bg-amber-400 border-amber-400/60';
    if (efficiency >= 40) return 'bg-amber-700/60 text-slate-200 font-semibold hover:bg-amber-600 border-amber-600/40';
    return 'bg-rose-900/60 text-rose-200 font-semibold hover:bg-rose-800 border-rose-700/40';
  };

  const filteredStrategies = data.strategies.filter(s =>
    s.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100 font-mono">
              D3 Battle Efficiency Trends — 30-Day Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-performance matrix of logic revision strategies vs dataset categories over the past 30 days.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono self-start sm:self-auto">
          {(['30_days', '7_days', 'all_time'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeframe === tf ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf === '30_days' ? '30 Days' : tf === '7_days' ? '7 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: SVG/HTML Heatmap Matrix + Interactive Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Grid Matrix */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 overflow-x-auto">
          <div className="flex items-center justify-between gap-3 text-xs font-mono pb-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Strategy vs Category Matrix
            </span>

            {/* Legend */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-700 inline-block" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Mid</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> High</span>
            </div>
          </div>

          {/* D3-Style SVG/Grid Heatmap Table */}
          <div className="min-w-[600px]">
            {/* Header Categories Row */}
            <div className="grid grid-cols-8 gap-1.5 mb-1.5 text-[10px] font-mono text-slate-400 font-bold">
              <div className="col-span-2 text-slate-500">Strategy / Category</div>
              {data.categories.map((cat, idx) => (
                <div key={idx} className="text-center truncate px-1 py-1 bg-slate-900/60 rounded border border-slate-800/80" title={cat}>
                  {cat.split(' ')[0]}
                </div>
              ))}
            </div>

            {/* Strategy Rows */}
            <div className="space-y-1.5">
              {filteredStrategies.map((strat) => (
                <div key={strat} className="grid grid-cols-8 gap-1.5 items-center">
                  <div className="col-span-2 text-xs font-mono text-slate-200 font-semibold truncate pr-2" title={strat}>
                    {strat}
                  </div>

                  {data.categories.map((cat) => {
                    const cell = data.matrix.find(m => m.strategy === strat && m.category === cat) || {
                      strategy: strat,
                      category: cat,
                      efficiency: 50,
                      totalMatches: 20,
                      wins: 10,
                      avgLatencyMs: 400,
                      scoreDelta: 0
                    };

                    const isSelected = selectedCell?.strategy === strat && selectedCell?.category === cat;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCell(cell)}
                        className={`h-9 rounded-lg border text-xs font-mono transition-all flex items-center justify-center cursor-pointer shadow-sm ${getCellBgColor(
                          cell.efficiency
                        )} ${isSelected ? 'ring-2 ring-amber-400 scale-105 z-10' : ''}`}
                        title={`${strat} on ${cat}: ${cell.efficiency}% Efficiency`}
                      >
                        {cell.efficiency}%
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Cell Detail Inspector */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          {selectedCell ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                  Cell Efficiency Inspector
                </span>
                <h4 className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                  {selectedCell.strategy}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Category: <span className="text-emerald-400 font-bold">{selectedCell.category}</span>
                </p>
              </div>

              {/* Big Efficiency Score Badge */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Efficiency Rate</span>
                <div className="text-3xl font-black font-mono text-amber-400">
                  {selectedCell.efficiency}%
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedCell.wins} wins out of {selectedCell.totalMatches} matches
                </p>
              </div>

              {/* Detail Metrics Grid */}
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Avg Execution Latency:</span>
                  <span className="text-amber-300 font-bold">{selectedCell.avgLatencyMs} ms</span>
                </div>

                <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Score Delta (+pts):</span>
                  <span className="text-emerald-400 font-bold">+{selectedCell.scoreDelta} pts</span>
                </div>
              </div>

              {onSelectCategory && (
                <button
                  onClick={() => onSelectCategory(selectedCell.category)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono rounded-xl transition-colors min-h-[40px]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Filter Arena for {selectedCell.category}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center p-6 text-slate-500 text-xs font-mono">
              Click any cell in the heatmap matrix to inspect battle efficiency metrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
