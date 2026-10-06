import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Play, Pause, CheckCircle2, ShieldCheck, Layers, FileCode, Cpu, BarChart, Download, RefreshCw, Tag, Zap, Activity, UploadCloud, ExternalLink, ListPlus, Trash2, RotateCcw, Clock, AlertTriangle, ChevronDown, ChevronUp, Check, Eye } from 'lucide-react';
import { AutoTaggingModal } from './AutoTaggingModal';

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
      {/* GLOBAL BULK PROCESSING STATUS BAR (STICKY COMMAND CENTER) */}
      {/* ============================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 sticky top-16 z-20 backdrop-blur-md bg-slate-900/95">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
              isQueueRunning
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <Layers className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Bulk Processing Queue</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isQueueRunning && !isQueuePaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : isQueuePaused
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : completedJobsCount === totalJobsCount && totalJobsCount > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isQueueRunning && !isQueuePaused
                    ? 'Processing Live'
                    : isQueuePaused
                    ? 'Queue Paused'
                    : completedJobsCount === totalJobsCount && totalJobsCount > 0
                    ? 'All Jobs Finished'
                    : 'Queue Ready'}
                </span>

                <span className="text-xs font-mono text-slate-400">
                  {completedJobsCount} / {totalJobsCount} Jobs Completed ({overallProgressPct}%)
                </span>
              </div>

              {activeJob ? (
                <p className="text-xs text-amber-300/90 font-mono mt-0.5 truncate max-w-xl flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span>Active: <strong>{activeJob.datasetId.split('/').pop()}</strong> ({activeJob.targetFormat.toUpperCase()}) — {activeJob.stageName} ({activeJob.progressPct}%)</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">
                  Enqueue transformation jobs across multiple schemas or datasets and run them in batch.
                </p>
              )}
            </div>
          </div>

          {/* Queue Runner Controls */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {!isQueueRunning || isQueuePaused ? (
              <button
                onClick={isQueuePaused ? handleResumeQueue : startQueueProcessing}
                disabled={totalJobsCount === 0 || completedJobsCount === totalJobsCount}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/15 flex items-center gap-1.5 min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isQueuePaused ? 'Resume Queue' : 'Start Bulk Queue'}</span>
              </button>
            ) : (
              <button
                onClick={handlePauseQueue}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 min-h-[44px]"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Queue</span>
              </button>
            )}

            <button
              onClick={() => setIsQueueDrawerOpen(prev => !prev)}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1 min-h-[44px]"
            >
              <span>Jobs ({totalJobsCount})</span>
              {isQueueDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Global Overall Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
                overallProgressPct === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400'
              }`}
              style={{ width: `${Math.max(overallProgressPct, totalJobsCount > 0 ? 3 : 0)}%` }}
            >
              {isQueueRunning && !isQueuePaused && (
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              Queue Status: {pendingJobsCount} Pending · {completedJobsCount} Succeeded · {failedJobsCount} Failed
            </span>
            <span>
              Total Processed: {jobs.reduce((acc, j) => acc + (j.processedRows || 0), 0).toLocaleString()} rows
            </span>
          </div>
        </div>

        {/* Expandable Queue Drawer */}
        {isQueueDrawerOpen && (
          <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
            {/* Quick Enqueue Batch Presets */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider font-bold">
                Quick Enqueue Presets:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleEnqueueCurrent}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>+ Enqueue Current Config</span>
                </button>

                <button
                  onClick={handleEnqueueMultiFormatMatrix}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ 4-Schema Matrix Batch</span>
                </button>

                <button
                  onClick={handleEnqueueAllDatasetsBatch}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ 4 Premier Datasets Batch</span>
                </button>

                {completedJobsCount > 0 && (
                  <button
                    onClick={handleClearCompleted}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs border border-slate-800 transition-colors min-h-[36px]"
                  >
                    Clear Completed
                  </button>
                )}

                {totalJobsCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Clear All Jobs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Jobs Card List */}
            {jobs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
                Queue is empty. Click "+ Enqueue Current Config" or one of the batch presets above to schedule transformations.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto touch-scroll-y pr-1">
                {jobs.map((job, idx) => {
                  const isProcessing = job.status === 'processing';
                  const isDone = job.status === 'completed';
                  const isFailed = job.status === 'failed';

                  return (
                    <div
                      key={job.id}
                      className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isProcessing
                          ? 'bg-slate-950 border-amber-500/60 shadow-md shadow-amber-500/5'
                          : isDone
                          ? 'bg-slate-950/80 border-emerald-500/30'
                          : isFailed
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${
                          isProcessing
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isDone
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          #{idx + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-200 truncate">
                              {job.datasetId}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-amber-400 font-semibold uppercase">
                              {job.targetFormat}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isDone
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : isProcessing
                                ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                                : isFailed
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {job.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
                            <span>{job.stageName}</span>
                            {job.durationMs && <span>· {(job.durationMs / 1000).toFixed(1)}s</span>}
                          </div>
                        </div>
                      </div>

                      {/* Mini Job Progress Bar & Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isProcessing && (
                          <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-300"
                              style={{ width: `${job.progressPct}%` }}
                            />
                          </div>
                        )}

                        {job.result && (
                          <button
                            onClick={() => {
                              setPipelineOutput(job.result);
                              setDatasetId(job.datasetId);
                              setTargetFormat(job.targetFormat);
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 min-h-[36px]"
                            title="Inspect Job Output"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        )}

                        {job.result && onExportToHf && (
                          <button
                            onClick={() => onExportToHf(
                              'pipeline_optimization',
                              `Transformed Split: ${job.datasetId} (${job.targetFormat})`,
                              job.result,
                              job.datasetId
                            )}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 min-h-[36px]"
                            title="Export to Hugging Face"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Export</span>
                          </button>
                        )}

                        {!isProcessing && (
                          <button
                            onClick={() => handleRemoveJob(job.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
};
