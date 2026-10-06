import React, { useState } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Check,
  Plus,
  Zap,
  ShieldCheck,
  Cpu,
  Database
} from 'lucide-react';
import { BulkJob } from './PipelineOptimizer';

interface BatchQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnqueueBatch: (jobs: BulkJob[]) => void;
}

const PRESET_DATASETS = [
  { id: 'ouroboroscollective/ARE-rLOGIC-class', name: 'ARE rLOGIC Class (Formal Invariant)', task: 'Formal Reasoning', rows: 45000 },
  { id: 'ouroboroscollective/evidence-bound-css', name: 'Evidence-Bound CSS (Constraint Solvers)', task: 'CSS Layout', rows: 52000 },
  { id: 'Thorsu/sovereign-evidence-observatory', name: 'Sovereign Evidence Observatory (AST)', task: 'Logic Verifier', rows: 38000 },
  { id: 'ouroboroscollective/satoshi-evidence-atlas', name: 'Satoshi Evidence Atlas (Proofs)', task: 'Merkle Logic', rows: 60000 },
  { id: 'HuggingFaceFW/fineweb-edu', name: 'FineWeb-Edu (Educational Corpus)', task: 'Pre-Training', rows: 100000 },
  { id: 'tatsu-lab/alpaca', name: 'Stanford Alpaca (52k Instructions)', task: 'Instruction Tuning', rows: 52000 },
  { id: 'Open-Orca/OpenOrca', name: 'OpenOrca (Reasoning Augmentation)', task: 'Step-by-step CoT', rows: 80000 },
  { id: 'BAAI/Infinity-Instruct', name: 'Infinity-Instruct (Dialogue Pairs)', task: 'High-Quality SFT', rows: 75000 }
];

export const BatchQueueModal: React.FC<BatchQueueModalProps> = ({
  isOpen,
  onClose,
  onEnqueueBatch
}) => {
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([
    'ouroboroscollective/ARE-rLOGIC-class',
    'ouroboroscollective/evidence-bound-css'
  ]);
  const [customDatasetInput, setCustomDatasetInput] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<Array<'alpaca' | 'chatml' | 'llama3' | 'dpo'>>([
    'alpaca',
    'chatml'
  ]);
  const [deduplicate, setDeduplicate] = useState(true);
  const [cleanPii, setCleanPii] = useState(true);
  const [enableHighThinking, setEnableHighThinking] = useState(true);

  if (!isOpen) return null;

  const toggleDataset = (id: string) => {
    setSelectedDatasets(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleFormat = (fmt: 'alpaca' | 'chatml' | 'llama3' | 'dpo') => {
    setSelectedFormats(prev =>
      prev.includes(fmt)
        ? prev.length > 1 ? prev.filter(f => f !== fmt) : prev // keep at least 1
        : [...prev, fmt]
    );
  };

  const handleAddCustomDataset = () => {
    const trimmed = customDatasetInput.trim();
    if (trimmed && !selectedDatasets.includes(trimmed)) {
      setSelectedDatasets(prev => [...prev, trimmed]);
      setCustomDatasetInput('');
    }
  };

  const totalCalculatedJobs = selectedDatasets.length * selectedFormats.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDatasets.length === 0 || selectedFormats.length === 0) {
      alert('Please select at least one dataset and one target format.');
      return;
    }

    const newJobs: BulkJob[] = [];
    selectedDatasets.forEach((datasetId) => {
      selectedFormats.forEach((targetFormat) => {
        const preset = PRESET_DATASETS.find(p => p.id === datasetId);
        newJobs.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          datasetId,
          targetFormat,
          deduplicate,
          cleanPii,
          enableHighThinking,
          status: 'queued',
          progressPct: 0,
          stageName: 'Pending in Queue',
          processedRows: 0,
          totalRows: preset ? preset.rows : 45000,
          enqueuedAt: new Date().toISOString()
        });
      });
    });

    onEnqueueBatch(newJobs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Batch Processing Queue Builder</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Matrix Generator
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select multiple Hugging Face datasets and output schema formats to queue transformation batch jobs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Section 1: Choose Datasets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Select Datasets ({selectedDatasets.length} selected)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDatasets(PRESET_DATASETS.map(d => d.id))}
                  className="text-amber-400 hover:underline text-[11px] font-mono"
                >
                  Select All
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedDatasets([])}
                  className="text-slate-400 hover:underline text-[11px] font-mono"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {PRESET_DATASETS.map(ds => {
                const isChecked = selectedDatasets.includes(ds.id);
                return (
                  <div
                    key={ds.id}
                    onClick={() => toggleDataset(ds.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isChecked
                        ? 'bg-amber-500/10 border-amber-500/40 text-slate-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                      isChecked
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-[11px]">{ds.name}</p>
                      <p className="font-mono text-[10px] text-slate-500 truncate">{ds.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Dataset Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customDatasetInput}
                onChange={e => setCustomDatasetInput(e.target.value)}
                placeholder="Or add custom repo (e.g. meta-llama/Llama-3.2-3B)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="button"
                onClick={handleAddCustomDataset}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-xl border border-slate-700 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Section 2: Choose Schema Formats */}
          <div className="space-y-2">
            <label className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Select Target Formats ({selectedFormats.length} selected)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'alpaca' as const, name: 'Alpaca', desc: 'Instruction/Output' },
                { id: 'chatml' as const, name: 'ChatML', desc: 'OpenAI multi-turn' },
                { id: 'llama3' as const, name: 'Llama-3', desc: 'Header ID tags' },
                { id: 'dpo' as const, name: 'DPO', desc: 'Preference pairs' }
              ].map(fmt => {
                const isChecked = selectedFormats.includes(fmt.id);
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => toggleFormat(fmt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isChecked
                        ? 'bg-amber-500/10 border-amber-500/40 text-slate-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase font-mono">{fmt.name}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{fmt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Batch Optimization Rules */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
              3. Processing Pipeline Transformations
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={deduplicate}
                  onChange={e => setDeduplicate(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">MinHash Dedup</span>
                  <span className="text-[10px] text-slate-500">LSH sequence clustering</span>
                </div>
              </label>

              <label className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={cleanPii}
                  onChange={e => setCleanPii(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">PII Redaction</span>
                  <span className="text-[10px] text-slate-500">Mask keys, IP, emails</span>
                </div>
              </label>

              <label className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={enableHighThinking}
                  onChange={e => setEnableHighThinking(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">High Thinking</span>
                  <span className="text-[10px] text-slate-500">CoT reasoning augment</span>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-slate-400 font-mono text-[11px]">
              Matrix calculation: <strong className="text-amber-400">{selectedDatasets.length} datasets</strong> × <strong className="text-amber-400">{selectedFormats.length} formats</strong> = <strong className="text-slate-100">{totalCalculatedJobs} total batch jobs</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={totalCalculatedJobs === 0}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-amber-500/15 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Enqueue {totalCalculatedJobs} Batch Jobs</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
