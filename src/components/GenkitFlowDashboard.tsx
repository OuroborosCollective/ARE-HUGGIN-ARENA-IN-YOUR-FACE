import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow,
  Cpu,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Layers,
  Database,
  ArrowRight,
  Code2,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Activity,
  Terminal,
  FileText
} from 'lucide-react';

interface GenkitFlowStep {
  name: string;
  description: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED';
  durationMs: number;
  tokensUsed: number;
  outputSummary: string;
}

interface GenkitFlowRun {
  id: string;
  flowName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  totalTokens: number;
  inputPayload: any;
  outputPayload: any;
  steps: GenkitFlowStep[];
}

interface RegisteredFlow {
  id: string;
  name: string;
  description: string;
  category: string;
  model: string;
  stepsCount: number;
  avgLatencyMs: number;
  steps: Array<{ id: string; name: string; promptRole: string }>;
}

interface GenkitMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgLatencyMs: number;
  totalTokensConsumed: number;
  activeModel: string;
  uptimeSeconds: number;
}

interface GenkitFlowDashboardProps {
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const GenkitFlowDashboard: React.FC<GenkitFlowDashboardProps> = ({ onExportToHf }) => {
  const [flows, setFlows] = useState<RegisteredFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState('dataset-enrichment-flow');
  const [recentRuns, setRecentRuns] = useState<GenkitFlowRun[]>([]);
  const [metrics, setMetrics] = useState<GenkitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // Custom Input for Flow Run
  const [inputDatasetName, setInputDatasetName] = useState('ouroboroscollective/ARE-rLOGIC-class');
  const [activeRunResult, setActiveRunResult] = useState<GenkitFlowRun | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const fetchFlowsAndMetrics = async () => {
    try {
      const [flowsRes, metricsRes] = await Promise.all([
        fetch('/api/genkit/flows'),
        fetch('/api/genkit/metrics')
      ]);

      if (flowsRes.ok) {
        const data = await flowsRes.json();
        setFlows(data.flows || []);
        setRecentRuns(data.recentRuns || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
    } catch (err) {
      console.warn('Failed fetching Genkit telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowsAndMetrics();
    const interval = setInterval(fetchFlowsAndMetrics, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteFlow = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/genkit/run-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId: selectedFlowId,
          input: {
            datasetName: inputDatasetName,
            triggeredAt: new Date().toISOString()
          }
        })
      });

      const data = await res.json();
      if (data.success && data.run) {
        setActiveRunResult(data.run);
        setRecentRuns(prev => [data.run, ...prev]);
        fetchFlowsAndMetrics();
      } else {
        alert('Flow execution error: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Network error executing Genkit flow: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const selectedFlow = flows.find(f => f.id === selectedFlowId) || flows[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-2xl shadow-lg shrink-0">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                  Google Genkit Flows &amp; Pipeline Workflows
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  Google Genkit Framework
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  {metrics?.activeModel || 'gemini-2.5-flash'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor and execute multi-step LLM pipeline workflows, schema enrichment, AST reasoning derivations, and trace verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFlowsAndMetrics}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
              title="Refresh Genkit Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {onExportToHf && (
              <button
                onClick={() =>
                  onExportToHf(
                    'genkit_workflows',
                    'Google Genkit Workflow Telemetry & Traces',
                    { metrics, recentRuns, flows },
                    'ouroboroscollective/ARE-rLOGIC-class'
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md min-h-[40px]"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Export Telemetry to HF</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">Total Executions</span>
            <span className="text-lg font-black text-slate-100">
              {metrics?.totalRuns || recentRuns.length}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">Avg Flow Latency</span>
            <span className="text-lg font-black text-cyan-300">
              {metrics?.avgLatencyMs || 1420} ms
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">Tokens Consumed</span>
            <span className="text-lg font-black text-amber-300">
              {metrics?.totalTokensConsumed || 640}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">Workflow Success Rate</span>
            <span className="text-lg font-black text-emerald-400">
              {metrics?.totalRuns ? `${Math.round((metrics.completedRuns / metrics.totalRuns) * 100)}%` : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Flow Selector & Live Step Graph Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Flow Chooser & Trigger */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100">Genkit Workflow Selector</h4>
              </div>
              <span className="text-[10px] text-slate-400">
                {flows.length} Flows Configured
              </span>
            </div>

            {/* Flows List */}
            <div className="space-y-2">
              {flows.map(f => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFlowId(f.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    selectedFlowId === f.id
                      ? 'bg-cyan-500/10 border-cyan-500/60 ring-1 ring-cyan-400 shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{f.name}</span>
                    <span className="text-[10px] text-cyan-300 font-semibold">{f.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {f.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>{f.stepsCount} steps</span>
                    <span>~{f.avgLatencyMs}ms</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Context */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-slate-400 text-[11px] font-bold block">
                Target Dataset / Context Input:
              </label>
              <input
                type="text"
                value={inputDatasetName}
                onChange={e => setInputDatasetName(e.target.value)}
                placeholder="Dataset repo or prompt ID..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleExecuteFlow}
            disabled={isRunning}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-mono font-black rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 min-h-[42px] mt-4"
          >
            {isRunning ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Executing Genkit Flow Steps...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Run Genkit Flow</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Step Pipeline Graph & Live Run Inspector */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-slate-100">
                Pipeline Graph &amp; Step Execution Trace
              </h4>
            </div>
            {activeRunResult && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[10px]">
                Run ID: {activeRunResult.id.slice(0, 14)}
              </span>
            )}
          </div>

          {/* Flow Steps Pipeline Graph */}
          {selectedFlow && (
            <div className="space-y-3">
              <span className="text-[11px] text-slate-400 font-bold block uppercase">
                Configured Workflow Steps ({selectedFlow.steps?.length || 3})
              </span>

              <div className="space-y-2">
                {selectedFlow.steps?.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="text-slate-200 font-bold block">{step.name}</span>
                        <span className="text-[10px] text-slate-400">{step.promptRole}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30 shrink-0">
                      Step {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Result Preview / Live Trace */}
          {activeRunResult && (
            <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execution Succeeded in {activeRunResult.durationMs}ms</span>
                </span>
                <span className="text-slate-400 text-[10px]">
                  {activeRunResult.totalTokens} Tokens Used
                </span>
              </div>

              {/* Step Traces */}
              <div className="space-y-1.5">
                {activeRunResult.steps?.map((st, i) => (
                  <div key={i} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between gap-2">
                    <span className="text-slate-300 font-bold truncate">{st.name}</span>
                    <span className="text-slate-400 truncate text-[10px]">{st.outputSummary}</span>
                    <span className="text-cyan-300 font-semibold shrink-0">{st.durationMs}ms</span>
                  </div>
                ))}
              </div>

              {/* Output JSON Payload */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Output Payload:</span>
                <pre className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-[10px] text-slate-300 overflow-x-auto max-h-32">
                  {JSON.stringify(activeRunResult.outputPayload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Execution History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Recent Genkit Flow Run History ({recentRuns.length})</span>
          </span>
          <span className="text-[10px] text-slate-500">Live Execution Log</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {recentRuns.map(run => {
            const isExpanded = expandedRunId === run.id;
            return (
              <div key={run.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div
                  onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                  className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${run.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="font-bold text-slate-200 truncate">{run.flowName}</span>
                    <span className="text-[10px] text-slate-500 truncate">{run.id}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px]">
                    <span className="text-cyan-300 font-semibold">{run.durationMs}ms</span>
                    <span className="text-amber-400">{run.totalTokens} tokens</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 border-t border-slate-800 bg-slate-900/50 space-y-2 text-[11px]">
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Started: {new Date(run.startedAt).toLocaleTimeString()}</span>
                      <span>Status: <strong className="text-emerald-400">{run.status}</strong></span>
                    </div>

                    <div className="space-y-1">
                      {run.steps?.map((step, idx) => (
                        <div key={idx} className="p-1.5 bg-slate-950 rounded flex justify-between text-[10px]">
                          <span className="text-slate-300">{step.name}</span>
                          <span className="text-slate-400">{step.outputSummary}</span>
                          <span className="text-cyan-300">{step.durationMs}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
