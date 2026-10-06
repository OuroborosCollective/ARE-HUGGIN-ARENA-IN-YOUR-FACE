import React, { useState, useEffect } from 'react';
import { GitCompare, ArrowRight, ArrowLeftRight, CheckCircle2, Plus, Minus, AlertCircle, Sparkles, RefreshCw, Layers, BarChart3, Database, UploadCloud, ExternalLink } from 'lucide-react';

interface DatasetDiffViewerProps {
  datasetId: string;
  onExportToHf?: (actionType: 'dataset_diff', title: string, payload: any, defaultRepo?: string) => void;
}

export const DatasetDiffViewer: React.FC<DatasetDiffViewerProps> = ({ datasetId, onExportToHf }) => {
  const [diffData, setDiffData] = useState<any | null>(null);
  const [versionAId, setVersionAId] = useState<string>('v1.0-raw');
  const [versionBId, setVersionBId] = useState<string>('v2.0-curated');
  const [loading, setLoading] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const fetchDiff = async (vA?: string, vB?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/datasets/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: datasetId,
          version_a_id: vA || versionAId,
          version_b_id: vB || versionBId,
          run_ai_analysis: true
        })
      });

      const data = await res.json();
      setDiffData(data);
      if (data.available_versions && data.available_versions.length >= 2) {
        if (!vA && !vB) {
          setVersionAId(data.available_versions[0].id);
          setVersionBId(data.available_versions[1].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dataset diff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiff();
  }, [datasetId]);

  const handleSwap = () => {
    const tempA = versionAId;
    const tempB = versionBId;
    setVersionAId(tempB);
    setVersionBId(tempA);
    fetchDiff(tempB, tempA);
  };

  const handleVersionChange = (newA: string, newB: string) => {
    setVersionAId(newA);
    setVersionBId(newB);
    fetchDiff(newA, newB);
  };

  if (!diffData && loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
        <span>Computing side-by-side dataset distribution & schema diff...</span>
      </div>
    );
  }

  const { version_a, version_b, schema_diff, distribution_delta, ai_analysis, available_versions } = diffData || {};

  return (
    <div className="space-y-6">
      {/* Control Header & Version Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Side-by-Side Dataset Version & Subset Diff
              </h3>
              <p className="text-xs text-slate-400">
                Comparing schema drift, sequence length variance, and data distributions between dataset versions or training splits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onExportToHf && (
              <button
                onClick={() => onExportToHf('dataset_diff', `Diff Comparison: ${datasetId} (${versionAId} vs ${versionBId})`, diffData, datasetId)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Export Diff to HF Dataset</span>
              </button>
            )}

            <a
              href={`https://huggingface.co/datasets/${datasetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors"
            >
              <span>View on HF Hub</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => fetchDiff()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Recalculate Diff</span>
            </button>
          </div>
        </div>

        {/* Version Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center pt-2 border-t border-slate-800">
          {/* Version A */}
          <div className="md:col-span-5 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              Version / Split A (Baseline)
            </span>
            <select
              value={versionAId}
              onChange={(e) => handleVersionChange(e.target.value, versionBId)}
              className="w-full bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-700/80 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              {(available_versions || []).map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={handleSwap}
              title="Swap Version A and Version B"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 transition-colors shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Version B */}
          <div className="md:col-span-5 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              Version / Split B (Target / Curated)
            </span>
            <select
              value={versionBId}
              onChange={(e) => handleVersionChange(versionAId, e.target.value)}
              className="w-full bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-700/80 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              {(available_versions || []).map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* High-level Metric Deltas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Row count delta */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <span className="text-[11px] text-slate-400">Total Records Delta</span>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold font-mono text-slate-100">
              {version_b?.num_rows?.toLocaleString()}
            </p>
            <span className={`text-xs font-mono font-semibold ${
              distribution_delta?.rows_delta < 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              ({distribution_delta?.rows_delta_pct})
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {version_a?.num_rows?.toLocaleString()} in Version A
          </p>
        </div>

        {/* Avg Length Delta */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <span className="text-[11px] text-slate-400">Avg Sequence Length</span>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold font-mono text-slate-100">
              {version_b?.avg_length} <span className="text-xs text-slate-500 font-sans">ch</span>
            </p>
            <span className="text-xs font-mono font-semibold text-indigo-400">
              {distribution_delta?.avg_length_delta >= 0 ? `+${distribution_delta?.avg_length_delta}` : distribution_delta?.avg_length_delta} ch
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Baseline was {version_a?.avg_length} chars
          </p>
        </div>

        {/* Null Rate Delta */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <span className="text-[11px] text-slate-400">Missing / Null Rate</span>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold font-mono text-emerald-400">
              {version_b?.null_rate}
            </p>
            <span className="text-xs font-mono text-emerald-300">Cleaned</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Was {version_a?.null_rate} in Version A
          </p>
        </div>

        {/* Quality Score Delta */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <span className="text-[11px] text-slate-400">Quality Score Delta</span>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold font-mono text-amber-300">
              {version_b?.quality_score}/100
            </p>
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {distribution_delta?.quality_gain} pts
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Version A was {version_a?.quality_score}/100
          </p>
        </div>
      </div>

      {/* AI Data Drift & Training Impact Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-slate-200">AI Data Drift & Model Training Impact Assessment</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
          {ai_analysis}
        </p>
      </div>

      {/* Side-by-Side Schema & Feature Diff */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-slate-100">Schema Feature Field Diff</h4>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Plus className="w-3 h-3" />
              {schema_diff?.added_features?.length || 0} Added
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <Minus className="w-3 h-3" />
              {schema_diff?.removed_features?.length || 0} Removed
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              {schema_diff?.shared_features?.length || 0} Shared
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version A Schema */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
            <span className="text-xs font-mono font-semibold text-slate-400 block pb-2 border-b border-slate-800">
              Version A Schema ({version_a?.name}):
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(version_a?.features || []).map((f: any) => {
                const isRemoved = schema_diff?.removed_features?.some((r: any) => r.name === f.name);
                return (
                  <div
                    key={f.name}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono ${
                      isRemoved
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isRemoved && <Minus className="w-3 h-3 text-rose-400" />}
                      <span>{f.name}</span>
                    </span>
                    <span className="text-[11px] text-slate-500">{f.type}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Version B Schema */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
            <span className="text-xs font-mono font-semibold text-slate-400 block pb-2 border-b border-slate-800">
              Version B Schema ({version_b?.name}):
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(version_b?.features || []).map((f: any) => {
                const isAdded = schema_diff?.added_features?.some((a: any) => a.name === f.name);
                return (
                  <div
                    key={f.name}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono ${
                      isAdded
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isAdded && <Plus className="w-3 h-3 text-emerald-400" />}
                      <span>{f.name}</span>
                    </span>
                    <span className="text-[11px] text-slate-500">{f.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Distribution Shift Histogram */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-slate-100">Sequence Length Distribution Shift</h4>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-slate-600 inline-block" />
              <span>Version A</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
              <span>Version B</span>
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {(distribution_delta?.bins || []).map((bin: any, idx: number) => {
            const maxVal = Math.max(...(distribution_delta?.bins || []).map((b: any) => Math.max(b.count_a, b.count_b)), 1);
            const pctA = Math.round((bin.count_a / maxVal) * 100);
            const pctB = Math.round((bin.count_b / maxVal) * 100);

            return (
              <div key={idx} className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">{bin.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">{bin.count_a.toLocaleString()} samples</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-amber-300 font-semibold">{bin.count_b.toLocaleString()} samples</span>
                    <span className={`text-[11px] ${bin.delta < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ({bin.delta >= 0 ? `+${bin.delta}` : bin.delta})
                    </span>
                  </div>
                </div>

                {/* Comparative Dual Bars */}
                <div className="space-y-1">
                  {/* Bar A */}
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-600 rounded-full"
                      style={{ width: `${Math.max(pctA, 3)}%` }}
                    />
                  </div>
                  {/* Bar B */}
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                      style={{ width: `${Math.max(pctB, 3)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Record Sample Diff */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-slate-100">Side-by-Side Sample Record Comparison</h4>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {[0, 1].map((idx) => (
              <button
                key={idx}
                onClick={() => setSelectedRowIndex(idx)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedRowIndex === idx
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sample #{idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row from Version A */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono">
              <span className="text-slate-400 font-semibold">Version A Record:</span>
              <span className="text-rose-400">Raw / Unfiltered</span>
            </div>

            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              {JSON.stringify(version_a?.sample_rows?.[selectedRowIndex] || {}, null, 2)}
            </pre>
          </div>

          {/* Row from Version B */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono">
              <span className="text-slate-400 font-semibold">Version B Record:</span>
              <span className="text-emerald-400">Curated & Verified</span>
            </div>

            <pre className="text-xs font-mono text-amber-200/90 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              {JSON.stringify(version_b?.sample_rows?.[selectedRowIndex] || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
