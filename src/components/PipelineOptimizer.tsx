import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Play, Pause, CheckCircle2, ShieldCheck, Layers, FileCode, Cpu, BarChart, Download, RefreshCw, Tag, Zap, Activity, UploadCloud, ExternalLink, ListPlus, Trash2, RotateCcw, Clock, AlertTriangle, ChevronDown, ChevronUp, Check, Eye } from 'lucide-react';
import { AutoTaggingModal } from './AutoTaggingModal';
import { BatchProgressBoard } from './BatchProgressBoard';
import { BatchQueueModal } from './BatchQueueModal';

export interface BulkJob {
  id: string;
  datasetId: string;
  targetFormat: 'alpaca' | 'chatml' | 'llama3' | 'dpo';
  deduplicate: boolean;
  cleanPii: boolean;
  enableHighThinking: boolean;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  progressPct: number;
  stageName: string;
  processedRows: number;
  totalRows: number;
  result?: any;
  error?: string;
  enqueuedAt: string;
  completedAt?: string;
  durationMs?: number;
}

interface PipelineOptimizerProps {
  initialDatasetId?: string;
  onOpenScriptExport: (datasetId: string) => void;
  onExportToHf?: (actionType: 'pipeline_optimization' | 'auto_tagging', title: string, payload: any, defaultRepo?: string) => void;
}

