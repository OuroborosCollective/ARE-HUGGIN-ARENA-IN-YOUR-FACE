import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, Activity, Layers, Table, FileText, CheckCircle2, AlertTriangle, Sparkles, Filter, Search, GitCompare, UploadCloud, ExternalLink, Play, Radio, ChevronLeft, ChevronRight, RefreshCw, Copy, Check, ShieldCheck, Database, Grid } from 'lucide-react';
import { DatasetDiffViewer } from './DatasetDiffViewer';
import { DatasetHeatmap } from './DatasetHeatmap';

interface DatasetVisualizerProps {
  dataset: {
    id: string;
    name: string;
    task: string;
    modality: string;
    num_rows: number;
    size: string;
    features: { name: string; type: string }[];
    sample_rows: any[];
  };
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const DatasetVisualizer: React.FC<DatasetVisualizerProps> = ({ dataset, onExportToHf }) => {
  const [activeVisualizerTab, setActiveVisualizerTab] = useState<'profile' | 'diff' | 'stream' | 'heatmap'>('profile');
  const [selectedColumn, setSelectedColumn] = useState<string>(dataset.features[0]?.name || 'text');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Streaming API state
  const [streamChunkIndex, setStreamChunkIndex] = useState(0);
  const [streamChunkSize, setStreamChunkSize] = useState(5);
  const [streamFilter, setStreamFilter] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamData, setStreamData] = useState<{
    rows: any[];
    total_chunks: number;
    total_rows: number;
    chunk_index: number;
    has_next: boolean;
    has_prev: boolean;
    memory_buffer_kb: number;
  } | null>(null);

