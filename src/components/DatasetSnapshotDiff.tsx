import React, { useState, useMemo } from 'react';
import {
  Camera,
  GitCompare,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  ArrowRight,
  ArrowLeftRight,
  Trash2,
  UploadCloud,
  Download,
  Plus,
  Minus,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  BookmarkCheck,
  Tag,
  BarChart2,
  HelpCircle,
  LogIn
} from 'lucide-react';
import { useFirebaseAuth, DatasetSnapshotRecord } from '../context/FirebaseAuthContext';

interface DatasetSnapshotDiffProps {
  currentDataset: {
    id: string;
    name: string;
    task: string;
    modality: string;
    num_rows: number;
    size: string;
    features: { name: string; type: string }[];
    sample_rows: any[];
  };
  selectedSnapshotId?: string | null;
  onSelectSnapshot?: (snapshot: DatasetSnapshotRecord) => void;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const DatasetSnapshotDiff: React.FC<DatasetSnapshotDiffProps> = ({
  currentDataset,
  selectedSnapshotId: propSelectedSnapshotId,
  onSelectSnapshot: propOnSelectSnapshot,
  onExportToHf
}) => {
  const { user, signInWithGoogle, datasetSnapshots, captureSnapshot, deleteSnapshot } = useFirebaseAuth();

  // Snapshot Capture Form State
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccessMessage, setCaptureSuccessMessage] = useState<string | null>(null);

  // Selected snapshot for comparison against current dataset
  const [internalSelectedSnapshotId, setInternalSelectedSnapshotId] = useState<string | null>(null);
  const selectedSnapshotId = propSelectedSnapshotId !== undefined ? propSelectedSnapshotId : internalSelectedSnapshotId;

  // Secondary snapshot for snapshot-to-snapshot comparison
  const [secondarySnapshotId, setSecondarySnapshotId] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'current_vs_snapshot' | 'snapshot_vs_snapshot'>('current_vs_snapshot');

  // Filter snapshots to current dataset or show all
  const [showAllDatasetsSnapshots, setShowAllDatasetsSnapshots] = useState(false);

  // Active diff subtab
  const [activeDiffSubtab, setActiveDiffSubtab] = useState<'summary' | 'schema' | 'rows'>('summary');
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  // Real snapshots fetched directly from Firestore - zero mocks!
  const datasetSnapshotsForCurrent = useMemo(() => {
    return showAllDatasetsSnapshots
      ? datasetSnapshots
      : datasetSnapshots.filter(s => s.datasetId === currentDataset.id);
  }, [datasetSnapshots, showAllDatasetsSnapshots, currentDataset.id]);

  // Auto-select latest snapshot for comparison if none selected
  const activeSelectedSnapshot = useMemo(() => {
    if (selectedSnapshotId) {
      return datasetSnapshotsForCurrent.find(s => s.id === selectedSnapshotId) || datasetSnapshotsForCurrent[0] || null;
    }
    return datasetSnapshotsForCurrent[0] || null;
  }, [selectedSnapshotId, datasetSnapshotsForCurrent]);

  const activeSecondarySnapshot = useMemo(() => {
    if (secondarySnapshotId) {
      return datasetSnapshotsForCurrent.find(s => s.id === secondarySnapshotId) || datasetSnapshotsForCurrent[1] || null;
    }
    return datasetSnapshotsForCurrent[1] || datasetSnapshotsForCurrent[0] || null;
  }, [secondarySnapshotId, datasetSnapshotsForCurrent]);