export const PipelineOptimizer: React.FC<PipelineOptimizerProps> = ({
  initialDatasetId = 'ouroboroscollective/ARE-rLOGIC-class',
  onOpenScriptExport,
  onExportToHf
}) => {
  const [datasetId, setDatasetId] = useState(initialDatasetId);
  const [targetFormat, setTargetFormat] = useState<'alpaca' | 'chatml' | 'llama3' | 'dpo'>('alpaca');
  const [enableHighThinking, setEnableHighThinking] = useState(true);
  const [deduplicate, setDeduplicate] = useState(true);
  const [cleanPii, setCleanPii] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pipelineOutput, setPipelineOutput] = useState<any | null>(null);

  // Single Run Progress State
  const [progressPct, setProgressPct] = useState(0);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // -------------------------------------------------------------------
  // BULK PROCESSING QUEUE STATE
  // -------------------------------------------------------------------
  const [jobs, setJobs] = useState<BulkJob[]>([
    {
      id: 'job-init-1',
      datasetId: 'ouroboroscollective/evidence-bound-css',
      targetFormat: 'alpaca',
      deduplicate: true,
      cleanPii: true,
      enableHighThinking: true,
      status: 'queued',
      progressPct: 0,
      stageName: 'Pending in Queue',
      processedRows: 0,
      totalRows: 45000,
      enqueuedAt: new Date(Date.now() - 60000).toISOString()
    },
    {
      id: 'job-init-2',
      datasetId: 'Thorsu/sovereign-evidence-observatory',
      targetFormat: 'chatml',
      deduplicate: true,
      cleanPii: true,
      enableHighThinking: true,
      status: 'queued',
      progressPct: 0,
      stageName: 'Pending in Queue',
      processedRows: 0,
      totalRows: 52000,
      enqueuedAt: new Date(Date.now() - 30000).toISOString()
    }
  ]);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(true);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Ref to track running state without closure staleness
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isRunningRef.current = isQueueRunning;
  }, [isQueueRunning]);

  useEffect(() => {
    isPausedRef.current = isQueuePaused;
  }, [isQueuePaused]);

  const stages = [
    { name: 'Dataset Ingest & Schema Validation', desc: 'Streaming rows and verifying types' },
    { name: 'MinHash LSH Deduplication', desc: 'Clustering sequence hashes & removing duplicates' },
    { name: 'PII Redaction & Sanitization', desc: 'Masking emails, IP addresses & private keys' },
    { name: 'Gemini 3.1 Pro High Thinking Reformat', desc: 'Applying reasoning transformation & quality score' },
    { name: 'Packaging & Parquet Export Indexing', desc: 'Assembling training splits & metadata' }
  ];

  const formats = [
    { id: 'alpaca', label: 'Alpaca (Instruction, Input, Output)' },
    { id: 'chatml', label: 'ChatML / OpenAI (User, Assistant turns)' },
    { id: 'llama3', label: 'Llama-3 Instruct (<|start_header_id|>)' },
    { id: 'dpo', label: 'DPO Preference (Prompt, Chosen, Rejected)' }
  ];

  // -------------------------------------------------------------------
  // EXECUTE SINGLE TRANSFORMATION
  // -------------------------------------------------------------------
  const executeJobApi = async (job: {
    datasetId: string;
    targetFormat: string;
    enableHighThinking: boolean;
    deduplicate: boolean;
    cleanPii: boolean;
  }, onProgress?: (pct: number, stageName: string, rows: number) => void) => {
    onProgress?.(10, stages[0].name, 5000);
    await new Promise(r => setTimeout(r, 400));

    onProgress?.(35, stages[1].name, 16000);
    await new Promise(r => setTimeout(r, 450));

    onProgress?.(65, stages[2].name, 32000);
    await new Promise(r => setTimeout(r, 450));

    onProgress?.(85, stages[3].name, 44000);

    const res = await fetch('/api/datasets/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: job.datasetId,
        target_format: job.targetFormat,
        enable_high_thinking: job.enableHighThinking,
        rules: { deduplicate: job.deduplicate, PII_mask: job.cleanPii, quality_filter: true }
      })
    });

    if (!res.ok) {
      throw new Error(`API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    onProgress?.(100, stages[4].name, 50000);
    return data;
  };

  // Run Current Form Job directly
  const handleRunOptimization = async () => {
    setLoading(true);
    setProgressPct(5);
    setCurrentStageIdx(0);
    setProcessedRows(2500);

    try {
      const data = await executeJobApi(
        { datasetId, targetFormat, enableHighThinking, deduplicate, cleanPii },
        (pct, stageName, rows) => {
          setProgressPct(pct);
          setProcessedRows(rows);
          const idx = stages.findIndex(s => s.name === stageName);
          if (idx !== -1) setCurrentStageIdx(idx);
        }
      );
      setPipelineOutput(data);
    } catch (err: any) {
      console.warn('Single run error:', err);
      alert('Optimization error: ' + (err.message || 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // QUEUE MANAGEMENT ACTIONS
  // -------------------------------------------------------------------
  const handleEnqueueCurrent = () => {
    const newJob: BulkJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      datasetId,
      targetFormat,
      deduplicate,
      cleanPii,
      enableHighThinking,
      status: 'queued',
      progressPct: 0,
      stageName: 'Pending in Queue',
      processedRows: 0,
      totalRows: 45000,
      enqueuedAt: new Date().toISOString()
    };
    setJobs(prev => [...prev, newJob]);
    setIsQueueDrawerOpen(true);
  };

  const handleEnqueueMultiFormatMatrix = () => {
    const allFormats: Array<'alpaca' | 'chatml' | 'llama3' | 'dpo'> = ['alpaca', 'chatml', 'llama3', 'dpo'];
    const newJobs: BulkJob[] = allFormats.map((fmt, i) => ({
      id: `job-matrix-${Date.now()}-${i}`,
      datasetId,
      targetFormat: fmt,
      deduplicate,
      cleanPii,
      enableHighThinking,
      status: 'queued',
      progressPct: 0,
      stageName: 'Pending in Queue',
      processedRows: 0,
      totalRows: 45000,
      enqueuedAt: new Date().toISOString()
    }));
    setJobs(prev => [...prev, ...newJobs]);
    setIsQueueDrawerOpen(true);
  };

  const handleEnqueueAllDatasetsBatch = () => {
    const premierDatasets = [
      'ouroboroscollective/evidence-bound-css',
      'Thorsu/sovereign-evidence-observatory',
      'ouroboroscollective/satoshi-evidence-atlas',
      'ouroboroscollective/ARE-rLOGIC-class'
    ];
    const newJobs: BulkJob[] = premierDatasets.map((ds, i) => ({
      id: `job-batch-${Date.now()}-${i}`,
      datasetId: ds,
      targetFormat: 'chatml',
      deduplicate: true,
      cleanPii: true,
      enableHighThinking: true,
      status: 'queued',
      progressPct: 0,
      stageName: 'Pending in Queue',
      processedRows: 0,
      totalRows: 50000,
      enqueuedAt: new Date().toISOString()
    }));
    setJobs(prev => [...prev, ...newJobs]);
    setIsQueueDrawerOpen(true);
  };

  const handleEnqueueBatchList = (newJobs: BulkJob[]) => {
    setJobs(prev => [...prev, ...newJobs]);
  };

  const handleRetryJob = (jobId: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: 'queued',
      progressPct: 0,
      stageName: 'Pending in Queue',
      error: undefined
    } : j));
    if (!isRunningRef.current) {
      startQueueProcessing();
    }
  };

  const handleRetryAllFailed = () => {
    setJobs(prev => prev.map(j => j.status === 'failed' ? {
      ...j,
      status: 'queued',
      progressPct: 0,
      stageName: 'Pending in Queue',
      error: undefined
    } : j));
    if (!isRunningRef.current) {
      startQueueProcessing();
    }
  };

  const handleExportJobToHf = (job: BulkJob) => {
    if (!onExportToHf || !job.result) return;
    onExportToHf(
      'pipeline_optimization',
      `Transformed Dataset: ${job.datasetId} (${job.targetFormat.toUpperCase()})`,
      job.result,
      job.datasetId
    );
  };

  const handleExportAllCompleted = () => {
    if (!onExportToHf) return;
    const completed = jobs.filter(j => j.status === 'completed' && j.result);
    if (completed.length === 0) return;
    onExportToHf(
      'pipeline_optimization',
      `Batch Transformation Pack (${completed.length} Datasets)`,
      {
        total_jobs: completed.length,
        jobs: completed.map(j => ({
          dataset_id: j.datasetId,
          target_format: j.targetFormat,
          result: j.result
        }))
      },
      completed[0]?.datasetId
    );
  };

  const handleRemoveJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleClearCompleted = () => {
    setJobs(prev => prev.filter(j => j.status !== 'completed'));
  };

  const handleClearAll = () => {
    if (isQueueRunning) {
      setIsQueueRunning(false);
      isRunningRef.current = false;
    }
    setJobs([]);
    setActiveJobId(null);
  };

  // -------------------------------------------------------------------
  // QUEUE RUNNER ENGINE
  // -------------------------------------------------------------------
  const startQueueProcessing = async () => {
    if (isRunningRef.current) return;
    setIsQueueRunning(true);
    setIsQueuePaused(false);
    isRunningRef.current = true;
    isPausedRef.current = false;

    while (isRunningRef.current) {
      if (isPausedRef.current) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      // Find next queued or failed job
      let nextJob: BulkJob | undefined;
      setJobs(prev => {
        nextJob = prev.find(j => j.status === 'queued' || j.status === 'paused');
        return prev;
      });

      // Give state a tick to resolve
      await new Promise(r => setTimeout(r, 50));
      if (!nextJob) {
        // No more pending jobs
        break;
      }

      const currentId = nextJob.id;
      setActiveJobId(currentId);

      // Mark job as processing
      setJobs(prev => prev.map(j => j.id === currentId ? {
        ...j,
        status: 'processing',
        stageName: 'Starting Ingest',
        progressPct: 5
      } : j));

      const startTime = Date.now();

      try {
        const result = await executeJobApi(
          {
            datasetId: nextJob.datasetId,
            targetFormat: nextJob.targetFormat,
            enableHighThinking: nextJob.enableHighThinking,
            deduplicate: nextJob.deduplicate,
            cleanPii: nextJob.cleanPii
          },
          (pct, stageName, rows) => {
            setJobs(prev => prev.map(j => j.id === currentId ? {
              ...j,
              progressPct: pct,
              stageName,
              processedRows: rows
            } : j));
          }
        );

        const duration = Date.now() - startTime;

        setJobs(prev => prev.map(j => j.id === currentId ? {
          ...j,
          status: 'completed',
          progressPct: 100,
          stageName: 'Completed Successfully',
          processedRows: j.totalRows,
          result,
          completedAt: new Date().toISOString(),
          durationMs: duration
        } : j));

        // Update main preview with latest completed job
        setPipelineOutput(result);
        setDatasetId(nextJob.datasetId);
      } catch (err: any) {
        console.error('Queue job failure:', err);
        setJobs(prev => prev.map(j => j.id === currentId ? {
          ...j,
          status: 'failed',
          stageName: 'Failed during pipeline',
          error: err.message || 'Execution error'
        } : j));
      }

      // Short delay between jobs for UI responsiveness
      await new Promise(r => setTimeout(r, 600));
    }

    setIsQueueRunning(false);
    isRunningRef.current = false;
    setActiveJobId(null);
  };

  const handlePauseQueue = () => {
    setIsQueuePaused(true);
    isPausedRef.current = true;
  };

  const handleResumeQueue = () => {
    setIsQueuePaused(false);
    isPausedRef.current = false;
    if (!isRunningRef.current) {
      startQueueProcessing();
    }
  };

  // -------------------------------------------------------------------
  // STATS & PROGRESS METRICS
  // -------------------------------------------------------------------
  const totalJobsCount = jobs.length;
  const completedJobsCount = jobs.filter(j => j.status === 'completed').length;
  const failedJobsCount = jobs.filter(j => j.status === 'failed').length;
  const pendingJobsCount = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length;
  const activeJob = jobs.find(j => j.id === activeJobId) || jobs.find(j => j.status === 'processing');

  const overallProgressPct = totalJobsCount > 0
    ? Math.round(
        (jobs.reduce((acc, j) => acc + (j.status === 'completed' ? 100 : j.progressPct || 0), 0) /
          (totalJobsCount * 100)) *
          100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* ============================================================= */}
      {/* REAL-TIME BATCH PROCESSING PROGRESS BOARD */}
      {/* ============================================================= */}
      <BatchProgressBoard
        jobs={jobs}
        isQueueRunning={isQueueRunning}
        isQueuePaused={isQueuePaused}
        activeJobId={activeJobId}
        onStartQueue={startQueueProcessing}
        onPauseQueue={handlePauseQueue}
        onResumeQueue={handleResumeQueue}
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
        onRemoveJob={handleRemoveJob}
        onClearCompleted={handleClearCompleted}
        onClearAll={handleClearAll}
        onRetryJob={handleRetryJob}
        onRetryAllFailed={handleRetryAllFailed}
        onInspectResult={(job) => {
          if (job.result) {
            setPipelineOutput(job.result);
            setDatasetId(job.datasetId);
            setTargetFormat(job.targetFormat);
          }
        }}
        onExportJobToHf={onExportToHf ? handleExportJobToHf : undefined}
        onExportAllCompletedToHf={onExportToHf ? handleExportAllCompleted : undefined}
      />

      {/* Visual Pipeline DAG Flow */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              AI Dataset Pipeline Mediator & DAG Visualizer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated data engineering pipeline with real-time transformation feedback.
            </p>
          </div>

          <button
            onClick={() => setIsTagModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors self-start sm:self-auto min-h-[36px]"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Auto-Tag with Copilot</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl text-center space-y-1">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Step 1</span>
            <p className="text-xs font-semibold text-slate-200">HF Source Load</p>
            <p className="text-[11px] font-mono text-slate-400 truncate">{datasetId}</p>
          </div>

          <div className="hidden md:flex items-center justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Step 2</span>
            <p className="text-xs font-semibold text-slate-200">Quality & PII Mask</p>
            <p className="text-[11px] text-slate-400">Deduplicate & Mask</p>
          </div>

          <div className="hidden md:flex items-center justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="p-3 bg-slate-950 border border-indigo-500/40 rounded-xl text-center space-y-1">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">Step 3</span>
            <p className="text-xs font-semibold text-slate-200">Format Schema</p>
            <p className="text-[11px] font-mono text-slate-400 uppercase">{targetFormat}</p>
          </div>
        </div>
      </div>

      {/* Animated Live Transformation Progress Bar when Loading (Single Run) */}
      {loading && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Single Transformation in Progress
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">
                Processed: <strong className="text-slate-200">{processedRows.toLocaleString()} / 50,000 rows</strong>
              </span>
              <span className="text-amber-400 font-bold text-sm">
                {progressPct}%
              </span>
            </div>
          </div>

          {/* Animated Gradient Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm relative overflow-hidden"
                style={{ width: `${Math.max(progressPct, 4)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>Throughput: ~14,200 rows/sec</span>
              <span>Active Worker: Gemini 3.1 Pro (High Thinking) / Deterministic Engine</span>
            </div>
          </div>

          {/* Real-time Stage Progression Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-2">
            {stages.map((stage, idx) => {
              const isPast = currentStageIdx > idx;
              const isCurrent = currentStageIdx === idx;
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-sm'
                      : isPast
                      ? 'bg-slate-950 border-emerald-500/30 text-slate-300'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-mono text-[11px] mb-1">
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" />
                    )}
                    <span className="font-semibold">Stage {idx + 1}</span>
                  </div>
                  <p className="font-medium truncate">{stage.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls & Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              Pipeline Configuration
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Dataset Repository ID:</label>
              <input
                type="text"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500/50 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Target Training Format Schema:</label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 min-h-[44px]"
              >
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* High Thinking Mode Toggle */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Gemini 3.1 Pro High Thinking
                </span>
                <input
                  type="checkbox"
                  checked={enableHighThinking}
                  onChange={(e) => setEnableHighThinking(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Executes deep reasoning analysis (ThinkingLevel.HIGH) with automated deterministic 503 fallback if API is experiencing high demand.
              </p>
            </div>

            {/* Pipeline Flags */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={deduplicate}
                  onChange={(e) => setDeduplicate(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-500"
                />
                <span>MinHash LSH Deduplication</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={cleanPii}
                  onChange={(e) => setCleanPii(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-500"
                />
                <span>PII Redaction (Email, Phone, IP Addresses)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleRunOptimization}
                disabled={loading}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Running ({progressPct}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Single Job</span>
                  </>
                )}
              </button>

              <button
                onClick={handleEnqueueCurrent}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <ListPlus className="w-4 h-4" />
                <span>Add to Bulk Queue</span>
              </button>
            </div>
          </div>
        </div>

        {/* Output & Report Panel */}
        <div className="lg:col-span-7">
          {pipelineOutput ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 sticky top-28">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Pipeline Execution Results
                  </h3>
                  <p className="text-xs text-slate-400">Target Schema: {pipelineOutput.target_format}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {onExportToHf && (
                    <button
                      onClick={() => onExportToHf('pipeline_optimization', `Transformed Pipeline Split: ${datasetId} (${pipelineOutput.target_format})`, pipelineOutput, datasetId)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm min-h-[36px]"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Export to HF Dataset</span>
                    </button>
                  )}

                  <a
                    href={`https://huggingface.co/datasets/${datasetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-medium rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
                  >
                    <span>View HF Hub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => onOpenScriptExport(datasetId)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 min-h-[36px]"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>Train Script</span>
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Quality Score</span>
                  <p className="text-lg font-bold font-mono text-emerald-400">
                    {pipelineOutput.quality_score}/100
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">VRAM Requirement (8B Model)</span>
                  <p className="text-xs font-bold font-mono text-slate-200 mt-1">
                    {pipelineOutput.vram_estimate_8b_model}
                  </p>
                </div>
              </div>

              {/* Insights */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">AI Optimization Insights:</h4>
                <ul className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                  {pipelineOutput.insights?.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Transformed Rows Sample */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">Transformed Schema Row Sample:</h4>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-amber-200/90 max-h-60 overflow-auto touch-scroll-y">
                  {JSON.stringify(pipelineOutput.transformed_rows || [], null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800">
              Configure parameters and click "Run Single Job" or "Add to Bulk Queue" to execute automated data cleaning and schema transformation.
            </div>
          )}
        </div>
      </div>

      {/* Auto Tagging Modal */}
      <AutoTaggingModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        datasetId={datasetId}
        onExportToHf={onExportToHf}
      />

      {/* Batch Processing Queue Generator Modal */}
      <BatchQueueModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onEnqueueBatch={handleEnqueueBatchList}
      />
    </div>
  );
};
