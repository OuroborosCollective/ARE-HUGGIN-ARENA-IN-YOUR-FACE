import React, { useState } from 'react';
import {
  Layers,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
  UploadCloud,
  ListPlus,
  Zap,
  Sparkles,
  ChevronRight,
  Kanban,
  Table as TableIcon,
  RotateCcw,
  CheckCheck
} from 'lucide-react';
import { BulkJob } from './PipelineOptimizer';

interface BatchProgressBoardProps {
  jobs: BulkJob[];
  isQueueRunning: boolean;
  isQueuePaused: boolean;
  activeJobId: string | null;
  onStartQueue: () => void;
  onPauseQueue: () => void;
  onResumeQueue: () => void;
  onOpenBatchModal: () => void;
  onRemoveJob: (jobId: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  onRetryJob: (jobId: string) => void;
  onRetryAllFailed: () => void;
  onInspectResult: (job: BulkJob) => void;
  onExportJobToHf?: (job: BulkJob) => void;
  onExportAllCompletedToHf?: () => void;
}

export const BatchProgressBoard: React.FC<BatchProgressBoardProps> = ({
  jobs,
  isQueueRunning,
  isQueuePaused,
  activeJobId,
  onStartQueue,
  onPauseQueue,
  onResumeQueue,
  onOpenBatchModal,
  onRemoveJob,
  onClearCompleted,
  onClearAll,
  onRetryJob,
  onRetryAllFailed,
  onInspectResult,
  onExportJobToHf,
  onExportAllCompletedToHf
}) => {
  const [boardViewMode, setBoardViewMode] = useState<'kanban' | 'table'>('kanban');

  // Partition jobs into 4 columns
  const queuedJobs = jobs.filter(j => j.status === 'queued' || j.status === 'paused');
  const processingJobs = jobs.filter(j => j.status === 'processing');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const failedJobs = jobs.filter(j => j.status === 'failed');

  const totalJobsCount = jobs.length;
  const completedJobsCount = completedJobs.length;
  const failedJobsCount = failedJobs.length;

  const overallProgressPct = totalJobsCount > 0
    ? Math.round(
        (jobs.reduce((acc, j) => acc + (j.status === 'completed' ? 100 : j.progressPct || 0), 0) /
          (totalJobsCount * 100)) * 100
      )
    : 0;

  const totalRowsProcessed = jobs.reduce((acc, j) => acc + (j.processedRows || 0), 0);
  const activeJob = processingJobs[0] || jobs.find(j => j.id === activeJobId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & TOP LEVEL STATS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${
            isQueueRunning && !isQueuePaused
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <Layers className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Real-Time Batch Progress Board</span>
              </h3>
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
                  ? 'Engine Running'
                  : isQueuePaused
                  ? 'Queue Paused'
                  : completedJobsCount === totalJobsCount && totalJobsCount > 0
                  ? 'All Jobs Done'
                  : 'Ready'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-dataset transformation queue with live DAG execution, throughput metrics, and visual progress board.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Primary Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setBoardViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                boardViewMode === 'kanban'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setBoardViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                boardViewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          <button
            onClick={onOpenBatchModal}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 min-h-[38px]"
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>+ Queue Multiple Jobs</span>
          </button>

          {!isQueueRunning || isQueuePaused ? (
            <button
              onClick={isQueuePaused ? onResumeQueue : onStartQueue}
              disabled={queuedJobs.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/15 flex items-center gap-1.5 min-h-[38px]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isQueuePaused ? 'Resume' : 'Start Processing'}</span>
            </button>
          ) : (
            <button
              onClick={onPauseQueue}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 min-h-[38px]"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL QUEUE METRIC STRIP */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-500 block text-[10px] uppercase">Total Batch Jobs</span>
          <span className="text-lg font-bold text-slate-100">{totalJobsCount}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {completedJobsCount} done · {queuedJobs.length} queued
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-500 block text-[10px] uppercase">Overall Progress</span>
          <span className="text-lg font-bold text-amber-400">{overallProgressPct}%</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {totalRowsProcessed.toLocaleString()} rows done
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-500 block text-[10px] uppercase">Engine Status</span>
          <span className={`text-sm font-bold truncate block ${
            isQueueRunning && !isQueuePaused
              ? 'text-emerald-400 animate-pulse'
              : 'text-slate-300'
          }`}>
            {isQueueRunning && !isQueuePaused ? 'ACTIVE DISPATCH' : isQueuePaused ? 'PAUSED' : 'IDLE'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Throughput: ~12.5k rows/s
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-slate-500 block text-[10px] uppercase">Batch Controls</span>
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {failedJobsCount > 0 && (
              <button
                onClick={onRetryAllFailed}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Retry Failed</span>
              </button>
            )}
            {completedJobsCount > 0 && (
              <button
                onClick={onClearCompleted}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                Clear Done
              </button>
            )}
            {totalJobsCount > 0 && (
              <button
                onClick={onClearAll}
                className="text-[10px] text-rose-400 hover:text-rose-300"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Progress Bar */}
      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
            overallProgressPct === 100
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400'
          }`}
          style={{ width: `${Math.max(overallProgressPct, totalJobsCount > 0 ? 3 : 0)}%` }}
        >
          {isQueueRunning && !isQueuePaused && (
            <div className="absolute inset-0 bg-white/25 animate-pulse" />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: KANBAN SWIMLANES PROGRESS BOARD */}
      {/* ------------------------------------------------------------- */}
      {boardViewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
          {/* COLUMN 1: QUEUED */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                  Queued
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                {queuedJobs.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {queuedJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-[11px] font-mono italic">
                  No jobs queued. Click "+ Queue Multiple Jobs" to add.
                </div>
              ) : (
                queuedJobs.map(job => (
                  <div
                    key={job.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-200 truncate block text-[11px]">
                        {job.datasetId}
                      </span>
                      <button
                        onClick={() => onRemoveJob(job.id)}
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                        title="Remove job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-amber-400 font-bold uppercase">
                        {job.targetFormat}
                      </span>
                      {job.deduplicate && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400">
                          Dedup
                        </span>
                      )}
                      {job.cleanPii && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400">
                          PII
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
                      <span>{job.totalRows.toLocaleString()} rows</span>
                      <span>Pending</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: PROCESSING (ACTIVE) */}
          <div className="bg-slate-950/70 border border-amber-500/40 rounded-xl p-3.5 space-y-3 flex flex-col shadow-lg shadow-amber-500/5">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-300">
                  Processing (Live)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold">
                {processingJobs.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {processingJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-[11px] font-mono italic">
                  Engine idle. Start queue to execute pending jobs.
                </div>
              ) : (
                processingJobs.map(job => (
                  <div
                    key={job.id}
                    className="p-3.5 bg-slate-900 border border-amber-500/60 rounded-xl space-y-2.5 shadow-md shadow-amber-500/10 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-amber-200 truncate block text-[11px]">
                        {job.datasetId}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold uppercase font-mono text-[10px]">
                        {job.targetFormat}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-amber-300/90 font-semibold">{job.stageName}</span>
                        <span className="text-amber-400 font-bold">{job.progressPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
                          style={{ width: `${job.progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                      <span>{job.processedRows.toLocaleString()} / {job.totalRows.toLocaleString()} rows</span>
                      <span className="text-amber-400 animate-pulse">Running DAG</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: COMPLETED */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-300">
                  Completed
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                {completedJobs.length > 0 && onExportAllCompletedToHf && (
                  <button
                    onClick={onExportAllCompletedToHf}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-mono"
                    title="Export all completed to Hugging Face"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>All to HF</span>
                  </button>
                )}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                  {completedJobs.length}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {completedJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-[11px] font-mono italic">
                  No completed jobs yet.
                </div>
              ) : (
                completedJobs.map(job => (
                  <div
                    key={job.id}
                    className="p-3 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-200 truncate block text-[11px]">
                        {job.datasetId}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                        {job.targetFormat}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                      {job.durationMs && <span>{(job.durationMs / 1000).toFixed(1)}s</span>}
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => onInspectResult(job)}
                        className="flex-1 py-1 bg-slate-950 hover:bg-slate-800 text-amber-300 rounded-lg text-[11px] font-semibold border border-slate-800 flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>

                      {onExportJobToHf && (
                        <button
                          onClick={() => onExportJobToHf(job)}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          title="Export to Hugging Face"
                        >
                          <UploadCloud className="w-3 h-3" />
                          <span>Export</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 4: FAILED */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-rose-300">
                  Failed
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono text-[10px] font-bold">
                {failedJobs.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {failedJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-[11px] font-mono italic">
                  Zero errors. All jobs operating cleanly.
                </div>
              ) : (
                failedJobs.map(job => (
                  <div
                    key={job.id}
                    className="p-3 bg-slate-900 border border-rose-500/40 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-rose-200 truncate block text-[11px]">
                        {job.datasetId}
                      </span>
                      <button
                        onClick={() => onRemoveJob(job.id)}
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[10px] text-rose-400/90 font-mono line-clamp-2">
                      {job.error || 'Pipeline execution failed'}
                    </p>

                    <button
                      onClick={() => onRetryJob(job.id)}
                      className="w-full py-1 bg-slate-950 hover:bg-slate-800 text-amber-300 rounded-lg text-[11px] font-semibold border border-slate-800 flex items-center justify-center gap-1 mt-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Job</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: COMPACT TABLE VIEW */}
      {/* ------------------------------------------------------------- */}
      {boardViewMode === 'table' && (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Dataset ID</th>
                <th className="p-3">Schema</th>
                <th className="p-3">Status</th>
                <th className="p-3">Progress / Stage</th>
                <th className="p-3">Processed</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {jobs.map((job, idx) => {
                const isProcessing = job.status === 'processing';
                const isDone = job.status === 'completed';
                const isFailed = job.status === 'failed';

                return (
                  <tr key={job.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-200">{job.datasetId}</td>
                    <td className="p-3 uppercase text-amber-400">{job.targetFormat}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isProcessing
                          ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                          : isFailed
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {isProcessing ? `${job.stageName} (${job.progressPct}%)` : job.stageName}
                    </td>
                    <td className="p-3 text-slate-400">
                      {(job.processedRows || 0).toLocaleString()} / {job.totalRows.toLocaleString()} rows
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {job.result && (
                          <button
                            onClick={() => onInspectResult(job)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-semibold text-[11px]"
                          >
                            Inspect
                          </button>
                        )}
                        {job.result && onExportJobToHf && (
                          <button
                            onClick={() => onExportJobToHf(job)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-bold text-[11px]"
                          >
                            Export
                          </button>
                        )}
                        {isFailed && (
                          <button
                            onClick={() => onRetryJob(job.id)}
                            className="px-2 py-1 bg-slate-800 text-amber-300 rounded text-[11px]"
                          >
                            Retry
                          </button>
                        )}
                        {!isProcessing && (
                          <button
                            onClick={() => onRemoveJob(job.id)}
                            className="p-1 text-slate-500 hover:text-slate-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
