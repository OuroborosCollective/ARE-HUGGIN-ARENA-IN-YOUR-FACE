import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileCode, Download, Terminal } from 'lucide-react';

interface ScriptExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
}

export const ScriptExportModal: React.FC<ScriptExportModalProps> = ({ isOpen, onClose, datasetId }) => {
  const [framework, setFramework] = useState<'trl_sft' | 'trl_dpo' | 'unsloth'>('trl_sft');
  const [modelId, setModelId] = useState('meta-llama/Llama-3.1-8B-Instruct');
  const [script, setScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchScript = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/export/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: datasetId,
          model_id: modelId,
          framework
        })
      });
      const data = await res.json();
      setScript(data.script || '');
    } catch (err) {
      console.error('Failed to generate script:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScript();
    }
  }, [isOpen, framework, modelId, datasetId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-slate-100">Export Fine-Tuning Code Script</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Training Library / Framework:</label>
              <select
                value={framework}
                onChange={(e: any) => setFramework(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="trl_sft">Hugging Face TRL SFTTrainer</option>
                <option value="trl_dpo">Hugging Face TRL DPOTrainer (Preference)</option>
                <option value="unsloth">Unsloth 2x Faster LoRA</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Base Model Repo:</label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          <div className="relative group">
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-amber-200/90 overflow-x-auto max-h-80 leading-relaxed">
              {loading ? 'Generating script...' : script}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Python Script</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
            <span className="font-mono">Dataset: {datasetId}</span>
            <span className="font-mono text-amber-400">python train_{framework}.py</span>
          </div>
        </div>
      </div>
    </div>
  );
};
