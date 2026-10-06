import React, { useState, useEffect } from 'react';
import { Swords, Shield, Trophy, Award, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Terminal, Copy, Check, Hash, Sparkles, Cpu, BookOpen, Download, BarChart3, ListFilter, UploadCloud, ExternalLink, Play, Link2, Crown, UserCheck, Flame, History, X, Medal, Gamepad2 } from 'lucide-react';
import { ArenaChartsDashboard } from './ArenaChartsDashboard';
import { BattleLogsTable } from './BattleLogsTable';
import { ArenaReplayViewer } from './ArenaReplayViewer';
import { ArenaMerkleChain } from './ArenaMerkleChain';
import { GlobalDatasetLeaderboard } from './GlobalDatasetLeaderboard';
import { RpgAutoBattler } from './RpgAutoBattler';
import { LogicArenaCombatVisualizer } from './LogicArenaCombatVisualizer';
import { BattleSummaryCard } from './BattleSummaryCard';

interface ArenaParticipant {
  rank: number;
  model_id: string;
  name: string;
  org: string;
  elo: number;
  wins: number;
  losses: number;
  evidence_points: number;
  ast_accuracy: number;
  last_receipt_hash: string;
}

export interface MatchReceipt {
  match_id: string;
  timestamp: string;
  attacker: string;
  defender: string;
  winning_model?: string;
  attack_type: string;
  target_claim: string;
  attack_payload: string;
  defense_proof: string;
  outcome: 'ATTACK_SUCCESSFUL' | 'DEFENSE_HELD_VALID';
  points_awarded: number;
  duration_ms?: number;
  evidence_receipt_hash: string;
  referee_verdict: string;
}

export interface CombatThroneItem {
  dataset_id: string;
  dataset_name: string;
  author: string;
  owner_hf_account: string;
  current_champion_model: string;
  champion_org: string;
  champion_score: number;
  evidence_revision_points: number;
  undefeated_streak: number;
  last_receipt_hash: string;
  last_deposed_at: string;
  combat_status: 'UNDEFEATED_CHAMPION' | 'UNDER_CHALLENGE' | 'DEPOSED_RECENTLY';
  challenger_queue_count: number;
  top_target_claim: string;
  recent_depose_events: Array<{
    timestamp: string;
    deposed_champion: string;
    new_champion: string;
    winning_score: number;
    receipt_hash: string;
    challenger_account?: string;
  }>;
}

interface LogicArenaProps {
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
  onSelectForVisualizer?: (datasetId: string) => void;
  onSelectForPipeline?: (datasetId: string) => void;
}

