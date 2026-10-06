import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListFilter,
  Play,
  CheckCircle2,
  Clock,
  Zap,
  Trash2,
  Sparkles,
  Swords,
  Shield,
  Box,
  Crown,
  Layers,
  ArrowRight,
  RefreshCw,
  Award,
  AlertCircle
} from 'lucide-react';
import { CharacterModel3DInfo } from './ArenaViewport';
import { DEFAULT_3D_CHIBI_MODELS } from './Model3DSelectorModal';
import { MatchQueueItem, MatchQueueService, QueuedFighterInfo } from '../utils/matchQueueService';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface MatchQueueVisualizerProps {
  unlockedFighters?: CharacterModel3DInfo[];
  heroLevel?: number;
  onLoadMatchInto3D?: (item: MatchQueueItem) => void;
}

export const MatchQueueVisualizer: React.FC<MatchQueueVisualizerProps> = ({
  unlockedFighters = DEFAULT_3D_CHIBI_MODELS,
  heroLevel = 1,
  onLoadMatchInto3D
}) => {
  const { user } = useFirebaseAuth();

  // Selected Fighters for new Queue
  const [selectedFighter1Id, setSelectedFighter1Id] = useState<string>(unlockedFighters[0]?.id || 'chibi_paladin_aegis');
  const [selectedFighter2Id, setSelectedFighter2Id] = useState<string>(unlockedFighters[1]?.id || 'chibi_archmage_ast');

  // Queue State
  const [queueItems, setQueueItems] = useState<MatchQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('are_deterministic_match_queue_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isQueueing, setIsQueueing] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  // Real-time Firestore Synchronization for Match Queue
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/match_queue`;
    const colRef = collection(db, 'users', user.uid, 'match_queue');

    try {
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const cloudItems: MatchQueueItem[] = [];
          snapshot.forEach((docSnap) => {
            cloudItems.push(docSnap.data() as MatchQueueItem);
          });

          // Sort by creation time descending
          cloudItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setQueueItems(cloudItems);
          localStorage.setItem('are_deterministic_match_queue_v1', JSON.stringify(cloudItems));
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, path);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn('Firestore queue sync warning:', e);
    }
  }, [user]);

  // Handle Add to Queue
  const handleQueueMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFighter1Id === selectedFighter2Id) {
      alert('Please select two different fighters from your unlocked inventory for the match duel.');
      return;
    }

    const f1 = unlockedFighters.find((f) => f.id === selectedFighter1Id) || unlockedFighters[0];
    const f2 = unlockedFighters.find((f) => f.id === selectedFighter2Id) || unlockedFighters[1];

    setIsQueueing(true);

    const queuedF1: QueuedFighterInfo = {
      id: f1.id,
      name: f1.name,
      characterClass: f1.characterClass,
      level: heroLevel,
      modelUrl: f1.modelUrl,
      scale: f1.scale,
      description: f1.description,
      evidenceAffinity: f1.evidenceAffinity
    };

    const queuedF2: QueuedFighterInfo = {
      id: f2.id,
      name: f2.name,
      characterClass: f2.characterClass,
      level: Math.max(1, heroLevel + (f2.characterClass === 'berserker' ? 1 : 0)),
      modelUrl: f2.modelUrl,
      scale: f2.scale,
      description: f2.description,
      evidenceAffinity: f2.evidenceAffinity
    };

    try {
      const newItem = await MatchQueueService.queueMatch(user, queuedF1, queuedF2);
      setQueueItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
    } catch (err: any) {
      console.warn('Error queueing match:', err);
    } finally {
      setIsQueueing(false);
    }
  };

  // Run Deterministic Simulation
  const handleRunSimulation = async (item: MatchQueueItem) => {
    setSimulatingId(item.id);
    try {
      const finalized = await MatchQueueService.executeSimulation(user, item);
      setQueueItems((prev) => prev.map((i) => (i.id === item.id ? finalized : i)));

      // If callback provided, allow user to view in 3D
      if (onLoadMatchInto3D) {
        onLoadMatchInto3D(finalized);
      }
    } catch (err) {
      console.warn('Simulation error:', err);
    } finally {
      setSimulatingId(null);
    }
  };

  // Delete Queue Item
  const handleDeleteItem = async (id: string) => {
    setQueueItems((prev) => prev.filter((i) => i.id !== id));
    await MatchQueueService.deleteQueueItem(user, id);
  };

  const getFighterIcon = (cClass: string) => {
    switch (cClass) {
      case 'paladin': return '🛡️';
      case 'archmage': return '🔮';
      case 'assassin': return '🗡️';
      case 'berserker': return '🪓';
      default: return '👑';
    }
  };

  const pendingCount = queueItems.filter((i) => i.status === 'Pending').length;
  const finalizedCount = queueItems.filter((i) => i.status === 'Finalized').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono flex items-center gap-2">
              <span>Match Queue &amp; Real-Time Simulation Pipeline</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                Firestore Live Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select two characters from your unlocked inventory, queue deterministic battle simulations, and track real-time Pending vs Finalized statuses.
            </p>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{pendingCount} Pending</span>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{finalizedCount} Finalized</span>
          </span>
        </div>
      </div>

      {/* Select & Queue Fighters Form */}
      <form onSubmit={handleQueueMatch} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>Queue Match from Unlocked Fighters Inventory</span>
          </span>
          <span className="text-[10px] text-slate-400">
            {unlockedFighters.length} Fighters Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Fighter 1 Select */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-slate-400 text-[11px] block font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Challenger (Fighter 1)</span>
            </label>
            <select
              value={selectedFighter1Id}
              onChange={(e) => setSelectedFighter1Id(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-amber-300 font-bold focus:outline-none focus:border-amber-500 text-xs"
            >
              {unlockedFighters.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                  {getFighterIcon(f.characterClass)} {f.name} ({f.characterClass.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Versus Divider */}
          <div className="md:col-span-2 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-amber-400">
              VS
            </div>
          </div>

          {/* Fighter 2 Select */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-slate-400 text-[11px] block font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Opponent (Fighter 2)</span>
            </label>
            <select
              value={selectedFighter2Id}
              onChange={(e) => setSelectedFighter2Id(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 text-xs"
            >
              {unlockedFighters.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                  {getFighterIcon(f.characterClass)} {f.name} ({f.characterClass.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isQueueing}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-black transition-all shadow-md shadow-amber-500/10 flex items-center gap-2 min-h-[40px]"
          >
            <Zap className="w-4 h-4" />
            <span>{isQueueing ? 'Queueing in Firestore...' : 'Queue Deterministic Match'}</span>
          </button>
        </div>
      </form>

      {/* Real-time Match Queue Feed */}
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
          <span className="font-bold text-slate-200">Real-Time Queue Feed ({queueItems.length})</span>
          <span className="text-[11px] text-slate-500">Live Updates from Firestore</span>
        </div>

        {queueItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-3xl">⚔️</div>
            <p className="text-xs text-slate-400">
              No matches currently queued. Select two unlocked fighters above and click "Queue Deterministic Match".
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {queueItems.map((item) => {
              const isPending = item.status === 'Pending';
              const isFinalized = item.status === 'Finalized';
              const isSimulatingThis = simulatingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isPending
                      ? 'bg-slate-950/80 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  {/* Match Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {/* Status Pill */}
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Finalized</span>
                        </span>
                      )}

                      <span className="font-bold text-slate-200">
                        {item.fighter1.name} <span className="text-slate-500 font-normal">VS</span> {item.fighter2.name}
                      </span>
                    </div>

                    {/* Result or Details */}
                    {isFinalized ? (
                      <div className="text-[11px] text-emerald-300 space-y-0.5">
                        <div>
                          🏆 Winner: <span className="font-bold text-white">{item.winnerName}</span> in {item.turnsCount} turns
                        </div>
                        {item.proofOfWorkHash && (
                          <div className="text-[10px] text-slate-500 truncate">
                            Proof-of-Work: <span className="font-mono text-amber-400/80">{item.proofOfWorkHash}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Queued for pure deterministic resolution without random seeds.
                      </p>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {isPending && (
                      <button
                        onClick={() => handleRunSimulation(item)}
                        disabled={isSimulatingThis}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 min-h-[36px]"
                      >
                        {isSimulatingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Simulating...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Simulate</span>
                          </>
                        )}
                      </button>
                    )}

                    {isFinalized && onLoadMatchInto3D && (
                      <button
                        onClick={() => onLoadMatchInto3D(item)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1 min-h-[36px]"
                        title="Load this match and replay in 3D Arena"
                      >
                        <Box className="w-3.5 h-3.5 text-cyan-400" />
                        <span>View in 3D</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