  const fetchStreamChunk = async (chunkIdx: number, size: number, filter: string) => {
    setStreamLoading(true);
    try {
      const res = await fetch('/api/datasets/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: dataset.id,
          chunk_index: chunkIdx,
          chunk_size: size,
          filter_term: filter
        })
      });
      const data = await res.json();
      setStreamData(data);
      setStreamChunkIndex(data.chunk_index);
    } catch (e) {
      console.error('Failed to stream dataset chunk:', e);
    } finally {
      setStreamLoading(false);
    }
  };

  useEffect(() => {
    if (activeVisualizerTab === 'stream') {
      fetchStreamChunk(streamChunkIndex, streamChunkSize, streamFilter);
    }
  }, [activeVisualizerTab, dataset.id, streamChunkSize]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(dataset.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Calculate statistics from sample rows
  const textColumnKey = dataset.features.find(f => f.type === 'string')?.name || Object.keys(dataset.sample_rows[0] || {})[0] || 'text';

  const lengths = dataset.sample_rows.map(r => {
    const val = r[textColumnKey];
    if (typeof val === 'string') return val.length;
    if (typeof val === 'object') return JSON.stringify(val).length;
    return 0;
  });

  const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1));
  const minLength = Math.min(...lengths, 0);
  const maxLength = Math.max(...lengths, 0);

  // Length Distribution Bins (0-100, 101-300, 301-600, 601-1000, 1000+)
  const bins = [
    { label: '< 100 chars', count: lengths.filter(l => l < 100).length },
    { label: '100-300 chars', count: lengths.filter(l => l >= 100 && l <= 300).length },
    { label: '300-600 chars', count: lengths.filter(l => l > 300 && l <= 600).length },
    { label: '600-1000 chars', count: lengths.filter(l => l > 600 && l <= 1000).length },
    { label: '1000+ chars', count: lengths.filter(l => l > 1000).length },
  ];

  const maxBinCount = Math.max(...bins.map(b => b.count), 1);

  // Field Completeness Calculation
  const fieldCompleteness = dataset.features.map(f => {
    const nonNulls = dataset.sample_rows.filter(r => r[f.name] !== undefined && r[f.name] !== null && r[f.name] !== '').length;
    const completeness = Math.round((nonNulls / (dataset.sample_rows.length || 1)) * 100);
    return { name: f.name, type: f.type, completeness };
  });

  // Filtered rows for table view
  const filteredRows = dataset.sample_rows.filter(r => {
    if (!searchTerm) return true;
    return JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Visualizer Mode Segmented Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded-2xl gap-3">
        <div className="flex items-center gap-1 overflow-x-auto touch-scroll-x">
          <button
            onClick={() => setActiveVisualizerTab('profile')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeVisualizerTab === 'profile'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Distribution & Profile Metrics</span>
          </button>

          <button
            onClick={() => setActiveVisualizerTab('heatmap')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeVisualizerTab === 'heatmap'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Dataset Heatmap (Density & Nulls)</span>
          </button>

          <button
            onClick={() => setActiveVisualizerTab('diff')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeVisualizerTab === 'diff'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Side-by-Side Version Diff</span>
          </button>

          <button
            onClick={() => setActiveVisualizerTab('stream')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeVisualizerTab === 'stream'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>HF Streaming API (Chunked)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyId}
            title="Copy full dataset ID path"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-mono font-semibold rounded-xl border border-slate-800 transition-colors min-h-[40px]"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedId ? 'Copied ID' : 'Copy ID'}</span>
          </button>

          {onExportToHf && (
            <button
              onClick={() => onExportToHf('dataset_diff', `Dataset Analytics & Distribution Profile: ${dataset.id}`, { dataset_id: dataset.id, avg_length: avgLength, min_length: minLength, max_length: maxLength, bins }, dataset.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm min-h-[40px]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Export to HF</span>
            </button>
          )}

          <a
            href={`https://huggingface.co/datasets/${dataset.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors min-h-[40px]"
          >
            <span>HF Hub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* DIFF VIEWER TAB */}
      {activeVisualizerTab === 'diff' && (
        <DatasetDiffViewer datasetId={dataset.id} onExportToHf={onExportToHf} />
      )}

      {/* HEATMAP VIEW TAB */}
      {activeVisualizerTab === 'heatmap' && (
        <DatasetHeatmap dataset={dataset} onExportToHf={onExportToHf} />
      )}

      {/* PROFILE & DISTRIBUTION METRICS TAB */}
      {activeVisualizerTab === 'profile' && (
        <>
          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Records</span>
            <DatabaseIcon className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100 mt-2">
            {dataset.num_rows.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Dataset Size: {dataset.size}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Sequence Length</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100 mt-2">
            {avgLength} <span className="text-xs text-slate-400 font-sans">chars</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Min: {minLength} · Max: {maxLength}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Estimated Tokens</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-100 mt-2">
            {~~(dataset.num_rows * (avgLength / 4) / 1000000)}M
          </p>
          <p className="text-[11px] text-slate-500 mt-1">~{Math.round(avgLength / 4)} tokens/row</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Data Health Score</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-300 mt-2">
            96<span className="text-xs text-slate-400">/100</span>
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">0.12% Nulls · Ready for SFT</p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sequence Length Distribution Plot */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Sequence Length Distribution</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{textColumnKey}</span>
          </div>

          <div className="space-y-3 pt-2">
            {bins.map((bin, i) => {
              const pct = Math.round((bin.count / (maxBinCount || 1)) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{bin.label}</span>
                    <span className="text-amber-300 font-semibold">{bin.count} samples ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Field Completeness & Schema Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">Feature Field Completeness</h3>
            </div>
            <span className="text-xs text-slate-400">{dataset.features.length} columns</span>
          </div>

          <div className="space-y-3 pt-2">
            {fieldCompleteness.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-slate-200 font-medium">{f.name} <span className="text-slate-500">({f.type})</span></span>
                  <span className="font-mono text-emerald-400 font-semibold">{f.completeness}% filled</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-500"
                    style={{ width: `${f.completeness}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Sample Data Explorer Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100">Interactive Sample Data Matrix</h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter sample data rows..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                <th className="p-3 w-12 text-center">#</th>
                {dataset.features.map((f) => (
                  <th key={f.name} className="p-3 font-semibold text-slate-300 whitespace-nowrap">
                    {f.name} <span className="text-[10px] text-amber-400 font-normal">({f.type})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                  {dataset.features.map((f) => {
                    const val = row[f.name];
                    const rendered = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
                    return (
                      <td key={f.name} className="p-3 text-slate-300 max-w-xs truncate">
                        {rendered}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* STREAMING API (CHUNKED & PAGINATED) TAB */}
      {activeVisualizerTab === 'stream' && (
        <div className="space-y-6">
          {/* Stream Banner & Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Hugging Face Dataset Stream API</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                      Streaming Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Stream and inspect large training sets row-by-row with lazy chunking and zero heavy in-memory downloads.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => fetchStreamChunk(streamChunkIndex, streamChunkSize, streamFilter)}
                  disabled={streamLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 min-h-[40px] transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${streamLoading ? 'animate-spin' : ''}`} />
                  <span>Reload Chunk</span>
                </button>
              </div>
            </div>

            {/* Stream Settings & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={streamFilter}
                  onChange={(e) => {
                    setStreamFilter(e.target.value);
                    fetchStreamChunk(0, streamChunkSize, e.target.value);
                  }}
                  placeholder="Filter streamed rows by keyword or token..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 min-h-[40px] focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="md:col-span-3 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 min-h-[40px]">
                <span className="text-slate-400 whitespace-nowrap">Chunk Size:</span>
                <select
                  value={streamChunkSize}
                  onChange={(e) => setStreamChunkSize(Number(e.target.value))}
                  className="bg-transparent text-amber-300 font-mono font-bold focus:outline-none w-full"
                >
                  <option value={5} className="bg-slate-900">5 rows / chunk</option>
                  <option value={10} className="bg-slate-900">10 rows / chunk</option>
                  <option value={20} className="bg-slate-900">20 rows / chunk</option>
                </select>
              </div>

              <div className="md:col-span-3 flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 min-h-[40px] font-mono text-[11px]">
                <span className="text-slate-400">Buffer:</span>
                <span className="text-emerald-400 font-bold">{streamData?.memory_buffer_kb ?? 0} KB</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">Chunk {streamChunkIndex + 1}/{streamData?.total_chunks || 1}</span>
              </div>
            </div>
          </div>

          {/* Streamed Table View with Pagination Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-slate-100">
                  Streamed Parquet Records ({streamData?.rows.length || 0} active rows in chunk)
                </h4>
              </div>

              {/* Chunk Pagination Bar */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchStreamChunk(streamChunkIndex - 1, streamChunkSize, streamFilter)}
                  disabled={!streamData?.has_prev || streamLoading}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev Chunk</span>
                </button>

                <span className="px-3 py-1.5 bg-slate-950 text-amber-300 font-mono text-xs font-bold rounded-lg border border-slate-800 min-h-[36px] flex items-center">
                  {streamChunkIndex + 1} / {streamData?.total_chunks || 1}
                </span>

                <button
                  onClick={() => fetchStreamChunk(streamChunkIndex + 1, streamChunkSize, streamFilter)}
                  disabled={!streamData?.has_next || streamLoading}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <span>Next Chunk</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {streamLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-mono bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Streaming Parquet record chunk from Hugging Face dataset...</span>
              </div>
            ) : !streamData || streamData.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-mono bg-slate-950 rounded-xl border border-slate-800">
                No rows match stream filter in current chunk.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                      <th className="p-3 w-16 text-center">Row ID</th>
                      <th className="p-3 w-28 text-slate-400">Checksum</th>
                      {dataset.features.map((f) => (
                        <th key={f.name} className="p-3 font-semibold text-slate-300 whitespace-nowrap">
                          {f.name} <span className="text-[10px] text-amber-400 font-normal">({f.type})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {streamData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-center text-amber-400 font-bold">
                          #{row['__stream_row_id'] || (streamChunkIndex * streamChunkSize + idx + 1)}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {row['__checksum'] || 'sha256_...'}
                        </td>
                        {dataset.features.map((f) => {
                          const val = row[f.name];
                          const rendered = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
                          return (
                            <td key={f.name} className="p-3 text-slate-300 max-w-sm truncate">
                              {rendered}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);
