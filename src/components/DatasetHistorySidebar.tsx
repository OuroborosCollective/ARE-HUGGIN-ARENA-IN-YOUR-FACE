import React, { useState } from 'react';
import {
  History,
  Camera,
  GitCompare,
  Trash2,
  Clock,
  Database,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  LogIn,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useFirebaseAuth, DatasetSnapshotRecord } from '../context/FirebaseAuthContext';

interface DatasetHistorySidebarProps {
  currentDataset: {
    id: string;
    name: string;
    num_rows: number;
    features: { name: string; type: string }[];
    sample_rows: any[];
    size: string;
    task: string;
    modality: string;
  };
  selectedSnapshotId: string | null;
  onSelectSnapshot: (snapshot: DatasetSnapshotRecord) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DatasetHistorySidebar: React.FC<DatasetHistorySidebarProps> = ({
  currentDataset,
  selectedSnapshotId,
  onSelectSnapshot,
  isOpen,
  onToggle
}) => {
  const { user, signInWithGoogle, datasetSnapshots, captureSnapshot, deleteSnapshot } = useFirebaseAuth();

  const [filterScope, setFilterScope] = useState<'current' | 'all'>('current');
  const [newLabelInput, setNewLabelInput] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Real snapshots fetched from Firestore - no mock!
  const filteredSnapshots = datasetSnapshots.filter(s =>
    filterScope === 'current' ? s.datasetId === currentDataset.id : true
  );

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const proceed = confirm('Please sign in with Google to save persistent snapshots to Firestore (ai-studio-huggingfacemcpda-1c6e7eb6-b827-4f11-8aa2-ffab4cf7d7e5). Sign in now?');
      if (proceed) signInWithGoogle();
      return;
    }

    const label = newLabelInput.trim() || `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setIsCapturing(true);
    try {
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

      setNewLabelInput('');
      setFeedbackMsg(`Snapshot "${label}" saved to Firestore!`);
      setTimeout(() => setFeedbackMsg(null), 3000);

      // Auto-select for comparison
      const savedObj = datasetSnapshots.find(s => s.id === newId);
      if (savedObj) {
        onSelectSnapshot(savedObj);
      }
    } catch (err: any) {
      alert(`Capture failed: ${err.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete snapshot "${label}" from Firestore?`)) return;
    try {
      await deleteSnapshot(id);
    } catch (err: any) {
      alert(`Failed to delete snapshot: ${err.message}`);
    }
  };

  return (
    <div
      className={`transition-all duration-300 ease-in-out shrink-0 ${
        isOpen ? 'w-full md:w-80 lg:w-96' : 'w-12'
      }`}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl h-full flex flex-col overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-950/60">
          {isOpen ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                <History className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-100 truncate">
                    Firestore Snapshots
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {filteredSnapshots.length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  ai-studio-huggingfacemcpda-1c6e7eb6
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <History className="w-4 h-4 text-amber-400" />
            </div>
          )}

          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={isOpen ? 'Collapse Snapshot Sidebar' : 'Expand Snapshot Sidebar'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {isOpen && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3 p-3.5">
            {/* Real Firestore Status Banner */}
            {!user ? (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <p className="text-[11px] text-slate-400 leading-tight">
                  Sign in with Google to read and save persistent dataset snapshots to Firestore.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Firestore Readback</span>
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user.email?.split('@')[0]}
                </span>
              </div>
            )}

            {/* Quick Capture Input Form */}
            <form onSubmit={handleCapture} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newLabelInput}
                  onChange={e => setNewLabelInput(e.target.value)}
                  placeholder={`Label (e.g. "Pre-Deduplication")`}
                  maxLength={100}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
                <button
                  type="submit"
                  disabled={isCapturing}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
                  title="Capture current dataset state and save to Firestore"
                >
                  {isCapturing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>Capture</span>
                </button>
              </div>

              {feedbackMsg && (
                <p className="text-[11px] font-mono text-emerald-400 animate-in fade-in">
                  {feedbackMsg}
                </p>
              )}
            </form>

            {/* Filter Scope Controls */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400 font-mono">Scope:</span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterScope('current')}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold transition-colors ${
                    filterScope === 'current'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  This Dataset
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('all')}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold transition-colors ${
                    filterScope === 'all'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Datasets ({datasetSnapshots.length})
                </button>
              </div>
            </div>

            {/* Snapshots Scrollable List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 touch-scroll-y min-h-0">
              {filteredSnapshots.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <Database className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-400">No Firestore snapshots saved yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Click "Capture" above to save the current dataset state directly to your Firestore database.
                  </p>
                </div>
              ) : (
                filteredSnapshots.map(snap => {
                  const isSelected = selectedSnapshotId === snap.id;
                  const rowDelta = currentDataset.num_rows - snap.numRows;

                  return (
                    <div
                      key={snap.id}
                      onClick={() => onSelectSnapshot(snap)}
                      className={`p-3 rounded-xl border transition-all text-xs cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-200 truncate block text-xs">
                            {snap.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(snap.createdAt).toLocaleDateString()} at{' '}
                            {new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(snap.id, snap.label);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Delete from Firestore"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-500 block">Rows:</span>
                          <span className="font-bold text-slate-300">
                            {snap.numRows.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Delta vs Current:</span>
                          <span className={`font-bold ${
                            rowDelta > 0
                              ? 'text-emerald-400'
                              : rowDelta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}>
                            {rowDelta > 0 ? `+${rowDelta.toLocaleString()}` : rowDelta < 0 ? rowDelta.toLocaleString() : 'Identical'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                        <span className="text-slate-500">
                          {(snap.features || []).length} features
                        </span>

                        <span className={`font-semibold flex items-center gap-1 ${
                          isSelected ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                        }`}>
                          <GitCompare className="w-3 h-3" />
                          <span>{isSelected ? 'Active Comparison' : 'Select & Compare'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
