import React, { useState, useEffect, useMemo } from 'react';
import {
  Grid,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  Layers,
  Activity,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  Copy,
  Check,
  UploadCloud,
  FileCode,
  ShieldCheck,
  Eye,
  BarChart2
} from 'lucide-react';

export type HeatmapMetricMode = 'missing_values' | 'char_density' | 'token_density' | 'schema_integrity';

interface DatasetFeature {
  name: string;
  type: string;
}

interface DatasetHeatmapProps {
  dataset: {
    id: string;
    name: string;
    task: string;
    modality: string;
    num_rows: number;
    size: string;
    features: DatasetFeature[];
    sample_rows: any[];
  };
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const DatasetHeatmap: React.FC<DatasetHeatmapProps> = ({ dataset, onExportToHf }) => {
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('missing_values');
  const [chunkIndex, setChunkIndex] = useState<number>(0);
  const [chunkSize, setChunkSize] = useState<number>(10);
  const [filterTerm, setFilterTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number;
    rowId: number | string;
    featureName: string;
    featureType: string;
    value: any;
    isNull: boolean;
    charLength: number;
    tokenCount: number;
    densityPct: number;
    checksum?: string;
  } | null>(null);

  // Stream data from existing dataset streaming API
  const [streamData, setStreamData] = useState<{
    rows: any[];
    total_chunks: number;
    total_rows: number;
    chunk_index: number;
    has_next: boolean;
    has_prev: boolean;
    memory_buffer_kb: number;
  } | null>(null);

  const fetchStreamData = async (cIndex: number, cSize: number, filter: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/datasets/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: dataset.id,
          chunk_index: cIndex,
          chunk_size: cSize,
          filter_term: filter
        })
      });
      const data = await res.json();
      setStreamData(data);
      setChunkIndex(data.chunk_index);
    } catch (err) {
      console.error('Failed to stream dataset chunk for heatmap:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreamData(chunkIndex, chunkSize, filterTerm);
  }, [dataset.id, chunkSize]);

  // Auto-play stream sweep
  useEffect(() => {
    let timer: any = null;
    if (isAutoPlaying && streamData) {
      timer = setInterval(() => {
        setChunkIndex(prev => {
          const nextIdx = (prev + 1) % (streamData.total_chunks || 1);
          fetchStreamData(nextIdx, chunkSize, filterTerm);
          return nextIdx;
        });
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoPlaying, streamData?.total_chunks, chunkSize, filterTerm]);

  // Active rows to render in grid: fallback to sample_rows if streaming not loaded
  const rows = streamData?.rows && streamData.rows.length > 0 ? streamData.rows : dataset.sample_rows || [];
  const features = dataset.features || [];

  // Compute column-level statistics for relative scaling
  const columnStats = useMemo(() => {
    const stats: Record<string, {
      maxLen: number;
      minLen: number;
      avgLen: number;
      nullCount: number;
      filledCount: number;
      completenessRate: number;
    }> = {};

    features.forEach(f => {
      let totalLen = 0;
      let maxLen = 0;
      let minLen = Infinity;
      let nullCount = 0;
      let filledCount = 0;

      rows.forEach(r => {
        const val = r[f.name];
        const isNull = val === null || val === undefined || val === '' || (typeof val === 'string' && val.trim() === '');
        if (isNull) {
          nullCount++;
        } else {
          filledCount++;
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          const len = str.length;
          totalLen += len;
          if (len > maxLen) maxLen = len;
          if (len < minLen) minLen = len;
        }
      });

      if (minLen === Infinity) minLen = 0;
      const avgLen = filledCount > 0 ? Math.round(totalLen / filledCount) : 0;
      const completenessRate = rows.length > 0 ? Math.round((filledCount / rows.length) * 100) : 100;

      stats[f.name] = {
        maxLen: Math.max(maxLen, 1),
        minLen,
        avgLen,
        nullCount,
        filledCount,
        completenessRate
      };
    });

    return stats;
  }, [rows, features]);

  // Overall aggregate matrix stats
  const aggregateStats = useMemo(() => {
    let totalCells = rows.length * features.length;
    let missingCells = 0;
    let totalChars = 0;

    rows.forEach(r => {
      features.forEach(f => {
        const val = r[f.name];
        const isNull = val === null || val === undefined || val === '' || (typeof val === 'string' && val.trim() === '');
        if (isNull) {
          missingCells++;
        } else {
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          totalChars += str.length;
        }
      });
    });

    const filledCells = totalCells - missingCells;
    const densityPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 100;
    const avgCharsPerCell = filledCells > 0 ? Math.round(totalChars / filledCells) : 0;

    let densestCol = features[0]?.name || 'text';
    let sparsestCol = features[0]?.name || 'text';
    let highestFill = -1;
    let lowestFill = 101;

    features.forEach(f => {
      const comp = columnStats[f.name]?.completenessRate ?? 100;
      if (comp > highestFill) {
        highestFill = comp;
        densestCol = f.name;
      }
      if (comp < lowestFill) {
        lowestFill = comp;
        sparsestCol = f.name;
      }
    });

    return {
      totalCells,
      missingCells,
      filledCells,
      densityPct,
      avgCharsPerCell,
      densestCol,
      sparsestCol,
      highestFill,
      lowestFill
    };
  }, [rows, features, columnStats]);

  // Helper to compute cell color styling based on metric mode
  const getCellVisual = (val: any, featureName: string) => {
    const isNull = val === null || val === undefined || val === '' || (typeof val === 'string' && val.trim() === '');
    const colStat = columnStats[featureName] || { maxLen: 100, minLen: 0, avgLen: 50 };
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
    const charLen = isNull ? 0 : str.length;
    const tokenEst = Math.max(1, Math.round(charLen / 4));
    const densityRatio = colStat.maxLen > 0 ? Math.min(1, charLen / colStat.maxLen) : 0;
    const densityPct = Math.round(densityRatio * 100);

    if (isNull) {
      return {
        isNull: true,
        charLen: 0,
        tokenEst: 0,
        densityPct: 0,
        label: 'NULL',
        bgClass: 'bg-rose-950/70 border-rose-800/80 text-rose-300 hover:bg-rose-900',
        barColor: 'bg-rose-500',
        indicator: 'Missing'
      };
    }

    if (metricMode === 'missing_values') {
      return {
        isNull: false,
        charLen,
        tokenEst,
        densityPct: 100,
        label: `${charLen}c`,
        bgClass: 'bg-emerald-950/60 border-emerald-800/70 text-emerald-200 hover:bg-emerald-900/80',
        barColor: 'bg-emerald-400',
        indicator: 'Filled'
      };
    }

    if (metricMode === 'char_density' || metricMode === 'token_density') {
      if (densityRatio > 0.8) {
        return {
          isNull: false,
          charLen,
          tokenEst,
          densityPct,
          label: metricMode === 'char_density' ? `${charLen}c` : `${tokenEst}t`,
          bgClass: 'bg-amber-500/90 border-amber-400 text-slate-950 font-bold hover:bg-amber-400',
          barColor: 'bg-amber-300',
          indicator: 'Very High'
        };
      } else if (densityRatio > 0.5) {
        return {
          isNull: false,
          charLen,
          tokenEst,
          densityPct,
          label: metricMode === 'char_density' ? `${charLen}c` : `${tokenEst}t`,
          bgClass: 'bg-amber-600/60 border-amber-500/80 text-amber-100 hover:bg-amber-600',
          barColor: 'bg-amber-400',
          indicator: 'High'
        };
      } else if (densityRatio > 0.25) {
        return {
          isNull: false,
          charLen,
          tokenEst,
          densityPct,
          label: metricMode === 'char_density' ? `${charLen}c` : `${tokenEst}t`,
          bgClass: 'bg-amber-900/50 border-amber-800 text-amber-200 hover:bg-amber-900/80',
          barColor: 'bg-amber-500',
          indicator: 'Medium'
        };
      } else {
        return {
          isNull: false,
          charLen,
          tokenEst,
          densityPct,
          label: metricMode === 'char_density' ? `${charLen}c` : `${tokenEst}t`,
          bgClass: 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800',
          barColor: 'bg-slate-600',
          indicator: 'Low'
        };
      }
    }

    // Schema Integrity Mode
    return {
      isNull: false,
      charLen,
      tokenEst,
      densityPct: 100,
      label: 'VALID',
      bgClass: 'bg-indigo-950/60 border-indigo-800/70 text-indigo-200 hover:bg-indigo-900/80',
      barColor: 'bg-indigo-400',
      indicator: 'Conformant'
    };
  };

  const handleCopySummary = () => {
    const summaryMarkdown = `### Dataset Heatmap Profile: ${dataset.id}
- **Density Score**: ${aggregateStats.densityPct}% filled (${aggregateStats.missingCells} missing / ${aggregateStats.totalCells} cells)
- **Features Analyzed**: ${features.length} columns (${features.map(f => f.name).join(', ')})
- **Densest Column**: ${aggregateStats.densestCol} (${aggregateStats.highestFill}% completeness)
- **Sparsest Column**: ${aggregateStats.sparsestCol} (${aggregateStats.lowestFill}% completeness)
- **Streaming Buffer**: Chunk ${chunkIndex + 1}/${streamData?.total_chunks || 1} (${chunkSize} rows/chunk)`;

    navigator.clipboard.writeText(summaryMarkdown);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl shrink-0">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Feature Density & Missing Values Heatmap
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-semibold">
                  Live Streaming Grid
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Color-coded 2D matrix visualizing data completeness, token volume, and null sparsity across streaming parquet record chunks.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAutoPlaying(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold min-h-[40px] transition-colors ${
                isAutoPlaying
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
              }`}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isAutoPlaying ? 'Pause Stream Sweep' : 'Auto Sweep Chunks'}</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-semibold rounded-xl border border-slate-800 min-h-[40px] transition-colors"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedSummary ? 'Copied Summary' : 'Copy Summary'}</span>
            </button>

            {onExportToHf && (
              <button
                onClick={() => onExportToHf(
                  'dataset_diff',
                  `Dataset Heatmap Density Report: ${dataset.id}`,
                  {
                    dataset_id: dataset.id,
                    mode: metricMode,
                    aggregate_density: aggregateStats.densityPct,
                    missing_cells: aggregateStats.missingCells,
                    column_stats: columnStats
                  },
                  dataset.id
                )}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm min-h-[40px]"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Export Heatmap</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode & Filter Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Mode Selector */}
          <div className="md:col-span-6 flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto touch-scroll-x">
            <button
              onClick={() => setMetricMode('missing_values')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
                metricMode === 'missing_values'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Missing Values Matrix</span>
            </button>

            <button
              onClick={() => setMetricMode('char_density')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
                metricMode === 'char_density'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Char Density</span>
            </button>

            <button
              onClick={() => setMetricMode('token_density')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
                metricMode === 'token_density'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Token Density</span>
            </button>

            <button
              onClick={() => setMetricMode('schema_integrity')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
                metricMode === 'schema_integrity'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Type Integrity</span>
            </button>
          </div>

          {/* Search Filter */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={filterTerm}
              onChange={(e) => {
                setFilterTerm(e.target.value);
                fetchStreamData(0, chunkSize, e.target.value);
              }}
              placeholder="Filter streamed rows by keyword..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 min-h-[40px] focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Chunk Size Selector */}
          <div className="md:col-span-2 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 min-h-[40px]">
            <span className="text-slate-400 text-xs whitespace-nowrap">Chunk:</span>
            <select
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-mono font-bold text-xs focus:outline-none w-full"
            >
              <option value={5} className="bg-slate-900">5 rows</option>
              <option value={10} className="bg-slate-900">10 rows</option>
              <option value={20} className="bg-slate-900">20 rows</option>
              <option value={50} className="bg-slate-900">50 rows</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate Matrix Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Overall Completeness</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {aggregateStats.densityPct}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {aggregateStats.filledCells} / {aggregateStats.totalCells} cells filled
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Missing / Null Cells</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {aggregateStats.missingCells}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {aggregateStats.missingCells === 0 ? 'Zero Null Invariant' : `${((aggregateStats.missingCells / (aggregateStats.totalCells || 1)) * 100).toFixed(1)}% null rate`}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Densest Feature</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-sm font-bold font-mono text-amber-300 mt-2 truncate">
            {aggregateStats.densestCol}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            {aggregateStats.highestFill}% filled in chunk
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Value Length</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {aggregateStats.avgCharsPerCell} <span className="text-xs text-slate-400 font-sans">chars</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            ~{Math.round(aggregateStats.avgCharsPerCell / 4)} tokens / cell
          </p>
        </div>
      </div>

      {/* Main Heatmap Matrix Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Heatmap Header & Chunk Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-slate-100">
              Active Chunk Heatmap Grid ({rows.length} rows × {features.length} features)
            </h4>
          </div>

          {/* Chunk Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const prev = Math.max(0, chunkIndex - 1);
                fetchStreamData(prev, chunkSize, filterTerm);
              }}
              disabled={!streamData?.has_prev || isLoading}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev Chunk</span>
            </button>

            <span className="px-3 py-1.5 bg-slate-950 text-amber-300 font-mono text-xs font-bold rounded-lg border border-slate-800 min-h-[36px] flex items-center">
              Chunk {chunkIndex + 1} / {streamData?.total_chunks || 1}
            </span>

            <button
              onClick={() => {
                const next = chunkIndex + 1;
                fetchStreamData(next, chunkSize, filterTerm);
              }}
              disabled={!streamData?.has_next || isLoading}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
            >
              <span>Next Chunk</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => fetchStreamData(chunkIndex, chunkSize, filterTerm)}
              disabled={isLoading}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
              title="Refresh current chunk"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Legend Ribbon */}
        <div className="flex items-center gap-4 text-xs font-mono py-1 px-3 bg-slate-950 rounded-xl border border-slate-800/80 overflow-x-auto touch-scroll-x">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Legend:</span>
          {metricMode === 'missing_values' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-emerald-300">Filled / Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span className="text-rose-300">Missing / Null / Empty</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span className="text-amber-200">High Density ({'>'}80%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-600" />
                <span className="text-amber-300">Medium (50-80%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-900" />
                <span className="text-amber-400">Low (25-50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800" />
                <span className="text-slate-400">Minimal ({'<'}25%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-900" />
                <span className="text-rose-400">Missing / Null</span>
              </div>
            </>
          )}
        </div>

        {/* 2D Interactive Grid */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs font-mono bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
            <span>Streaming and rendering Parquet Heatmap Chunk...</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400">
                  <th className="p-3 w-16 text-center sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800">
                    Row #
                  </th>
                  {features.map((f) => {
                    const stat = columnStats[f.name];
                    return (
                      <th key={f.name} className="p-3 min-w-[140px] max-w-[220px] font-semibold text-slate-200">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{f.name}</span>
                            <span className="text-[10px] text-amber-400 px-1 py-0.5 rounded bg-amber-500/10 font-normal">
                              {f.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-normal">
                            <span>{stat?.completenessRate}% filled</span>
                            <span>{stat?.nullCount > 0 ? `${stat.nullCount} nulls` : '✓ 100%'}</span>
                          </div>
                          {/* Column Completeness Mini Bar */}
                          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stat?.nullCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${stat?.completenessRate || 100}%` }}
                            />
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((row, rIdx) => {
                  const rowId = row['__stream_row_id'] || (chunkIndex * chunkSize + rIdx + 1);
                  const checksum = row['__checksum'] || 'sha256_...';

                  return (
                    <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                      {/* Row Label */}
                      <td className="p-3 text-center text-amber-400 font-bold sticky left-0 bg-slate-950 z-10 border-r border-slate-800">
                        #{rowId}
                      </td>

                      {/* Feature Cells */}
                      {features.map((f) => {
                        const val = row[f.name];
                        const visual = getCellVisual(val, f.name);
                        const isSelected = selectedCell?.rowIndex === rIdx && selectedCell?.featureName === f.name;

                        return (
                          <td
                            key={f.name}
                            onClick={() => setSelectedCell({
                              rowIndex: rIdx,
                              rowId,
                              featureName: f.name,
                              featureType: f.type,
                              value: val,
                              isNull: visual.isNull,
                              charLength: visual.charLen,
                              tokenCount: visual.tokenEst,
                              densityPct: visual.densityPct,
                              checksum
                            })}
                            className="p-2 cursor-pointer transition-transform active:scale-95"
                          >
                            <div
                              className={`p-2.5 rounded-lg border text-center transition-all flex flex-col justify-between h-14 ${visual.bgClass} ${
                                isSelected ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/20' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold opacity-80">{visual.indicator}</span>
                                <span className="opacity-90">{visual.label}</span>
                              </div>
                              {/* Mini Density Bar */}
                              <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full ${visual.barColor}`}
                                  style={{ width: `${Math.max(visual.densityPct, 5)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Interactive Cell Inspector Drawer */}
        {selectedCell && (
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <h5 className="text-sm font-bold text-slate-100 font-mono">
                  Cell Detail Inspector · Row #{selectedCell.rowId} · [{selectedCell.featureName}]
                </h5>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-xs text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Status:</span>
                <span className={`font-bold ${selectedCell.isNull ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedCell.isNull ? 'NULL / Missing' : 'Filled & Valid'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Char Length:</span>
                <span className="text-amber-300 font-bold">{selectedCell.charLength} chars</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Estimated Tokens:</span>
                <span className="text-indigo-300 font-bold">{selectedCell.tokenCount} tokens</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Checksum:</span>
                <span className="text-slate-300 font-bold truncate block">{selectedCell.checksum}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono">Raw Cell Value:</span>
              <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {selectedCell.isNull ? '<null / empty string>' : typeof selectedCell.value === 'object' ? JSON.stringify(selectedCell.value, null, 2) : String(selectedCell.value)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
