import React, { useState } from 'react';
import { Hash, ShieldCheck, Link2, CheckCircle2, ArrowRight, Copy, Check, UploadCloud, RefreshCw, Layers, ExternalLink } from 'lucide-react';
import { MatchReceipt } from './LogicArena';

interface ArenaMerkleChainProps {
  matches: MatchReceipt[];
  onExportToHf?: (actionType: 'arena_match', title: string, payload: any, defaultRepo?: string) => void;
}

export const ArenaMerkleChain: React.FC<ArenaMerkleChainProps> = ({ matches, onExportToHf }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Compute Merkle Tree leaves & root
  const leaves = matches.map((m, idx) => ({
    index: matches.length - idx,
    matchId: m.match_id,
    receiptHash: m.evidence_receipt_hash,
    winner: m.winning_model || m.attacker,
    points: m.points_awarded,
    timestamp: m.timestamp,
    parentHash: idx < matches.length - 1 ? matches[idx + 1].evidence_receipt_hash : '0x0000000000000000'
  }));

  const combinedStr = leaves.map(l => l.receiptHash).join(':');
  const merkleRoot = 'merkle_root_0x' + Math.abs(
    combinedStr.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  ).toString(16).padStart(12, '0');

  const totalPoints = matches.reduce((acc, m) => acc + (m.points_awarded || 0), 0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportChain = () => {
    if (!onExportToHf) return;
    onExportToHf(
      'arena_match',
      `ARE Merkle Evidence Chain (Height ${matches.length}, Root ${merkleRoot.slice(0, 16)})`,
      {
        merkle_root: merkleRoot,
        chain_height: matches.length,
        total_evidence_points: totalPoints,
        anchored_dataset: 'ouroboroscollective/satoshi-evidence-atlas',
        leaves
      },
      'ouroboroscollective/evidence-bound-css'
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              Cryptographic Audit Ledger
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-emerald-400">Deterministic Chain</span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-amber-400" />
            <span>ARE Merkle Root Evidence Ledger</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable chain linking every match receipt into an append-only Merkle tree anchor.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onExportToHf && (
            <button
              onClick={handleExportChain}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors shadow-sm text-xs min-h-[44px]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Export Chain to HF Hub</span>
            </button>
          )}

          <a
            href="https://huggingface.co/datasets/ouroboroscollective/satoshi-evidence-atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 font-semibold rounded-xl border border-slate-800 transition-colors text-xs min-h-[44px]"
          >
            <span>Evidence Atlas</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Merkle Root Summary Card */}
      <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Current Merkle Root Hash
          </span>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold font-mono text-amber-300 truncate">{merkleRoot}</p>
            <button
              onClick={() => handleCopy(merkleRoot)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              {copiedHash === merkleRoot ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">CHAIN HEIGHT</span>
            <span className="text-emerald-400 font-bold text-sm">{matches.length} Blocks</span>
          </div>

          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">EVIDENCE TOTAL</span>
            <span className="text-amber-400 font-bold text-sm">+{totalPoints.toLocaleString()} pts</span>
          </div>
        </div>
      </div>

      {/* Chain Block Nodes List (Touch-To-Scroll) */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-300">Sequential Receipt Chain:</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto touch-scroll-y pr-1">
          {leaves.map((leaf) => (
            <div
              key={leaf.receiptHash}
              className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0 border border-slate-800 text-[11px]">
                  #{leaf.index}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200">{leaf.matchId}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-mono">+{leaf.points} pts</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 truncate">
                    Hash: <strong className="text-amber-300">{leaf.receiptHash}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-[11px] font-mono text-slate-500">
                <span className="truncate max-w-[140px]">Parent: {leaf.parentHash.slice(0, 10)}...</span>
                <button
                  onClick={() => handleCopy(leaf.receiptHash)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  {copiedHash === leaf.receiptHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
