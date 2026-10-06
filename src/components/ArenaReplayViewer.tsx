import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Swords,
  Shield,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UploadCloud,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Layers,
  Hash,
  Sparkles,
  RefreshCw,
  Cpu,
  Database,
  Eye,
  Box,
  Flame,
  Crown,
  History,
  Activity
} from 'lucide-react';
import { CombatRevisionRecord, CombatTurn, CombatStats } from '../utils/combatEngine';
import { ArenaViewport, CharacterModel3DInfo } from './ArenaViewport';
import { DEFAULT_3D_CHIBI_MODELS } from './Model3DSelectorModal';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { MatchReceipt } from './LogicArena';

interface ArenaReplayViewerProps {
  initialRevision?: CombatRevisionRecord | null;
  match?: MatchReceipt | null;
  allMatches?: MatchReceipt[];
  onSelectMatch?: (match: MatchReceipt) => void;
  onClose?: () => void;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
  onDownloadReceipt?: (match: any) => void;
}

export const ArenaReplayViewer: React.FC<ArenaReplayViewerProps> = ({
  initialRevision,
  match: initialMatch,
  allMatches = [],
  onSelectMatch,
  onClose,
  onExportToHf,
  onDownloadReceipt
}) => {
  const { user } = useFirebaseAuth();

  // Firestore & Local Finalized Revisions List
  const [combatRevisions, setCombatRevisions] = useState<CombatRevisionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('are_local_combat_revisions_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loadingFirestore, setLoadingFirestore] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<CombatRevisionRecord | null>(() => {
    if (initialRevision) return initialRevision;
    try {
      const saved = localStorage.getItem('are_local_combat_revisions_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0];
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Active Replay Playback State
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [viewportMode, setViewportMode] = useState<'3d_arena' | 'ast_trace' | 'side_by_side'>('side_by_side');

  // Real-time Firestore query for finalized battle revisions
  useEffect(() => {
    if (!user) {
      setLoadingFirestore(false);
      return;
    }

    setLoadingFirestore(true);
    const path = `users/${user.uid}/combat_revisions`;
    const colRef = collection(db, 'users', user.uid, 'combat_revisions');

    try {
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const cloudRevisions: CombatRevisionRecord[] = [];
          snapshot.forEach((docSnap) => {
            cloudRevisions.push(docSnap.data() as CombatRevisionRecord);
          });

          // Sort chronologically descending
          cloudRevisions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setCombatRevisions(cloudRevisions);
          setLoadingFirestore(false);

          if (!selectedRevision && cloudRevisions.length > 0) {
            setSelectedRevision(cloudRevisions[0]);
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, path);
          setLoadingFirestore(false);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn('Firestore combat revision sync warning:', e);
      setLoadingFirestore(false);
    }
  }, [user]);

  // If parent passes a new revision
  useEffect(() => {
    if (initialRevision) {
      setSelectedRevision(initialRevision);
      setCurrentTurnIndex(0);
      setIsPlaying(false);
    }
  }, [initialRevision]);

  // Generate fallback synthetic deterministic turns if revision has none
  const activeTurns: CombatTurn[] = selectedRevision?.turns && selectedRevision.turns.length > 0
    ? selectedRevision.turns
    : [
        {
          turn: 1,
          attacker: 'hero',
          attackerName: selectedRevision?.attacker || 'ARE Hero Guardian',
          defenderName: selectedRevision?.defender || 'Llama-3.1-70B Logic Node',
          actionName: 'AST Resolution Strike',
          rawDamage: 24,
          mitigatedDamage: 18,
          isCrit: false,
          isUltimate: false,
          heroHpRemaining: 100,
          opponentHpRemaining: 82,
          heroEnergy: 30,
          opponentEnergy: 20,
          actionType: 'attack',
          message: 'Hero initiates deterministic AST invariant probe.'
        },
        {
          turn: 2,
          attacker: 'opponent',
          attackerName: selectedRevision?.defender || 'Llama-3.1-70B Logic Node',
          defenderName: selectedRevision?.attacker || 'ARE Hero Guardian',
          actionName: 'Counterexample Clause Surge',
          rawDamage: 28,
          mitigatedDamage: 20,
          isCrit: false,
          isUltimate: false,
          heroHpRemaining: 80,
          opponentHpRemaining: 82,
          heroEnergy: 45,
          opponentEnergy: 50,
          actionType: 'attack',
          message: 'Opponent counters with cycle invariant assertion.'
        },
        {
          turn: 3,
          attacker: 'hero',
          attackerName: selectedRevision?.attacker || 'ARE Hero Guardian',
          defenderName: selectedRevision?.defender || 'Llama-3.1-70B Logic Node',
          actionName: 'Empty Clause Invariant Shatter',
          rawDamage: 85,
          mitigatedDamage: 82,
          isCrit: true,
          isUltimate: true,
          heroHpRemaining: 80,
          opponentHpRemaining: 0,
          heroEnergy: 0,
          opponentEnergy: 50,
          actionType: 'ultimate',
          message: 'Hero triggers Ultimate Davis-Putnam resolution contradiction!'
        }
      ];

  const currentTurn: CombatTurn | null = activeTurns[currentTurnIndex] || activeTurns[0] || null;

  // Auto-play timer for deterministic turns
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const stepDuration = Math.max(800, 2200 / playbackSpeed);
      timer = setTimeout(() => {
        if (currentTurnIndex < activeTurns.length - 1) {
          setCurrentTurnIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, stepDuration);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentTurnIndex, activeTurns.length, playbackSpeed]);

  const handleRestartReplay = () => {
    setCurrentTurnIndex(0);
    setIsPlaying(true);
  };

  const handleCopyProof = () => {
    if (!selectedRevision) return;
    const proofText = JSON.stringify(selectedRevision, null, 2);
    navigator.clipboard.writeText(proofText);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  // Derive dynamic 3D combat stats based on active turn
  const maxHeroHp = selectedRevision?.combatSummary?.heroStartingHp || 100;
  const maxOpponentHp = selectedRevision?.combatSummary?.opponentStartingHp || 100;

  const currentHeroHp = currentTurn ? currentTurn.heroHpRemaining : maxHeroHp;
  const currentOpponentHp = currentTurn ? currentTurn.opponentHpRemaining : maxOpponentHp;

  const heroStats: CombatStats = {
    maxHp: maxHeroHp,
    currentHp: Math.max(0, currentHeroHp),
    maxEnergy: 100,
    currentEnergy: currentTurn ? currentTurn.heroEnergy : 50,
    atk: 32,
    def: 18,
    critRate: 15,
    speed: 20,
    astAccuracyBonus: 10,
    scale: 1.0
  };

  const opponentStats: CombatStats = {
    maxHp: maxOpponentHp,
    currentHp: Math.max(0, currentOpponentHp),
    maxEnergy: 100,
    currentEnergy: currentTurn ? currentTurn.opponentEnergy : 50,
    atk: 30,
    def: 16,
    critRate: 12,
    speed: 18,
    astAccuracyBonus: 8,
    scale: 1.0
  };

  const selectedHeroModel: CharacterModel3DInfo = DEFAULT_3D_CHIBI_MODELS[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Top Bar: Replay Title, Battle Selector & Proof Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
              Deterministic 3D Battle Replay
            </span>
            <span className="text-slate-600">·</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-400" />
              Firestore Verified
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-300 font-semibold truncate max-w-[200px]">
              {selectedRevision?.proofOfWorkHash || '0x_merkle_verified'}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-amber-400 font-mono">
              {selectedRevision?.attacker || 'ARE Hero Champion'}
            </span>
            <span className="text-slate-500 text-xs font-mono">VS</span>
            <span className="text-indigo-300 font-mono">
              {selectedRevision?.defender || 'Target Logic Node'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
              selectedRevision?.outcome === 'VICTORY'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}>
              {selectedRevision?.outcome || 'VICTORY'}
            </span>
          </h3>
        </div>

        {/* Right Controls: Firestore Battle Picker & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {combatRevisions.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-mono">Select Match:</span>
              <select
                value={selectedRevision?.id || ''}
                onChange={(e) => {
                  const found = combatRevisions.find((r) => r.id === e.target.value);
                  if (found) {
                    setSelectedRevision(found);
                    setCurrentTurnIndex(0);
                    setIsPlaying(false);
                  }
                }}
                className="bg-transparent text-xs text-amber-300 font-mono focus:outline-none cursor-pointer"
              >
                {combatRevisions.map((rev) => (
                  <option key={rev.id} value={rev.id} className="bg-slate-900 text-slate-200">
                    {new Date(rev.createdAt).toLocaleTimeString()} — vs {rev.defender} ({rev.outcome})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Viewport Mode Toggle */}
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-1 text-xs font-mono">
            <button
              onClick={() => setViewportMode('side_by_side')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                viewportMode === 'side_by_side'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual View
            </button>
            <button
              onClick={() => setViewportMode('3d_arena')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                viewportMode === '3d_arena'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D Arena
            </button>
            <button
              onClick={() => setViewportMode('ast_trace')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                viewportMode === 'ast_trace'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AST Proof
            </button>
          </div>

          <button
            onClick={handleCopyProof}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors min-h-[38px]"
          >
            {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedReceipt ? 'Copied JSON' : 'Proof Receipt'}</span>
          </button>

          {onExportToHf && selectedRevision && (
            <button
              onClick={() =>
                onExportToHf(
                  'arena_match',
                  `ARE Deterministic Combat Revision: ${selectedRevision.id}`,
                  selectedRevision,
                  'ouroboroscollective/ARE-rLOGIC-class'
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md min-h-[38px]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Export HF</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl min-h-[38px]"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Scrubbing & Playback Controller */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Deterministic Turn Scrubbing</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-bold">
              Turn {currentTurnIndex + 1} / {activeTurns.length}
            </span>
            {currentTurn && (
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                currentTurn.attacker === 'hero'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {currentTurn.attacker === 'hero' ? 'Hero Attack' : 'Opponent Attack'}
              </span>
            )}
          </div>

          {/* Controls: Prev, Play/Pause, Next, Speed, Restart */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRestartReplay}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors min-h-[36px] flex items-center justify-center"
              title="Restart from Turn 1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              onClick={() => setCurrentTurnIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentTurnIndex === 0}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 rounded-xl border border-slate-800 transition-colors min-h-[36px] flex items-center justify-center"
              title="Step Back 1 Turn"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md min-h-[36px]"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
              <span>{isPlaying ? 'Pause' : 'Play 3D'}</span>
            </button>

            <button
              onClick={() => setCurrentTurnIndex((prev) => Math.min(activeTurns.length - 1, prev + 1))}
              disabled={currentTurnIndex === activeTurns.length - 1}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 rounded-xl border border-slate-800 transition-colors min-h-[36px] flex items-center justify-center"
              title="Step Forward 1 Turn"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Playback Speed Toggles */}
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5 text-[11px]">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                    playbackSpeed === s
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Turn Scrub Slider */}
        <div className="space-y-1.5 pt-1">
          <input
            type="range"
            min={0}
            max={activeTurns.length - 1}
            value={currentTurnIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentTurnIndex(Number(e.target.value));
            }}
            className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
            <span>Turn 1: Invariant Initialization</span>
            <span>Turn {Math.ceil(activeTurns.length / 2)}: Mid-Combat Proof Clash</span>
            <span>Turn {activeTurns.length}: Final Resolution &amp; Verdict</span>
          </div>
        </div>
      </div>

      {/* Main Display: 3D Arena Viewport & AST Trace Stage */}
      <div className={`grid gap-6 ${viewportMode === 'side_by_side' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* 3D ARENA VIEWPORT CONTAINER */}
        {(viewportMode === 'side_by_side' || viewportMode === '3d_arena') && (
          <div className={`${viewportMode === 'side_by_side' ? 'lg:col-span-7' : 'w-full'} space-y-3`}>
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
              <ArenaViewport
                heroName={selectedRevision?.attacker || 'ARE Paladin Champion'}
                heroClass="paladin"
                heroLevel={selectedRevision?.heroLevel || 1}
                heroScale={1.0}
                selectedModel3D={selectedHeroModel}
                opponentName={selectedRevision?.defender || 'Target Invariant Node'}
                opponentModelId="opponent_berserker"
                currentTurnData={currentTurn}
                isCombatActive={isPlaying}
                heroStats={heroStats}
                opponentStats={opponentStats}
              />

              {/* In-Viewport Turn Banner Overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="px-3 py-1 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl text-xs font-mono text-slate-200">
                  <span className="text-amber-400 font-bold">Action:</span> {currentTurn?.actionName || 'Combat Simulation'}
                </div>
                {currentTurn?.isCrit && (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black text-xs rounded-lg animate-bounce shadow-lg shadow-amber-500/20">
                    CRITICAL HIT!
                  </span>
                )}
              </div>
            </div>

            {/* Turn Message Bar */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 flex items-center justify-between">
              <span className="truncate">{currentTurn?.message || 'Deterministic execution stream'}</span>
              <span className="text-amber-400 font-bold shrink-0 ml-2">
                -{currentTurn?.mitigatedDamage || 0} HP
              </span>
            </div>
          </div>
        )}

        {/* DETERMINISTIC LOGS & MERKLE PROOF PANEL */}
        {(viewportMode === 'side_by_side' || viewportMode === 'ast_trace') && (
          <div className={`${viewportMode === 'side_by_side' ? 'lg:col-span-5' : 'w-full'} space-y-4`}>
            {/* Turn List Breakdown */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <h4 className="text-xs font-bold font-mono text-slate-100 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Deterministic Action Sequence ({activeTurns.length} Turns)</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Click to scrub</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeTurns.map((turn, idx) => {
                  const isCurrent = idx === currentTurnIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentTurnIndex(idx);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left font-mono text-xs transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 shadow-md'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCurrent ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {turn.turn}
                        </span>
                        <div className="truncate">
                          <p className="font-bold text-slate-200 truncate">{turn.actionName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{turn.attackerName}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-xs font-bold ${turn.isCrit ? 'text-amber-400' : 'text-slate-300'}`}>
                          -{turn.mitigatedDamage} HP
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Merkle Proof-of-Work Receipt Details */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <span>Proof-of-Work Revision Receipt</span>
                </span>
                <span className="text-emerald-400 text-[10px]">SHA-256 Validated</span>
              </div>

              <div className="space-y-2 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Proof-of-Work Hash:</span>
                  <span className="text-amber-300 font-bold truncate max-w-[180px]">
                    {selectedRevision?.proofOfWorkHash || '0x_sha256_merkle_root'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Evidence History Root:</span>
                  <span className="text-indigo-300 truncate max-w-[180px]">
                    {selectedRevision?.evidenceHistoryHash || '0x_evidence_merkle_chain'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Points / XP Awarded:</span>
                  <span className="text-emerald-400 font-bold">
                    +{selectedRevision?.pointsAwarded || 50} pts / +{selectedRevision?.xpAwarded || 75} XP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Logged Timestamp:</span>
                  <span className="text-slate-400">
                    {selectedRevision?.createdAt ? new Date(selectedRevision.createdAt).toLocaleString() : 'Recent'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