  // Handle Capture Snapshot
  const handleCaptureSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = snapshotLabel.trim() || `Snapshot at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (!user) {
      // Prompt user to sign in
      const proceed = confirm('Capturing snapshots to persistent Firestore cloud requires signing in with Google. Would you like to sign in now?');
      if (proceed) {
        signInWithGoogle();
      }
      return;
    }

    setIsCapturing(true);
    setCaptureSuccessMessage(null);

    try {
      // Calculate basic distribution stats from sample rows
      const textCol = currentDataset.features.find(f => f.type === 'string')?.name || Object.keys(currentDataset.sample_rows[0] || {})[0];
      const lengths = currentDataset.sample_rows.map(r => String(r[textCol] || '').length);
      const avgLen = lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;

      const newId = await captureSnapshot({
        datasetId: currentDataset.id,
        datasetName: currentDataset.name || currentDataset.id,
        label,
        numRows: currentDataset.num_rows,
        size: currentDataset.size,
        features: currentDataset.features,
        distributionMetrics: {
          avgLength: avgLen,
          modality: currentDataset.modality,
          task: currentDataset.task,
          sampleCount: currentDataset.sample_rows.length
        },
        sampleRows: currentDataset.sample_rows.slice(0, 50)
      });

      setInternalSelectedSnapshotId(newId);
      if (propOnSelectSnapshot) {
        propOnSelectSnapshot({
          id: newId,
          userId: user?.uid || '',
          datasetId: currentDataset.id,
          label,
          numRows: currentDataset.num_rows,
          createdAt: new Date().toISOString()
        });
      }
      setSnapshotLabel('');
      setCaptureSuccessMessage(`Snapshot "${label}" successfully saved to Firestore!`);
      setTimeout(() => setCaptureSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to capture snapshot:', err);
      alert(`Could not capture snapshot: ${err.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDeleteSnapshot = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete historical snapshot "${label}" from Firestore?`)) return;

    try {
      await deleteSnapshot(id);
      if (selectedSnapshotId === id) {
        setInternalSelectedSnapshotId(null);
      }
    } catch (err: any) {
      alert(`Failed to delete snapshot: ${err.message}`);
    }
  };

  // -------------------------------------------------------------------------
  // COMPUTE VISUAL DIFF
  // -------------------------------------------------------------------------
  const baseline = comparisonMode === 'current_vs_snapshot'
    ? activeSelectedSnapshot
    : activeSecondarySnapshot;

  const target = comparisonMode === 'current_vs_snapshot'
    ? {
        id: 'current-live-state',
        label: 'Current Live Dataset State',
        numRows: currentDataset.num_rows,
        size: currentDataset.size,
        features: currentDataset.features,
        distributionMetrics: {
          avgLength: Math.round(
            currentDataset.sample_rows.map(r => String(r.text || r.instruction || Object.values(r)[0] || '').length).reduce((a, b) => a + b, 0) / (currentDataset.sample_rows.length || 1)
          )
        },
        sampleRows: currentDataset.sample_rows,
        createdAt: new Date().toISOString()
      }
    : activeSelectedSnapshot;

  const rowCountDelta = target && baseline ? target.numRows - baseline.numRows : 0;
  const rowCountDeltaPct = baseline && baseline.numRows > 0
    ? ((rowCountDelta / baseline.numRows) * 100).toFixed(1)
    : '0.0';

  // Schema diff calculation
  const baselineFeatureNames = new Set((baseline?.features || []).map(f => f.name));
  const targetFeatureNames = new Set((target?.features || []).map(f => f.name));

  const addedColumns = (target?.features || []).filter(f => !baselineFeatureNames.has(f.name));
  const removedColumns = (baseline?.features || []).filter(f => !targetFeatureNames.has(f.name));
  const commonColumns = (target?.features || []).filter(f => baselineFeatureNames.has(f.name));

  const typeDriftColumns = commonColumns.filter(tf => {
    const bf = (baseline?.features || []).find(f => f.name === tf.name);
    return bf && bf.type !== tf.type;
  });

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* HEADER & CAPTURE CONTROLS */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Dataset State Snapshots & Visual Diff Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Firestore ABAC Secured
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Capture point-in-time dataset snapshots to persistent Firestore storage and diff schema drift, row mutations, and statistical distributions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!user && (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in for Cloud Sync</span>
              </button>
            )}

            {onExportToHf && (
              <button
                onClick={() => onExportToHf('dataset_diff', `Dataset Snapshot Visual Diff: ${currentDataset.id}`, {
                  dataset_id: currentDataset.id,
                  baseline_snapshot: baseline?.label,
                  target_snapshot: target?.label,
                  row_count_delta: rowCountDelta,
                  row_count_delta_pct: `${rowCountDeltaPct}%`,
                  added_columns: addedColumns,
                  removed_columns: removedColumns,
                  type_drift: typeDriftColumns
                }, currentDataset.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Export Diff to HF</span>
              </button>
            )}
          </div>
        </div>

        {/* Capture Current Snapshot Form */}
        <form onSubmit={handleCaptureSnapshot} className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder={`Snapshot label (e.g. "Pre-Cleaning Baseline", "Curated v1.2", "Split alpha")`}
              maxLength={100}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <button
            type="submit"
            disabled={isCapturing}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/15 flex items-center justify-center gap-2 whitespace-nowrap min-h-[38px]"
          >
            {isCapturing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <span>{isCapturing ? 'Saving to Firestore...' : 'Capture Snapshot'}</span>
          </button>
        </form>

        {captureSuccessMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{captureSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* HISTORICAL SNAPSHOTS SELECTOR & TIMELINE */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-slate-200">
              Saved Historical Snapshots ({datasetSnapshotsForCurrent.length})
            </h4>
            {user ? (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Firestore Connected ({user.email})
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Sign in with Google to read & sync Firestore
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Comparison Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setComparisonMode('current_vs_snapshot')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  comparisonMode === 'current_vs_snapshot'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live vs Snapshot
              </button>
              <button
                type="button"
                onClick={() => setComparisonMode('snapshot_vs_snapshot')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  comparisonMode === 'snapshot_vs_snapshot'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Snapshot A vs B
              </button>
            </div>

            {datasetSnapshots.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllDatasetsSnapshots(p => !p)}
                className={`px-2.5 py-1 text-xs rounded-xl border transition-colors ${
                  showAllDatasetsSnapshots
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {showAllDatasetsSnapshots ? 'Showing All Datasets' : 'Current Dataset Only'}
              </button>
            )}
          </div>
        </div>

