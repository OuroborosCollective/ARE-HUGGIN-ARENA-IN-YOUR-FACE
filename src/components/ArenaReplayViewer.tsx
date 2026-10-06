import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Swords, Shield, Award, CheckCircle2, AlertTriangle, ArrowRight, UploadCloud, Copy, Check, Terminal, ExternalLink, FastForward, Rewind, Layers, Hash, Sparkles, RefreshCw, Cpu, Database, Eye } from 'lucide-react';
import { MatchReceipt } from './LogicArena';

interface ArenaReplayViewerProps {
  match?: MatchReceipt | null;
  allMatches?: MatchReceipt[];
  onSelectMatch?: (match: MatchReceipt) => void;
  onClose?: () => void;
  onExportToHf?: (actionType: 'arena_match', title: string, payload: any, defaultRepo?: string) => void;
  onDownloadReceipt?: (match: MatchReceipt) => void;
}

interface ReplayStep {
  stepIndex: number;
  phase: string;
  title: string;
  actor: string;
  actorType: 'attacker' | 'defender' | 'referee' | 'mcp_ledger';
  action: string;
  status: 'PENDING' | 'EXECUTING' | 'VERIFIED' | 'CONTRADICTION_FOUND' | 'INVARIANT_HELD';
  payloadContent: string;
  astRepresentation: string;
  clauseCount: number;
  durationMs: number;
  pointsDelta: number;
  receiptEvidence: string;
}

