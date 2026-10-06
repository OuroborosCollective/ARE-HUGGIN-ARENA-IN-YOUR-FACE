import React, { useState } from 'react';
import { X, ExternalLink, Download, Copy, Check, UploadCloud, FileCode, CheckCircle2, RefreshCw, Database, Terminal, ShieldCheck, GitPullRequest, GitBranch, Layers } from 'lucide-react';
import { HfCredentials } from './HfCredentialsModal';
import { downloadParquetFile } from '../utils/parquetExporter';

export interface HfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'arena_match' | 'arena_tournament' | 'pipeline_optimization' | 'synthetic_dataset' | 'auto_tagging' | 'dataset_diff' | 'css_evidence_bound' | 'sovereign_passport';
  title: string;
  payload: any;
  credentials: HfCredentials;
  onOpenCredentials: () => void;
  defaultTargetRepo?: string;
}

export const HfExportModal: React.FC<HfExportModalProps> = ({
  isOpen,
  onClose,
  actionType,
  title,
  payload,
  credentials,
  onOpenCredentials,
  defaultTargetRepo
}) => {
  const [targetRepo, setTargetRepo] = useState(
    defaultTargetRepo || credentials.targetRepo || 'ouroboroscollective/evidence-bound-css'
  );
  const [workflowMode, setWorkflowMode] = useState<'commit_direct' | 'pr_proposal' | 'branch_draft'>('commit_direct');
  const [exportFormat, setExportFormat] = useState<'parquet' | 'jsonl' | 'json'>('parquet');
  const [commitMessage, setCommitMessage] = useState(
    `[HF MCP Studio] Export ${actionType} artifacts to ${targetRepo || 'ouroboroscollective/evidence-bound-css'}`
  );
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'commit' | 'python' | 'preview'>('commit');

  if (!isOpen) return null;

  const datasetUrl = `https://huggingface.co/datasets/${targetRepo || 'ouroboroscollective/evidence-bound-css'}`;

  const handlePushToHub = async () => {
    setIsCommitting(true);
    try {
      const res = await fetch('/api/hf/export-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          target_repo: targetRepo,
          hf_token: credentials.token,
          commit_message: commitMessage,
          workflow_mode: workflowMode,
          payload
        })
      });

      const data = await res.json();
      setCommitResult(data);
    } catch (err: any) {
      alert('Error committing to Hugging Face Hub: ' + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadParquet = () => {
    const rows = Array.isArray(payload) ? payload : (payload.transformed_rows ? payload.transformed_rows : [payload]);
    downloadParquetFile({
      datasetName: targetRepo || 'ouroboroscollective/evidence-bound-css',
      split: 'train',
      rows
    });
  };

  const handleDownloadFile = () => {
    if (exportFormat === 'parquet') {
      handleDownloadParquet();
      return;
    }

    const isArray = Array.isArray(payload);
    let content = '';
    let fileExt = 'json';

    if (actionType === 'auto_tagging' && payload?.hf_yaml_metadata) {
      content = payload.hf_yaml_metadata;
      fileExt = 'yaml';
    } else if (isArray || exportFormat === 'jsonl') {
      const rows = isArray ? payload : [payload];
      content = rows.map((row: any) => JSON.stringify(row)).join('\n');
      fileExt = 'jsonl';
    } else {
      content = JSON.stringify(payload, null, 2);
      fileExt = 'json';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hf_export_${actionType}_${Date.now()}.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyPython = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const pythonSnippet = commitResult?.commit_record?.python_snippet || `from huggingface_hub import HfApi
import json

# Initialize Hugging Face API Client with your write token
api = HfApi(${credentials.token ? `token="${credentials.token.substring(0, 7)}***"` : ''})

data = ${JSON.stringify(payload, null, 2).slice(0, 500)}...

# Upload artifact directly to dataset repository
api.upload_file(
    path_or_fileobj="export_${actionType}.parquet",
    path_in_repo="data/${actionType}/train.parquet",
    repo_id="${targetRepo}",
    repo_type="dataset",
    commit_message="${commitMessage}"
)
print("Uploaded to Hugging Face: ${datasetUrl}")
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-xs shrink-0">
              HF
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 truncate">
                Export & Forward to Hugging Face
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                {title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-xl hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs (Touch-To-Scroll) */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-800/80 bg-slate-950/40 text-xs shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('commit')}
            className={`pb-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeTab === 'commit'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Commit & Workflow</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`pb-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeTab === 'python'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Python Script (HfApi)</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${
              activeTab === 'preview'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Payload Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs touch-pan-y">
          {/* Target Hugging Face Dataset Card */}
          <div className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Destination Hugging Face Dataset
              </span>
              <button
                onClick={onOpenCredentials}
                className="text-[11px] text-amber-400 hover:underline font-mono min-h-[36px] flex items-center"
              >
                {credentials.token ? 'Key: Configured' : 'Configure Login Key / PW'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={targetRepo}
                onChange={(e) => setTargetRepo(e.target.value)}
                placeholder="ouroboroscollective/evidence-bound-css"
                className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 min-h-[44px]"
              />
              <a
                href={datasetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 transition-colors font-semibold shrink-0 min-h-[44px]"
              >
                <span>Open on HF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {targetRepo === 'ouroboroscollective/evidence-bound-css' && (
              <div className="text-[11px] text-amber-300/80 bg-amber-950/20 px-3 py-2 rounded-xl border border-amber-900/30 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Anchoring artifact directly into canonical Ouroboros evidence-bound-css dataset.</span>
              </div>
            )}
          </div>

          {activeTab === 'commit' && (
            <div className="space-y-4">
              {/* Proposal 5: HF Workflow Mode (Commit vs Community PR) */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Hugging Face Workflow Mode:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkflowMode('commit_direct')}
                    className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] flex items-center gap-2 ${
                      workflowMode === 'commit_direct'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">Direct Commit</p>
                      <p className="text-[10px] text-slate-500">Push to main</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkflowMode('pr_proposal')}
                    className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] flex items-center gap-2 ${
                      workflowMode === 'pr_proposal'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <GitPullRequest className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">Community PR</p>
                      <p className="text-[10px] text-slate-500">Open Discussion PR</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkflowMode('branch_draft')}
                    className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] flex items-center gap-2 ${
                      workflowMode === 'branch_draft'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <GitBranch className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">Feature Branch</p>
                      <p className="text-[10px] text-slate-500">Draft branch commit</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Commit Message Input */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Commit Message / PR Title:</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200 min-h-[44px]"
                />
              </div>

              {commitResult ? (
                <div className="p-4 bg-emerald-950/40 border border-emerald-700/50 rounded-xl space-y-2 text-emerald-300 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-xs">{commitResult.message}</span>
                  </div>
                  <div className="text-[11px] font-mono space-y-1 pt-1 text-slate-300">
                    <p>Commit Hash: <strong className="text-amber-300">{commitResult.commit_record?.commit_hash}</strong></p>
                    <p>File Path: <strong className="text-slate-200">{commitResult.commit_record?.file_path}</strong></p>
                    <p>Timestamp: <strong className="text-slate-400">{commitResult.commit_record?.timestamp}</strong></p>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={commitResult.commit_record?.commit_url || datasetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm min-h-[44px]"
                    >
                      <span>View {workflowMode === 'pr_proposal' ? 'PR Discussion' : 'Commit'} on Hugging Face</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={datasetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs flex items-center gap-1.5 min-h-[44px]"
                    >
                      <span>View Full Dataset</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    onClick={handlePushToHub}
                    disabled={isCommitting}
                    className="w-full sm:flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 min-h-[44px] active:scale-95"
                  >
                    <UploadCloud className={`w-4 h-4 ${isCommitting ? 'animate-bounce' : ''}`} />
                    <span>
                      {isCommitting
                        ? 'Executing HF Hub Workflow...'
                        : workflowMode === 'pr_proposal'
                        ? 'Open Community PR on Hugging Face'
                        : 'Commit & Push to Hugging Face Hub'}
                    </span>
                  </button>

                  <a
                    href={datasetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <span>Forward to Dataset</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'python' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Reproducible Python code via <code>huggingface_hub</code>:</span>
                <button
                  onClick={() => handleCopyPython(pythonSnippet)}
                  className="text-amber-400 hover:underline flex items-center gap-1 min-h-[36px]"
                >
                  {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet ? 'Copied Script' : 'Copy Python Snippet'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-200/90 max-h-60 overflow-auto leading-relaxed">
                {pythonSnippet}
              </pre>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Export payload preview:</span>
                <button
                  onClick={handleCopyJson}
                  className="text-amber-400 hover:underline flex items-center gap-1 min-h-[36px]"
                >
                  {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedJson ? 'Copied Payload' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-60 overflow-auto leading-relaxed">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer (Touch-Optimized) */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadParquet}
              title="Download client-side binary Apache Arrow / Parquet file"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors min-h-[44px]"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download .parquet</span>
            </button>

            <button
              onClick={handleDownloadFile}
              title="Download JSON / JSONL format"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors min-h-[44px]"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>JSONL</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