        {/* Snapshot Cards Grid */}
        {datasetSnapshotsForCurrent.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <Database className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-300">No snapshots saved in Firestore for this dataset yet.</p>
            <p className="text-slate-400 text-[11px] max-w-md mx-auto">
              Use the capture form above or the history sidebar to create persistent point-in-time snapshots in Firestore.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {datasetSnapshotsForCurrent.map((snapshot) => {
              const isSelected = activeSelectedSnapshot?.id === snapshot.id;
              const isSecondary = activeSecondarySnapshot?.id === snapshot.id;

              return (
                <div
                  key={snapshot.id}
                  className={`p-4 rounded-xl border transition-all text-xs space-y-3 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5'
                      : isSecondary && comparisonMode === 'snapshot_vs_snapshot'
                      ? 'bg-indigo-500/10 border-indigo-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => {
                    if (comparisonMode === 'snapshot_vs_snapshot' && isSelected) {
                      setSecondarySnapshotId(snapshot.id);
                    } else {
                      setInternalSelectedSnapshotId(snapshot.id);
                      if (propOnSelectSnapshot) propOnSelectSnapshot(snapshot);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 truncate block text-sm">
                        {snapshot.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(snapshot.createdAt).toLocaleDateString()} at{' '}
                        {new Date(snapshot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] uppercase">
                          {comparisonMode === 'snapshot_vs_snapshot' ? 'Target (B)' : 'Comparing'}
                        </span>
                      )}
                      {isSecondary && comparisonMode === 'snapshot_vs_snapshot' && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-white font-bold text-[10px] uppercase">
                          Baseline (A)
                        </span>
                      )}
                      {user && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSnapshot(snapshot.id, snapshot.label);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Delete snapshot from Firestore"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rows</span>
                      <span className="font-bold text-slate-300">{snapshot.numRows.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Columns</span>
                      <span className="font-bold text-slate-300">{(snapshot.features || []).length} cols</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Size</span>
                      <span className="font-bold text-slate-300">{snapshot.size || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* VISUAL DIFF COMPARISON DASHBOARD */}
      {/* ----------------------------------------------------------------- */}
      {baseline && target && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Header comparison badge */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <GitCompare className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                    Baseline: {baseline.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Target: {target.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active visual diff computing schema changes, column deltas, and sample rows.
                </p>
              </div>
            </div>

            {/* Subtabs: Summary / Schema / Rows */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveDiffSubtab('summary')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  activeDiffSubtab === 'summary'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Delta Metrics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffSubtab('schema')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  activeDiffSubtab === 'schema'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Schema Drift ({addedColumns.length + removedColumns.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffSubtab('rows')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  activeDiffSubtab === 'rows'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Row Inspection</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: SUMMARY DELTA METRICS */}
          {/* ------------------------------------------------------------- */}
          {activeDiffSubtab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Row Count Delta */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Row Count Delta
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-100">
                      {rowCountDelta >= 0 ? `+${rowCountDelta.toLocaleString()}` : rowCountDelta.toLocaleString()}
                    </span>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                      rowCountDelta > 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : rowCountDelta < 0
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {rowCountDelta >= 0 ? `+${rowCountDeltaPct}%` : `${rowCountDeltaPct}%`}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                    <span>Base: {baseline.numRows.toLocaleString()}</span>
                    <span>Target: {target.numRows.toLocaleString()}</span>
                  </div>
                </div>

                {/* Schema Evolution */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Schema Drift
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-100">
                      {addedColumns.length + removedColumns.length}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">column changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono pt-1 border-t border-slate-800/80">
                    <span className="text-emerald-400">+{addedColumns.length} added</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-rose-400">-{removedColumns.length} removed</span>
                  </div>
                </div>

                {/* Avg Text Length Variance */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Mean String Length
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-100">
                      {target.distributionMetrics?.avgLength || 'N/A'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">chars / record</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                    Base: {baseline.distributionMetrics?.avgLength || 'N/A'} chars
                  </div>
                </div>

                {/* Storage Footprint */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Dataset Size
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-100">
                      {target.size || 'N/A'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                    Base: {baseline.size || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Visual Overview Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
                  Feature Column Preservation Ratio
                </h5>

                <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    title={`Unchanged Columns: ${commonColumns.length}`}
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${Math.round((commonColumns.length / Math.max((target.features || []).length, 1)) * 100)}%` }}
                  />
                  <div
                    title={`Added Columns: ${addedColumns.length}`}
                    className="bg-amber-400 h-full transition-all"
                    style={{ width: `${Math.round((addedColumns.length / Math.max((target.features || []).length, 1)) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>{commonColumns.length} Common Invariant Columns</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      <span>{addedColumns.length} Newly Introduced Columns</span>
                    </span>
                    {removedColumns.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        <span>{removedColumns.length} Pruned/Removed Columns</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: SCHEMA EVOLUTION MATRIX */}
          {/* ------------------------------------------------------------- */}
          {activeDiffSubtab === 'schema' && (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <th className="p-3">Column Name</th>
                      <th className="p-3">Baseline Type ({baseline.label.slice(0, 20)}...)</th>
                      <th className="p-3">Target Type ({target.label.slice(0, 20)}...)</th>
                      <th className="p-3">Status / Drift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {/* Added Columns */}
                    {addedColumns.map(col => (
                      <tr key={`add-${col.name}`} className="bg-emerald-950/10 hover:bg-emerald-950/20">
                        <td className="p-3 font-bold text-emerald-300 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{col.name}</span>
                        </td>
                        <td className="p-3 text-slate-500 italic">None (Not in baseline)</td>
                        <td className="p-3 text-emerald-400 font-bold">{col.type}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            NEW COLUMN
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Removed Columns */}
                    {removedColumns.map(col => (
                      <tr key={`rem-${col.name}`} className="bg-rose-950/10 hover:bg-rose-950/20">
                        <td className="p-3 font-bold text-rose-300 flex items-center gap-1.5">
                          <Minus className="w-3.5 h-3.5 text-rose-400" />
                          <span className="line-through">{col.name}</span>
                        </td>
                        <td className="p-3 text-rose-400">{col.type}</td>
                        <td className="p-3 text-slate-500 italic">Pruned (Not in target)</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            REMOVED
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Common Columns */}
                    {commonColumns.map(col => {
                      const baseCol = (baseline.features || []).find(f => f.name === col.name);
                      const hasTypeChange = baseCol && baseCol.type !== col.type;

                      return (
                        <tr key={`common-${col.name}`} className="hover:bg-slate-800/40">
                          <td className="p-3 text-slate-200 font-medium">
                            {col.name}
                          </td>
                          <td className="p-3 text-slate-400">{baseCol?.type || 'string'}</td>
                          <td className={`p-3 ${hasTypeChange ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                            {col.type}
                          </td>
                          <td className="p-3">
                            {hasTypeChange ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 w-max">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>TYPE DRIFT ({baseCol?.type} → {col.type})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                INVARIANT
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: SAMPLE ROW INSPECTION */}
          {/* ------------------------------------------------------------- */}
          {activeDiffSubtab === 'rows' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Inspecting Sample Records</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={selectedRowIndex === 0}
                    onClick={() => setSelectedRowIndex(p => Math.max(0, p - 1))}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-40"
                  >
                    Previous Row
                  </button>
                  <span className="px-2 text-slate-300">
                    Row #{selectedRowIndex + 1} of {Math.max((target.sampleRows || []).length, 1)}
                  </span>
                  <button
                    type="button"
                    disabled={selectedRowIndex >= Math.max(0, (target.sampleRows || []).length - 1)}
                    onClick={() => setSelectedRowIndex(p => p + 1)}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-40"
                  >
                    Next Row
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Baseline Row */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-indigo-400 font-mono">
                      Baseline: {baseline.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Record #{selectedRowIndex + 1}</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-3 rounded-lg overflow-x-auto max-h-80 whitespace-pre-wrap">
                    {JSON.stringify(baseline.sampleRows?.[selectedRowIndex] || { note: 'No sample row at this index' }, null, 2)}
                  </pre>
                </div>

                {/* Target Row */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      Target: {target.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Record #{selectedRowIndex + 1}</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-3 rounded-lg overflow-x-auto max-h-80 whitespace-pre-wrap">
                    {JSON.stringify(target.sampleRows?.[selectedRowIndex] || { note: 'No sample row at this index' }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
