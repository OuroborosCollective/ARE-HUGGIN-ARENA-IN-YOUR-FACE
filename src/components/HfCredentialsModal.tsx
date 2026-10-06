import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Check, Copy, ExternalLink, RefreshCw, Database, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface HfCredentials {
  token: string;
  username: string;
  targetRepo: string;
  defaultBranch: string;
  isValidated: boolean;
  statusMessage: string;
}

interface HfCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: HfCredentials;
  onSaveCredentials: (newCreds: HfCredentials) => void;
}

export const HfCredentialsModal: React.FC<HfCredentialsModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSaveCredentials,
}) => {
  const [token, setToken] = useState(credentials.token);
  const [username, setUsername] = useState(credentials.username || 'ouroboroscollective');
  const [targetRepo, setTargetRepo] = useState(credentials.targetRepo || 'ouroboroscollective/evidence-bound-css');
  const [defaultBranch, setDefaultBranch] = useState(credentials.defaultBranch || 'main');
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    repo_url?: string;
  } | null>(null);

  useEffect(() => {
    setToken(credentials.token);
    setUsername(credentials.username || 'ouroboroscollective');
    setTargetRepo(credentials.targetRepo || 'ouroboroscollective/evidence-bound-css');
    setDefaultBranch(credentials.defaultBranch || 'main');
    setTestResult(null);
  }, [credentials, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/hf/validate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hf_token: token,
          target_repo: targetRepo
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.username && data.username !== 'hf_authenticated_user' && data.username !== 'ouroboros_agent') {
        setUsername(data.username);
      }
    } catch (err: any) {
      setTestResult({
        valid: false,
        message: 'Connection test failed: ' + err.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const isVal = testResult ? testResult.valid : (token.trim().length > 0);
    const msg = testResult ? testResult.message : (token.trim().length > 0 ? 'Credentials configured' : 'Public reader mode');
    onSaveCredentials({
      token: token.trim(),
      username: username.trim() || 'ouroboroscollective',
      targetRepo: targetRepo.trim() || 'ouroboroscollective/evidence-bound-css',
      defaultBranch: defaultBranch.trim() || 'main',
      isValidated: isVal,
      statusMessage: msg
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-xs shrink-0">
              HF
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Hugging Face Hub Settings & Authentication
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure your HF API Write Key or Token to export & forward actions directly to Hugging Face
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto touch-scroll-y flex-1">
          {/* Target Dataset Quick Banner */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                Primary Evidence Boundary Dataset
              </span>
              <p className="text-slate-200 font-mono font-semibold text-xs">
                ouroboroscollective/evidence-bound-css
              </p>
            </div>
            <a
              href="https://huggingface.co/datasets/ouroboroscollective/evidence-bound-css"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg border border-slate-700 transition-colors shrink-0 text-[11px]"
            >
              <span>View on HF Hub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hugging Face Access Token / Write Key / Password</span>
                </label>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Token (Write)</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Your token is securely stored in your browser session/localStorage and used to commit evidence receipts and dataset transforms to Hugging Face Hub.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Hugging Face Username / Org:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ouroboroscollective"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Default Target Repository:</label>
                <input
                  type="text"
                  value={targetRepo}
                  onChange={(e) => setTargetRepo(e.target.value)}
                  placeholder="ouroboroscollective/evidence-bound-css"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Target Git Branch:</label>
              <input
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200"
              />
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-1">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>{testing ? 'Testing HF Hub Credentials...' : 'Test Hugging Face Hub Connection'}</span>
            </button>

            {testResult && (
              <div className={`mt-2.5 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.valid
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
              }`}>
                {testResult.valid ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.repo_url && (
                    <a
                      href={testResult.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[11px] block text-slate-300 hover:text-white"
                    >
                      Target Repo: {testResult.repo_url}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Encrypted client-side storage</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md shadow-amber-500/10 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