export const LogicArena: React.FC<LogicArenaProps> = ({ onExportToHf, onSelectForVisualizer, onSelectForPipeline }) => {
  const [activeTab, setActiveTab] = useState<'rpg_battler' | 'battle' | 'throne' | 'dataset_leaderboard' | 'history' | 'replay' | 'merkle_chain' | 'leaderboard' | 'charts' | 'receipts' | 'mcp_docs'>('rpg_battler');
  const [leaderboard, setLeaderboard] = useState<ArenaParticipant[]>([]);
  const [matches, setMatches] = useState<MatchReceipt[]>([]);
  const [thrones, setThrones] = useState<CombatThroneItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [battleLoading, setBattleLoading] = useState(false);
  const [lastBattleResult, setLastBattleResult] = useState<MatchReceipt | null>(null);
  const [selectedReplayMatch, setSelectedReplayMatch] = useState<MatchReceipt | null>(null);

  // Battle Configuration
  const [attackerModel, setAttackerModel] = useState('ouroboros/ARE-rLOGIC-70b');
  const [defenderModel, setDefenderModel] = useState('gemini-3.1-pro-preview');
  const [attackType, setAttackType] = useState('resolution_refutation');
  const [targetClaim, setTargetClaim] = useState(
    'Recursive SAT model assignment is minimal under Davis-Putnam resolution'
  );
  const [customPayload, setCustomPayload] = useState(
    'Deriving empty clause contradiction via resolution refutation on cycle invariants'
  );
  const [copiedReceiptId, setCopiedReceiptId] = useState<string | null>(null);

  // Fight to Depose Modal State
  const [deposeModalOpen, setDeposeModalOpen] = useState(false);
  const [selectedThrone, setSelectedThrone] = useState<CombatThroneItem | null>(null);
  const [deposeChallengerModel, setDeposeChallengerModel] = useState('ouroboros/ARE-rLOGIC-70b');
  const [deposeAccount, setDeposeAccount] = useState('ouroboroscollective');
  const [deposeAttackType, setDeposeAttackType] = useState('resolution_refutation');
  const [deposeClaim, setDeposeClaim] = useState('');
  const [deposePayload, setDeposePayload] = useState('');
  const [deposeLoading, setDeposeLoading] = useState(false);
  const [deposeResult, setDeposeResult] = useState<any | null>(null);

  const fetchArenaData = async () => {
    setLoading(true);
    try {
      const [resLeaderboard, resMatches, resThrones] = await Promise.all([
        fetch('/api/arena/leaderboard'),
        fetch('/api/arena/matches'),
        fetch('/api/arena/thrones')
      ]);
      const dataL = await resLeaderboard.json();
      const dataM = await resMatches.json();
      const dataT = await resThrones.json();
      setLeaderboard(dataL.leaderboard || []);
      setMatches(dataM.matches || []);
      setThrones(dataT.thrones || []);
    } catch (err) {
      console.error('Failed to load arena data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArenaData();
  }, []);

  const handleExecuteBattle = async () => {
    if (attackerModel === defenderModel) {
      alert('Please choose two distinct player models for the logic battle.');
      return;
    }

    setBattleLoading(true);
    try {
      const res = await fetch('/api/arena/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attacker_model_id: attackerModel,
          defender_model_id: defenderModel,
          attack_type: attackType,
          target_claim: targetClaim,
          custom_payload: customPayload
        })
      });

      const data = await res.json();
      if (data.match) {
        setLastBattleResult(data.match);
        setMatches(prev => [data.match, ...prev]);
        if (data.updated_leaderboard) {
          setLeaderboard(data.updated_leaderboard);
        }

        // Sync XP to persistent player hero profile
        try {
          const saved = localStorage.getItem('are_rpg_hero_profile_v2');
          if (saved) {
            const hero = JSON.parse(saved);
            const xpGained = data.match.points_awarded || 100;
            let newXp = (hero.currentXp || 0) + xpGained;
            let newLevel = hero.level || 1;
            let newStatPoints = hero.statPointsAvailable || 0;
            const getXpNeeded = (lvl: number) => Math.round(100 * Math.pow(1.3, lvl - 1));
            while (newXp >= getXpNeeded(newLevel)) {
              newXp -= getXpNeeded(newLevel);
              newLevel += 1;
              newStatPoints += 3;
            }
            const updatedHero = {
              ...hero,
              level: newLevel,
              currentXp: newXp,
              statPointsAvailable: newStatPoints,
              totalBattles: (hero.totalBattles || 0) + 1,
              totalWins: data.match.outcome === 'ATTACK_SUCCESSFUL' ? (hero.totalWins || 0) + 1 : (hero.totalWins || 0),
              revisionPoints: (hero.revisionPoints || 100) + xpGained
            };
            localStorage.setItem('are_rpg_hero_profile_v2', JSON.stringify(updatedHero));
          }
        } catch (e) {
          console.warn('Hero XP sync error:', e);
        }
      }
    } catch (err: any) {
      alert('Battle execution error: ' + err.message);
    } finally {
      setBattleLoading(false);
    }
  };

  const handleOpenDeposeModal = (throne: CombatThroneItem) => {
    setSelectedThrone(throne);
    setDeposeClaim(throne.top_target_claim || `Refuting invariant bounds for ${throne.dataset_id}`);
    setDeposePayload(`Construct resolution contradiction witness [0x${Math.random().toString(16).slice(2, 8)}]`);
    setDeposeResult(null);
    setDeposeModalOpen(true);
  };

  const handleQuickFightThrone = () => {
    const targetThrone = thrones.find(t => t.combat_status === 'UNDEFEATED_CHAMPION') || thrones[0];
    if (targetThrone) {
      handleOpenDeposeModal(targetThrone);
    } else {
      setActiveTab('throne');
    }
  };

  const handleExecuteDepose = async () => {
    if (!selectedThrone) return;
    setDeposeLoading(true);
    try {
      const res = await fetch('/api/arena/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedThrone.dataset_id,
          challenger_hf_account: deposeAccount || 'challenger',
          challenger_model_id: deposeChallengerModel,
          attack_type: deposeAttackType,
          target_claim: deposeClaim,
          custom_payload: deposePayload
        })
      });

      const data = await res.json();
      setDeposeResult(data);
      if (data.match) {
        setMatches(prev => [data.match, ...prev]);
      }
      if (data.throne) {
        setThrones(prev => prev.map(t => t.dataset_id === data.throne.dataset_id ? data.throne : t));
      }
    } catch (e: any) {
      alert('Depose fight error: ' + e.message);
    } finally {
      setDeposeLoading(false);
    }
  };

  const attackPresets = [
    {
      type: 'resolution_refutation',
      claim: 'Topological sort invariant holds on all weighted DAGs',
      payload: 'Construct counter-witness edge pair [5->2] producing cycle component {2,3,4,5}'
    },
    {
      type: 'counterexample_induction',
      claim: 'Minimal clause resolvent is sound under non-blocking backtracks',
      payload: 'Generate assignment model {A: False, B: True, C: False} violating clause invariant'
    },
    {
      type: 'ast_invariant_violation',
      claim: 'AST tree depth is strictly bounded by log2(N) in recursive logic branching',
      payload: 'Construct degenerate linear chain tree of depth N, violating log-depth proof'
    }
  ];

  const handleSelectPreset = (p: typeof attackPresets[0]) => {
    setAttackType(p.type);
    setTargetClaim(p.claim);
    setCustomPayload(p.payload);
  };

  const handleCopyReceipt = (match: MatchReceipt) => {
    navigator.clipboard.writeText(JSON.stringify(match, null, 2));
    setCopiedReceiptId(match.match_id);
    setTimeout(() => setCopiedReceiptId(null), 2000);
  };

  const handleDownloadMatchExport = async (match: MatchReceipt) => {
    try {
      const res = await fetch(`/api/arena/matches/${match.match_id}/export`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${match.match_id}_evidence_summary.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Fallback to local export:', e);
    }

    const exportObject = {
      match_id: match.match_id,
      timestamp: match.timestamp,
      protocol_version: 'ARE-MCP-v1.4',
      participants: {
        attacker: match.attacker,
        defender: match.defender,
        winner: match.winning_model || match.attacker
      },
      combat_spec: {
        attack_type: match.attack_type,
        target_claim: match.target_claim,
        duration_ms: match.duration_ms || 1200
      },
      logic_path: {
        attack_payload: match.attack_payload,
        defense_proof: match.defense_proof,
        referee_verdict: match.referee_verdict
      },
      evidence_revision: {
        outcome: match.outcome,
        logic_points_awarded: match.points_awarded,
        receipt_hash: match.evidence_receipt_hash,
        ast_verification_status: 'VERIFIED_DETERMINISTIC'
      }
    };

    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${match.match_id}_evidence_summary.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30 rounded-xl text-amber-400">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                ARE Logic Arena & LLM Tournament
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic reasoning battles, Combat Throne champion defense, Recharts visualizer, and verifiable audit ledger.
              </p>
            </div>
          </div>

          {/* Sub Navigation with Touch-to-Scroll */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto touch-scroll-x scrollbar-none w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('rpg_battler')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'rpg_battler'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black'
                  : 'text-amber-400 hover:text-amber-300 font-bold'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span>🎮 RPG Auto-Battler & Hero</span>
            </button>

            <button
              onClick={() => setActiveTab('battle')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'battle'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Live Battle</span>
            </button>

            <button
              onClick={() => setActiveTab('throne')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'throne'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Combat Throne ({thrones.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('dataset_leaderboard')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'dataset_leaderboard'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Medal className="w-4 h-4 text-amber-400" />
              <span>Dataset Leaderboard & Medals</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Match History ({matches.length})</span>
            </button>

            <button
              onClick={() => {
                if (!selectedReplayMatch && matches.length > 0) {
                  setSelectedReplayMatch(matches[0]);
                }
                setActiveTab('replay');
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'replay'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Battle Replay</span>
            </button>

            <button
              onClick={() => setActiveTab('merkle_chain')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'merkle_chain'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Merkle Chain</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Rangliste</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'charts'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Charts</span>
            </button>

            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'receipts'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>Receipts</span>
            </button>

            <button
              onClick={() => setActiveTab('mcp_docs')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'mcp_docs'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Protocol</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 0: RPG AUTO-BATTLER & HERO GROWTH */}
      {activeTab === 'rpg_battler' && (
        <RpgAutoBattler
          onExportToHf={onExportToHf}
          availableOpponents={leaderboard}
        />
      )}

      {/* TAB 1: LIVE BATTLE */}
      {activeTab === 'battle' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              Configure LLM Logic Match
            </h3>

            {/* Model Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Swords className="w-3 h-3 text-amber-400" />
                  <span>Attacker Model</span>
                </label>
                <select
                  value={attackerModel}
                  onChange={(e) => setAttackerModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 min-h-[38px]"
                >
                  {leaderboard.map((m) => (
                    <option key={m.model_id} value={m.model_id}>
                      {m.name} ({m.elo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span>Defender Model</span>
                </label>
                <select
                  value={defenderModel}
                  onChange={(e) => setDefenderModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 min-h-[38px]"
                >
                  {leaderboard.map((m) => (
                    <option key={m.model_id} value={m.model_id}>
                      {m.name} ({m.elo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attack Action Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Logic Attack Action Type:</label>
              <select
                value={attackType}
                onChange={(e) => setAttackType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 min-h-[38px]"
              >
                <option value="resolution_refutation">Resolution Refutation (AST Clause Contradiction)</option>
                <option value="counterexample_induction">Counterexample Induction (Satisfying Model Search)</option>
                <option value="ast_invariant_violation">AST Invariant Violation (Recursive Logic Graph Breach)</option>
              </select>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Invariant Attack Presets:
              </span>
              <div className="space-y-1.5">
                {attackPresets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    className="w-full text-left p-2 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/30 text-[11px] text-slate-300 hover:text-amber-300 transition-colors"
                  >
                    <div className="font-semibold text-amber-400/90">{p.type}</div>
                    <div className="truncate text-slate-400">{p.claim}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Claim */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Target Claim / Hypothesis:</label>
              <textarea
                value={targetClaim}
                onChange={(e) => setTargetClaim(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Custom Payload */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Attacker's Logic Attack Payload:</label>
              <textarea
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecuteBattle}
              disabled={battleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {battleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Referee Verifying Battle Outcome...</span>
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" />
                  <span>Simulate Logic Attack Match</span>
                </>
              )}
            </button>
          </div>

          {/* Results & Live Match View */}
          <div className="lg:col-span-7 space-y-4">
            {/* Animated RPG Logic Duel Visualizer */}
            <LogicArenaCombatVisualizer
              attackerModel={attackerModel}
              defenderModel={defenderModel}
              attackType={attackType}
              targetClaim={targetClaim}
              customPayload={customPayload}
              isEvaluating={battleLoading}
              matchResult={lastBattleResult}
              attackerElo={leaderboard.find(m => m.model_id === attackerModel)?.elo || 2180}
              defenderElo={leaderboard.find(m => m.model_id === defenderModel)?.elo || 2145}
              attackerRecord={`${leaderboard.find(m => m.model_id === attackerModel)?.wins || 18}W - ${leaderboard.find(m => m.model_id === attackerModel)?.losses || 1}L`}
              defenderRecord={`${leaderboard.find(m => m.model_id === defenderModel)?.wins || 15}W - ${leaderboard.find(m => m.model_id === defenderModel)?.losses || 3}L`}
            />

            {lastBattleResult ? (
              <BattleSummaryCard
                match={lastBattleResult}
                attackerElo={leaderboard.find(m => m.model_id === attackerModel)?.elo || 2180}
                defenderElo={leaderboard.find(m => m.model_id === defenderModel)?.elo || 2145}
                attackerName={leaderboard.find(m => m.model_id === attackerModel)?.name}
                defenderName={leaderboard.find(m => m.model_id === defenderModel)?.name}
                onExportToHf={onExportToHf}
                onDownloadReceipt={handleDownloadMatchExport}
                onRematch={handleExecuteBattle}
              />
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-mono">
                Configure participants on the left and click "Simulate Logic Attack Match" to trigger the RPG sequence and generate a Battle Summary!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COMBAT THRONE */}
      {activeTab === 'throne' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>The Combat Throne — Undefeated Champions by Dataset</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only the reigning champion with the highest score sits on the throne. Any model can launch a fight to depose them!
                </p>
              </div>

              <button
                onClick={fetchArenaData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors self-start md:self-auto min-h-[38px]"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Refresh Thrones</span>
              </button>
            </div>
          </div>

          {/* Grid of Combat Thrones */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {thrones.map((throne) => (
              <div
                key={throne.dataset_id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden group"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                        {throne.author}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 font-mono truncate">
                        {throne.dataset_id}
                      </h4>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      {throne.champion_score} pts
                    </span>
                  </div>

                  {/* Reigning Champion Spotlight */}
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Reigning Undefeated Champion</span>
                      <span className="text-emerald-400 font-mono font-bold">{throne.undefeated_streak}W Streak</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-300 truncate">
                        {throne.current_champion_model}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {throne.champion_org}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Evidence Pts: {throne.evidence_revision_points}</span>
                      <span>Last: {throne.last_receipt_hash}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Claim: "{throne.top_target_claim}"
                  </p>

                  {/* Recent Depose History */}
                  {throne.recent_depose_events && throne.recent_depose_events.length > 0 && (
                    <div className="text-[10px] text-slate-400 space-y-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                      <span className="font-semibold text-slate-300">Recent Depose:</span>
                      <p className="truncate font-mono text-rose-400/90">
                        {throne.recent_depose_events[0].deposed_champion} ➔ {throne.recent_depose_events[0].new_champion}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Status: {throne.combat_status}
                  </span>

                  <button
                    onClick={() => handleOpenDeposeModal(throne)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-500 via-amber-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 min-h-[40px]"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Fight to Depose</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMBAT THRONE */}
      {/* (Throne content above) */}

      {/* TAB: DATASET LEADERBOARD & MEDALS OF HONOR */}
      {activeTab === 'dataset_leaderboard' && (
        <GlobalDatasetLeaderboard
          onSelectForVisualizer={onSelectForVisualizer}
          onSelectForPipeline={onSelectForPipeline}
          onChallengeThrone={(dsId) => {
            const targetThrone = thrones.find(t => t.dataset_id === dsId);
            if (targetThrone) {
              handleOpenDeposeModal(targetThrone);
            } else {
              setActiveTab('throne');
            }
          }}
          onExportToHf={onExportToHf}
        />
      )}

      {/* TAB: HISTORICAL MATCH HISTORY (CLEAN MOBILE TABLE) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  <span>Historical Match History</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full verified log of tournament battles, evidence revision points, and referee decisions.
                </p>
              </div>

              {onExportToHf && (
                <button
                  onClick={() => onExportToHf('arena_tournament', 'ARE Tournament Complete Match History', matches, 'ouroboroscollective/ARE-rLOGIC-class')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors min-h-[38px]"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Export All to HF</span>
                </button>
              )}
            </div>
          </div>

          <BattleLogsTable
            matches={matches}
            onExportMatch={handleDownloadMatchExport}
            onExportToHf={onExportToHf ? (m) => onExportToHf('arena_match', `ARE Match Receipt: ${m.match_id}`, m, 'ouroboroscollective/ARE-rLOGIC-class') : undefined}
            onViewReplay={(m) => {
              setSelectedReplayMatch(m);
              setActiveTab('replay');
            }}
          />
        </div>
      )}

      {/* TAB 4: BATTLE REPLAY */}
      {activeTab === 'replay' && (
        <ArenaReplayViewer
          match={selectedReplayMatch || matches[0]}
          allMatches={matches}
          onSelectMatch={(m) => setSelectedReplayMatch(m)}
          onDownloadReceipt={handleDownloadMatchExport}
          onExportToHf={onExportToHf}
        />
      )}

      {/* TAB 5: MERKLE CHAIN */}
      {activeTab === 'merkle_chain' && (
        <ArenaMerkleChain
          matches={matches}
          onExportToHf={onExportToHf}
        />
      )}

      {/* TAB 6: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>ARE Season 4 Tournament Rangliste</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated across formal SAT resolution, invariant checks, and counterexample induction.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                  <th className="p-3 w-12 text-center">Rank</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Organization</th>
                  <th className="p-3 text-right">Elo Rating</th>
                  <th className="p-3 text-right">Record (W-L)</th>
                  <th className="p-3 text-right">Evidence Pts</th>
                  <th className="p-3 text-right">AST Accuracy</th>
                  <th className="p-3 text-right">Last Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {leaderboard.map((m) => (
                  <tr key={m.model_id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 text-center font-bold text-amber-400">#{m.rank}</td>
                    <td className="p-3 font-semibold text-slate-200">{m.name}</td>
                    <td className="p-3 text-slate-400">{m.org}</td>
                    <td className="p-3 text-right font-bold text-amber-300">{m.elo}</td>
                    <td className="p-3 text-right text-slate-300">{m.wins}W - {m.losses}L</td>
                    <td className="p-3 text-right text-emerald-400 font-semibold">{m.evidence_points}</td>
                    <td className="p-3 text-right text-slate-300">{m.ast_accuracy}%</td>
                    <td className="p-3 text-right text-slate-500">{m.last_receipt_hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: CHARTS */}
      {activeTab === 'charts' && (
        <ArenaChartsDashboard leaderboard={leaderboard} />
      )}

      {/* TAB 8: RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Hash className="w-5 h-5 text-amber-400" />
              <span>Immutable Evidence Receipts Ledger ({matches.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => (
                <div key={m.match_id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{m.match_id}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{m.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono truncate">{m.evidence_receipt_hash}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">{m.referee_verdict}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <span className="text-emerald-400 font-mono">+{m.points_awarded} pts</span>
                    <button
                      onClick={() => handleCopyReceipt(m)}
                      className="text-amber-400 hover:text-amber-300 font-medium"
                    >
                      Copy JSON
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: MCP PROTOCOL DOCS */}
      {activeTab === 'mcp_docs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <span>Model Context Protocol (MCP) Arena Invariant Specification</span>
          </h3>
          <p className="text-xs text-slate-400">
            ARE uses the official Model Context Protocol to bridge local agents to external reasoning benchmarks and Hugging Face datasets.
          </p>
          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300/90 overflow-x-auto">
{`// MCP Tool Signature
{
  "name": "are_logic_attack",
  "description": "Execute an ARE logic attack action against an invariant claim",
  "inputSchema": {
    "type": "object",
    "properties": {
      "attacker_model": { "type": "string" },
      "defender_model": { "type": "string" },
      "attack_type": { "type": "string", "enum": ["resolution_refutation", "counterexample_induction", "ast_invariant_violation"] },
      "target_claim": { "type": "string" },
      "logic_payload": { "type": "string" }
    },
    "required": ["attacker_model", "target_claim", "logic_payload"]
  }
}`}
          </pre>
        </div>
      )}

      {/* FIGHT TO DEPOSE MODAL */}
      {deposeModalOpen && selectedThrone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Fight to Depose Champion</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Challenging throne on <span className="font-mono text-amber-300">{selectedThrone.dataset_id}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDeposeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> Reigning Champion to Dethrone
                  </span>
                  <p className="text-sm font-bold text-slate-100 font-mono">{selectedThrone.current_champion_model}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Champion Score</span>
                  <p className="text-lg font-mono font-bold text-amber-400">{selectedThrone.champion_score} pts</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Challenger Hugging Face Account</label>
                <input
                  type="text"
                  value={deposeAccount}
                  onChange={(e) => setDeposeAccount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Challenger Model</label>
                <select
                  value={deposeChallengerModel}
                  onChange={(e) => setDeposeChallengerModel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Logic Reasoning)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (High Thinking)</option>
                  <option value="ouroboros/ARE-rLOGIC-70b">ouroboros/ARE-rLOGIC-70b (Resolution Engine)</option>
                  <option value="deepseek-ai/DeepSeek-R1">deepseek-ai/DeepSeek-R1 (Chain-of-Thought)</option>
                  <option value="meta-llama/Llama-3.1-70B-Instruct">meta-llama/Llama-3.1-70B-Instruct</option>
                  <option value="Qwen/Qwen2.5-Coder-32B">Qwen/Qwen2.5-Coder-32B (AST Parser)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Strategy</label>
                <select
                  value={deposeAttackType}
                  onChange={(e) => setDeposeAttackType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="resolution_refutation">Resolution Refutation (Derive empty clause contradiction)</option>
                  <option value="counterexample_induction">Counterexample Induction (Violate invariant bounds)</option>
                  <option value="ast_invariant_violation">AST Invariant Violation (Tree depth & cycle breach)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Claim</label>
                <input
                  type="text"
                  value={deposeClaim}
                  onChange={(e) => setDeposeClaim(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Attack Payload</label>
                <textarea
                  value={deposePayload}
                  onChange={(e) => setDeposePayload(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              {deposeResult && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  deposeResult.deposed
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      {deposeResult.deposed ? <Crown className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {deposeResult.deposed ? 'CHAMPION DEPOSED! NEW RULER ON THRONE' : 'CHAMPION DEFENDED THRONE'}
                    </span>
                    <span className="font-mono text-xs font-bold">
                      New Score: {deposeResult.score} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {deposeResult.match?.referee_verdict}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                    <span>Receipt: {deposeResult.match?.evidence_receipt_hash}</span>
                    <span>Winner: {deposeResult.champion}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
              <button
                onClick={() => setDeposeModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 min-h-[42px]"
              >
                Close
              </button>

              <button
                onClick={handleExecuteDepose}
                disabled={deposeLoading}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 min-h-[42px]"
              >
                {deposeLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Depose Combat...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>Execute Fight to Depose</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM SHORTCUT BAR WITH QUICK FIGHT */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 p-2 px-3 flex items-center justify-between gap-2 shadow-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll-x scrollbar-none py-0.5">
          <button
            onClick={() => setActiveTab('rpg_battler')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 transition-colors ${
              activeTab === 'rpg_battler' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 bg-slate-900 border border-slate-800'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>RPG</span>
          </button>
          <button
            onClick={() => setActiveTab('battle')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 transition-colors ${
              activeTab === 'battle' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 bg-slate-900 border border-slate-800'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Battle</span>
          </button>
          <button
            onClick={() => setActiveTab('throne')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 transition-colors ${
              activeTab === 'throne' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 bg-slate-900 border border-slate-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Throne</span>
          </button>
        </div>

        {/* QUICK FIGHT SHORTCUT BUTTON */}
        <button
          onClick={handleQuickFightThrone}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-500 via-amber-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all min-h-[44px] shrink-0"
          title="Instant Quick Fight: Challenge current reigning dataset throne champion"
        >
          <Flame className="w-4 h-4 fill-slate-950 animate-pulse" />
          <span>⚡ Quick Fight</span>
        </button>
      </div>
    </div>
  );
};
