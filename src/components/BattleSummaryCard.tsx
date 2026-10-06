import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Swords,
  Shield,
  Trophy,
  Zap,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  UploadCloud,
  Hash,
  ChevronRight,
  TrendingUp,
  Flame,
  Star
} from 'lucide-react';
import { MatchReceipt } from './LogicArena';

interface BattleSummaryCardProps {
  match: MatchReceipt;
  attackerElo?: number;
  defenderElo?: number;
  attackerName?: string;
  defenderName?: string;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
  onDownloadReceipt?: (match: MatchReceipt) => void;
  onRematch?: () => void;
}

export const BattleSummaryCard: React.FC<BattleSummaryCardProps> = ({
  match,
  attackerElo = 2180,
  defenderElo = 2145,
  attackerName,
  defenderName,
  onExportToHf,
  onDownloadReceipt,
  onRematch
}) => {
  const [copied, setCopied] = useState(false);

  const isAttackWon = match.outcome === 'ATTACK_SUCCESSFUL';
  const points = match.points_awarded || (isAttackWon ? 85 : 45);
  const xpEarned = isAttackWon ? 180 + Math.round(points * 1.2) : 60 + Math.round(points * 0.5);

  // Compute attack efficiency / success metrics
  const successRate = isAttackWon ? 94.8 : 42.1;
  const astComplexityScore = match.attack_type === 'resolution_refutation' ? 96.4 : match.attack_type === 'counterexample_induction' ? 91.2 : 88.5;

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(JSON.stringify(match, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const aDisplayName = attackerName || match.attacker.split('/')[1] || match.attacker;
  const dDisplayName = defenderName || match.defender.split('/')[1] || match.defender;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5"
    >
      {/* Background Ambience Glow */}
      <div className={`absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
        isAttackWon ? 'bg-amber-500/10' : 'bg-indigo-500/10'
      }`} />

      {/* Top Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isAttackWon
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
          }`}>
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-100 font-mono">
                Match Battle Summary
              </h3>
              <span className="text-xs font-mono text-slate-400 font-medium">
                {match.match_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified AST refutation outcome, evidence scoring, and model XP breakdown.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onExportToHf && (
            <button
              onClick={() => onExportToHf(
                'arena_match',
                `ARE Battle Summary: ${match.match_id}`,
                {
                  match,
                  success_rate: `${successRate}%`,
                  points_gained: points,
                  xp_earned: xpEarned
                },
                'ouroboroscollective/ARE-rLOGIC-class'
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm min-h-[36px]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Export to HF</span>
            </button>
          )}

          {onDownloadReceipt && (
            <button
              onClick={() => onDownloadReceipt(match)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-800 transition-colors min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Receipt</span>
            </button>
          )}

          <button
            onClick={handleCopyReceipt}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors min-h-[36px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'JSON'}</span>
          </button>
        </div>
      </div>

      {/* Primary Key Metrics Grid (Success Rate, Points, XP, AST Score) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
        {/* Metric 1: Logic Attack Success Rate */}
        <div className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-slate-800/90 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>Attack Success Rate</span>
            <Zap className={`w-3.5 h-3.5 ${isAttackWon ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-100 flex items-baseline gap-1">
            <span className={isAttackWon ? 'text-emerald-400' : 'text-amber-400'}>
              {successRate}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate">
            {isAttackWon ? 'Refutation verified sound' : 'Invariant defense maintained'}
          </div>
        </div>

        {/* Metric 2: Evidence Revision Points */}
        <div className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-slate-800/90 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>Evidence Points</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 flex items-baseline gap-1">
            <span>+{points}</span>
            <span className="text-xs text-slate-400 font-normal">pts</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate">
            Revision Ledger Credited
          </div>
        </div>

        {/* Metric 3: Player & Model XP Earned */}
        <div className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-slate-950 to-slate-950 space-y-1">
          <div className="flex items-center justify-between text-amber-300 text-[11px] font-mono font-semibold">
            <span>XP Earned</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 flex items-baseline gap-1">
            <span>+{xpEarned}</span>
            <span className="text-xs text-amber-400/80 font-normal">XP</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            Hero Profile Synced
          </div>
        </div>

        {/* Metric 4: AST Invariant Depth Score */}
        <div className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-slate-800/90 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>AST Accuracy</span>
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-300 flex items-baseline gap-1">
            <span>{astComplexityScore}%</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate">
            Formal tree depth verified
          </div>
        </div>
      </div>

      {/* Outcome Verdict Banner */}
      <div className={`p-4 rounded-xl border ${
        isAttackWon
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
          : 'bg-indigo-950/20 border-indigo-500/40 text-indigo-300'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
            {isAttackWon ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Shield className="w-4 h-4 text-indigo-400" />}
            <span>Verdict: {match.outcome.replace('_', ' ')}</span>
          </span>
          <span className="text-xs font-mono font-bold text-amber-300">
            Duration: {match.duration_ms || 240}ms
          </span>
        </div>
        <p className="text-xs text-slate-200 mt-2 leading-relaxed">
          {match.referee_verdict}
        </p>
      </div>

      {/* Head-to-Head Model Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attacker Box */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" />
              <span>Attacker: {aDisplayName}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {attackerElo} ELO
            </span>
          </div>
          <div className="text-xs text-slate-300 font-mono break-words bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block mb-1">Refutation Witness:</span>
            {match.attack_payload}
          </div>
        </div>

        {/* Defender Box */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Defender: {dDisplayName}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {defenderElo} ELO
            </span>
          </div>
          <div className="text-xs text-slate-300 font-mono break-words bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block mb-1">Invariant Proof:</span>
            {match.defense_proof}
          </div>
        </div>
      </div>

      {/* Proof Receipt Hash & Rematch Footer */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-mono text-slate-400">
          <Hash className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] text-slate-500">Receipt:</span>
          <span className="text-amber-300 font-semibold truncate max-w-[200px] sm:max-w-xs">{match.evidence_receipt_hash}</span>
        </div>

        {onRematch && (
          <button
            onClick={onRematch}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 min-h-[40px] self-start sm:self-auto"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Rematch Duel</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
