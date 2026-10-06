import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  CheckCircle2,
  Shield,
  Swords,
  Award,
  Crown,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  UploadCloud,
  Layers,
  Flame,
  ExternalLink,
  Database,
  Lock
} from 'lucide-react';
import { CombatRevisionRecord } from '../utils/combatEngine';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface CombatHistoryViewProps {
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
  onSelectReplayRevision?: (revision: CombatRevisionRecord) => void;
}

export const CombatHistoryView: React.FC<CombatHistoryViewProps> = ({
  onExportToHf,
  onSelectReplayRevision
}) => {
  const { user } = useFirebaseAuth();

  const [combatHistory, setCombatHistory] = useState<CombatRevisionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('are_local_combat_revisions_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRevisionId, setExpandedRevisionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'VICTORY' | 'DEFEAT'>('ALL');

  // Real-time Firestore query for finalized battle revisions
  useEffect(() => {
    if (!user) {
      // Local storage fallback for guest mode
      try {
        const local = localStorage.getItem('are_local_combat_revisions_v1');
        if (local) setCombatHistory(JSON.parse(local));
      } catch (e) {
        console.warn('Local combat history read error:', e);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
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

          // Sort chronologically descending (newest first)
          cloudRevisions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setCombatHistory(cloudRevisions);
          setLoading(false);
          localStorage.setItem('are_local_combat_revisions_v1', JSON.stringify(cloudRevisions));
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, path);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn('Firestore combat history listener error:', err);
      setLoading(false);
    }
  }, [user]);

  const handleCopyProof = (proof: string, id: string) => {
    navigator.clipboard.writeText(proof);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHistory = combatHistory.filter((rev) => {
    const matchesSearch =
      rev.attacker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.defender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.proofOfWorkHash.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOutcome =
      filterOutcome === 'ALL' || rev.outcome === filterOutcome;

    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 text-amber-400 rounded-2xl shadow-lg shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                Combat History &amp; Proof-of-Work Ledger
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                Firestore Verified (Read-Only)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological immutable ledger of all finalized deterministic battle simulations anchored to Firestore.
            </p>
          </div>
        </div>

        {onExportToHf && (
          <button
            onClick={() =>
              onExportToHf(
                'arena_tournament',
                'Firestore Finalized Combat Revisions History',
                combatHistory,
                'ouroboroscollective/ARE-rLOGIC-class'
              )
            }
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md min-h-[40px] self-start sm:self-auto"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Export History to HF</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search combatant or hash..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
          />
        </div>

        {/* Outcome Filter */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <span className="text-slate-400 text-[11px]">Outcome:</span>
          {(['ALL', 'VICTORY', 'DEFEAT'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterOutcome(opt)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors text-[11px] ${
                filterOutcome === opt
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological List of Finalized Revisions */}
      <div className="space-y-3 font-mono">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Retrieving finalized combat history from Firestore...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-3xl">📜</div>
            <h4 className="text-sm font-bold text-slate-200">No Finalized Combat Records Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || filterOutcome !== 'ALL'
                ? 'No battles match your active filter. Try resetting your search.'
                : 'Run an auto-battle or simulate a queued match in the 3D Arena to seal your first proof-of-work revision!'}
            </p>
          </div>
        ) : (
          filteredHistory.map((rev) => {
            const isExpanded = expandedRevisionId === rev.id;
            const isVictory = rev.outcome === 'VICTORY';
            const formattedDate = new Date(rev.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <div
                key={rev.id}
                className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all hover:border-slate-700"
              >
                {/* Main Card Row */}
                <div
                  onClick={() => setExpandedRevisionId(isExpanded ? null : rev.id)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                >
                  {/* Left Column: Combatants & Date */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {/* Outcome Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border flex items-center gap-1 ${
                          isVictory
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {isVictory ? '🏆 VICTORY' : '💀 DEFEAT'}
                      </span>

                      <span className="font-bold text-slate-100 text-sm">
                        {rev.attacker}
                      </span>
                      <span className="text-slate-500 text-xs">VS</span>
                      <span className="font-bold text-slate-300 text-sm">
                        {rev.defender}
                      </span>

                      <span className="text-[10px] text-slate-500 ml-auto md:ml-2">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Proof-of-Work Hash & Turn Count */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 text-amber-300">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>POW:</span>
                        <span className="font-bold truncate max-w-[180px] sm:max-w-[260px]">
                          {rev.proofOfWorkHash}
                        </span>
                      </span>

                      <span className="text-slate-500">•</span>
                      <span>{rev.turnsCount} turns</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-emerald-400 font-bold">+{rev.pointsAwarded} pts</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyProof(rev.proofOfWorkHash, rev.id);
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs border border-slate-800 flex items-center gap-1 transition-colors"
                      title="Copy SHA-256 Proof-of-Work receipt"
                    >
                      {copiedId === rev.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy POW</span>
                        </>
                      )}
                    </button>

                    <div className="p-1.5 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Turn-by-Turn Replay Breakdown */}
                <AnimatePresence>
                  {isExpanded && rev.turns && rev.turns.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800/80 bg-slate-950/80 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-2">
                        <span className="font-bold text-amber-400">
                          Turn-by-Turn Proof Log ({rev.turns.length} actions)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Immutable Evidence Hash: {rev.evidenceHistoryHash.slice(0, 16)}...
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {rev.turns.map((turn, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                              turn.actionType === 'ultimate'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold'
                                : turn.isCrit
                                ? 'bg-rose-500/10 text-rose-300 font-bold'
                                : 'bg-slate-900/60 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-slate-500 text-[10px]">T{turn.turn}</span>
                              <span className="truncate">{turn.message}</span>
                            </div>
                            <span className="text-rose-400 font-bold shrink-0">
                              -{turn.mitigatedDamage}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
