import React, { useState, useEffect } from 'react';
import { Tag, X, Sparkles, Copy, Check, Hash, FileCode, CheckCircle2, RefreshCw, UploadCloud, ExternalLink } from 'lucide-react';

interface AutoTaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  onExportToHf?: (actionType: 'auto_tagging', title: string, payload: any, defaultRepo?: string) => void;
}

export const AutoTaggingModal: React.FC<AutoTaggingModalProps> = ({ isOpen, onClose, datasetId, onExportToHf }) => {
  const [loading, setLoading] = useState(false);
  const [tagData, setTagData] = useState<any | null>(null);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/datasets/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetId })
      });
      const data = await res.json();
      setTagData(data);
    } catch (err) {
      console.error('Failed to auto-tag dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen, datasetId]);

  if (!isOpen) return null;

  const handleCopyYaml = () => {
    if (!tagData?.hf_yaml_metadata) return;
    navigator.clipboard.writeText(tagData.hf_yaml_metadata);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const handleCopyTags = () => {
    if (!tagData?.domain_tags) return;
    navigator.clipboard.writeText(tagData.domain_tags.join(', '));
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Copilot Automated Metadata Tagging
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Analyzing schema & content for: <strong className="text-slate-200 font-mono">{datasetId}</strong></span>
            <button
              onClick={fetchTags}
              disabled={loading}
              className="flex items-center gap-1 text-amber-400 hover:underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-mono bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Data Copilot is analyzing dataset features and extracting tags...</span>
            </div>
          ) : tagData ? (
            <div className="space-y-4">
              {/* Content Summary */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  Executive Content Summary
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {tagData.content_summary}
                </p>
              </div>

              {/* Suggested Domain Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    Domain & Focus Tags
                  </span>
                  <button
                    onClick={handleCopyTags}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {copiedTags ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedTags ? 'Copied Tags' : 'Copy All'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(tagData.domain_tags || []).map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs rounded-lg flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-slate-500" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Task Categories & Target Training */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                    Task Categories
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {(tagData.task_categories || []).map((cat: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{cat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                    Recommended Fine-Tuning
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {(tagData.recommended_training_targets || []).map((target: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{target}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Hugging Face README YAML frontmatter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    Hugging Face README.md YAML Header
                  </span>
                  <div className="flex items-center gap-2">
                    {onExportToHf && (
                      <button
                        onClick={() => onExportToHf('auto_tagging', `Hugging Face Dataset Card Metadata: ${datasetId}`, tagData, datasetId)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>Push to HF Dataset</span>
                      </button>
                    )}
                    <button
                      onClick={handleCopyYaml}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                    >
                      {copiedYaml ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedYaml ? 'Copied' : 'Copy YAML'}</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-amber-200/90 max-h-36 overflow-auto">
                  {tagData.hf_yaml_metadata}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs font-mono">
              Could not generate tags. Click "Regenerate" to try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