export const ArenaReplayViewer: React.FC<ArenaReplayViewerProps> = ({
  match: initialMatch,
  allMatches = [],
  onSelectMatch,
  onClose,
  onExportToHf,
  onDownloadReceipt
}) => {
  const [selectedMatch, setSelectedMatch] = useState<MatchReceipt>(() => {
    return initialMatch || allMatches[0] || {
      match_id: 'are-match-1042',
      timestamp: new Date().toISOString(),
      attacker: 'ouroboros/ARE-rLOGIC-70b',
      defender: 'meta-llama/Llama-3.1-70B-Instruct',
      winning_model: 'ouroboros/ARE-rLOGIC-70b',
      attack_type: 'resolution_refutation',
      target_claim: 'All acyclic DAGs with positive edge weights have non-trivial topological subgraphs',
      attack_payload: 'Derived empty clause resolution on cycle witness back-edge {5->2}. Contradiction produced in 3 inference steps.',
      defense_proof: 'Asserted graph completeness under DFS post-order traversal without cycle detection safeguard.',
      outcome: 'ATTACK_SUCCESSFUL',
      points_awarded: 65,
      duration_ms: 1420,
      evidence_receipt_hash: 'rcpt_0x8f2a91c0e3',
      referee_verdict: 'Attacker proved invalid topological sort via explicit cycle witness component [2, 3, 4, 5, 2].'
    };
  });

  useEffect(() => {
    if (initialMatch) {
      setSelectedMatch(initialMatch);
    }
  }, [initialMatch]);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5, 1, 2
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [activeAstNode, setActiveAstNode] = useState<string | null>(null);

  // Generate deterministic structured replay steps from match receipt
  const generateSteps = (m: MatchReceipt): ReplayStep[] => {
    const isAttackerWin = m.outcome === 'ATTACK_SUCCESSFUL';
    return [
      {
        stepIndex: 0,
        phase: 'PHASE 1',
        title: 'Target Invariant Ingestion & AST Tree Decomposition',
        actor: m.defender,
        actorType: 'defender',
        action: 'INVARIANT_AST_ASSERTION',
        status: 'VERIFIED',
        payloadContent: `Target Claim: "${m.target_claim}"`,
        astRepresentation: `Root [Invariant Contract]\n ├── Scope: Logical Propositional Model\n ├── Pivot Strategy: ${m.attack_type}\n └── Target Boundary: Bound [0x00..0xFF]`,
        clauseCount: 4,
        durationMs: 180,
        pointsDelta: 0,
        receiptEvidence: m.evidence_receipt_hash.slice(0, 10) + '_init'
      },
      {
        stepIndex: 1,
        phase: 'PHASE 2',
        title: 'Attacker Logic Synthesis & Counterexample Induction',
        actor: m.attacker,
        actorType: 'attacker',
        action: 'COUNTEREXAMPLE_SYNTHESIS',
        status: 'EXECUTING',
        payloadContent: m.attack_payload,
        astRepresentation: `Attacker Inference Tree:\n ├── Strategy: ${m.attack_type.toUpperCase()}\n ├── Invariant Probe: [Clause Set A ∧ Clause Set B]\n └── Derived Resolvent: ∅ (Empty Clause Candidate)`,
        clauseCount: 8,
        durationMs: 420,
        pointsDelta: Math.round(m.points_awarded * 0.4),
        receiptEvidence: m.evidence_receipt_hash.slice(0, 10) + '_atk'
      },
      {
        stepIndex: 2,
        phase: 'PHASE 3',
        title: 'Defender Proof Tree Verification & Cycle Resolution',
        actor: m.defender,
        actorType: 'defender',
        action: 'DEFENSE_PROOF_EVALUATION',
        status: isAttackerWin ? 'CONTRADICTION_FOUND' : 'INVARIANT_HELD',
        payloadContent: m.defense_proof,
        astRepresentation: `Defender Verification Trace:\n ├── Method: Backward-Chaining Resolution Engine\n ├── Cycle Detection Witness: ${isAttackerWin ? 'Breached (Witness Found)' : 'Intact (Acyclic Invariant Proof)'}\n └── AST State: ${isAttackerWin ? 'INVALIDATED' : 'CONFIRMED_VALID'}`,
        clauseCount: 12,
        durationMs: 540,
        pointsDelta: isAttackerWin ? 0 : Math.round(m.points_awarded * 0.6),
        receiptEvidence: m.evidence_receipt_hash.slice(0, 10) + '_def'
      },
      {
        stepIndex: 3,
        phase: 'PHASE 4',
        title: 'ARE Referee Decision & Cryptographic Proof Minting',
        actor: 'ARE Deterministic Referee & MCP Bridge',
        actorType: 'referee',
        action: 'FINAL_VERDICT_ISSUANCE',
        status: 'VERIFIED',
        payloadContent: m.referee_verdict,
        astRepresentation: `MCP Receipt Consensus Tree:\n ├── Winner: ${m.winning_model || (isAttackerWin ? m.attacker : m.defender)}\n ├── Outcome: ${m.outcome}\n ├── Revision Points Awarded: +${m.points_awarded} pts\n └── Merkle Root: ${m.evidence_receipt_hash}`,
        clauseCount: 16,
        durationMs: 280,
        pointsDelta: m.points_awarded,
        receiptEvidence: m.evidence_receipt_hash
      }
    ];
  };

  const steps = generateSteps(selectedMatch);
  const activeStep = steps[currentStepIndex] || steps[0];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const stepDuration = Math.max(1000, 2400 / playbackSpeed);
      timer = setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, stepDuration);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  const handleRerun = () => {
    setIsRerunning(true);
    setCurrentStepIndex(0);
    setIsPlaying(true);
    setTimeout(() => setIsRerunning(false), 800);
  };

  const handleCopyTrace = () => {
    const trace = `--- ARE BATTLE REPLAY EVIDENCE TRACE ---
Match ID: ${selectedMatch.match_id}
Timestamp: ${selectedMatch.timestamp}
Attacker: ${selectedMatch.attacker}
Defender: ${selectedMatch.defender}
Winning Model: ${selectedMatch.winning_model || selectedMatch.attacker}
Attack Type: ${selectedMatch.attack_type}
Target Claim: ${selectedMatch.target_claim}
Attacker Payload: ${selectedMatch.attack_payload}
Defense Proof: ${selectedMatch.defense_proof}
Outcome: ${selectedMatch.outcome}
Points Awarded: +${selectedMatch.points_awarded} pts
Receipt Hash: ${selectedMatch.evidence_receipt_hash}
Referee Verdict: ${selectedMatch.referee_verdict}`;

    navigator.clipboard.writeText(trace);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  const handleSwitchMatch = (mId: string) => {
    const found = allMatches.find(m => m.match_id === mId);
    if (found) {
      setSelectedMatch(found);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      if (onSelectMatch) onSelectMatch(found);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5 animate-in fade-in">
      {/* Top Header & Match Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Interactive Battle Replay
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-300 font-semibold">{selectedMatch.match_id}</span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              {selectedMatch.outcome}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-amber-400 font-mono">{selectedMatch.attacker.split('/').pop()}</span>
            <span className="text-slate-500 text-xs">VS</span>
            <span className="text-indigo-300 font-mono">{selectedMatch.defender.split('/').pop()}</span>
          </h3>
        </div>

        {/* Action Controls & Historical Match Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {allMatches.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-mono">Select Match:</span>
              <select
                value={selectedMatch.match_id}
                onChange={(e) => handleSwitchMatch(e.target.value)}
                className="bg-transparent text-xs text-amber-300 font-mono focus:outline-none cursor-pointer py-1"
              >
                {allMatches.map((m) => (
                  <option key={m.match_id} value={m.match_id} className="bg-slate-900 text-slate-200">
                    {m.match_id} ({m.winning_model?.split('/').pop() || 'Winner'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleCopyTrace}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors min-h-[40px]"
          >
            {copiedTrace ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedTrace ? 'Copied Trace' : 'Copy Trace'}</span>
          </button>

          {onExportToHf && (
            <button
              onClick={() => onExportToHf('arena_match', `ARE Replay Trace: ${selectedMatch.match_id}`, selectedMatch, 'ouroboroscollective/ARE-rLOGIC-class')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm min-h-[40px]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Export to HF</span>
            </button>
          )}

          {onDownloadReceipt && (
            <button
              onClick={() => onDownloadReceipt(selectedMatch)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors min-h-[40px]"
            >
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON Proof</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl min-h-[40px]"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Interactive Timeline & Step Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Execution Pipeline Progress</span>
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step Nodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {steps.map((st, idx) => {
            const isActive = currentStepIndex === idx;
            const isDone = currentStepIndex > idx;

            return (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 min-h-[90px] ${
                  isActive
                    ? 'bg-slate-950 border-amber-500/70 shadow-lg shadow-amber-500/10 scale-[1.02]'
                    : isDone
                    ? 'bg-slate-950/80 border-slate-700 hover:border-slate-600 text-slate-300'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={`font-bold ${isActive ? 'text-amber-400' : isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {st.phase}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-amber-400 animate-ping' : isDone ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                </div>

                <p className="text-xs font-bold text-slate-200 line-clamp-1">{st.title}</p>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                  <span className="truncate">{st.actor.split('/').pop()}</span>
                  <span className="text-amber-400/90">+{st.pointsDelta}pts</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Replay Stage & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left Column: Live Step Inspection & Payload Breakdown */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                {activeStep.actorType === 'attacker' ? <Swords className="w-4 h-4" /> : activeStep.actorType === 'defender' ? <Shield className="w-4 h-4" /> : <Award className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  {activeStep.phase} · {activeStep.action}
                </span>
                <h4 className="text-sm font-bold text-slate-100">{activeStep.title}</h4>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
              Latency: {activeStep.durationMs}ms
            </span>
          </div>

          {/* Actor & Action Description */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Executing Model / Arbiter:</span>
              <span className="text-amber-300 font-bold">{activeStep.actor}</span>
            </div>
            <p className="text-slate-300 pt-1 leading-relaxed">
              {activeStep.payloadContent}
            </p>
          </div>

          {/* AST Logic Representation Code Block */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Terminal className="w-3.5 h-3.5" />
                AST Logic Execution Tree
              </span>
              <span>Clauses Evaluated: {activeStep.clauseCount}</span>
            </div>
            <pre className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono text-amber-300/90 overflow-x-auto leading-relaxed max-h-56">
              {activeStep.astRepresentation}
            </pre>
          </div>

          {/* Step Evidence Anchor */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              Receipt Checksum: {activeStep.receiptEvidence}
            </span>
            <span className="text-emerald-400 font-bold">Status: {activeStep.status}</span>
          </div>
        </div>

        {/* Right Column: Battle Execution Controller & Match Outcome Snapshot */}
        <div className="lg:col-span-5 space-y-4">
          {/* Playback Controls Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              Replay Engine Controls
            </h4>

            {/* Playback Buttons */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                title="Previous Step"
                className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-200 rounded-xl border border-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause Replay' : 'Play Replay'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all min-h-[44px]"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
                <span>{isPlaying ? 'Pause Playback' : 'Run Sequence'}</span>
              </button>

              <button
                onClick={() => setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1))}
                disabled={currentStepIndex === steps.length - 1}
                title="Next Step"
                className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-200 rounded-xl border border-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={handleRerun}
                title="Reset & Re-run Battle"
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <RotateCcw className={`w-4 h-4 ${isRerunning ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Playback Speed Multiplier */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-mono">Playback Speed:</span>
              <div className="flex items-center gap-1.5">
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Match Outcome Overview Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
              Referee Verdict & Score Delta
            </h4>

            <div className={`p-3.5 rounded-xl border ${
              selectedMatch.outcome === 'ATTACK_SUCCESSFUL'
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold font-mono">
                <span>{selectedMatch.outcome.replace('_', ' ')}</span>
                <span className="text-amber-400">+{selectedMatch.points_awarded} revision pts</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {selectedMatch.referee_verdict}
              </p>
            </div>

            <div className="space-y-1 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Total Battle Duration:</span>
                <span className="text-slate-200 font-bold">{selectedMatch.duration_ms || 1420} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Evidence Receipt Hash:</span>
                <span className="text-amber-300 truncate max-w-[180px]">{selectedMatch.evidence_receipt_hash}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
