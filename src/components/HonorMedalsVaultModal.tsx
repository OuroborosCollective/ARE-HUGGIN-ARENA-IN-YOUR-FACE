import React from 'react';
import { motion } from 'framer-motion';
import { Award, Crown, CheckCircle2, Shield, Zap, Sparkles, X, Lock, ExternalLink, Flame } from 'lucide-react';
import { HeroProfile } from './RpgAutoBattler';

export interface HonorMedalDefinition {
  id: string;
  name: string;
  category: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'OBSIDIAN';
  icon: string;
  colorBadge: string;
  ribbonGradient: string;
  description: string;
  requirement: string;
  rewardSp: number;
  rewardXp: number;
  rewardRevisionPts: number;
  isReached: (hero: HeroProfile) => boolean;
}

export const CANONICAL_HONOR_MEDALS: HonorMedalDefinition[] = [
  {
    id: 'medal_first_blood',
    name: 'Resolution Acolyte Medal',
    category: 'Combat Initiation',
    tier: 'BRONZE',
    icon: '⚔️',
    colorBadge: 'bg-amber-600/20 text-amber-300 border-amber-600/40',
    ribbonGradient: 'from-amber-600 to-yellow-700',
    description: 'Awarded upon winning your first formal logic auto-duel in the arena.',
    requirement: 'Win >= 1 Tournament Battle',
    rewardSp: 2,
    rewardXp: 120,
    rewardRevisionPts: 30,
    isReached: (h) => h.totalWins >= 1
  },
  {
    id: 'medal_tier2_champion',
    name: 'Formal Proof Champion Medal',
    category: 'Level Mastery',
    tier: 'SILVER',
    icon: '🛡️',
    colorBadge: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
    ribbonGradient: 'from-slate-400 to-slate-600',
    description: 'Awarded when your hero achieves Level 5 and unlocks champion scaling.',
    requirement: 'Reach Character Level 5',
    rewardSp: 3,
    rewardXp: 250,
    rewardRevisionPts: 60,
    isReached: (h) => h.level >= 5
  },
  {
    id: 'medal_win_streak_5',
    name: 'Duelist of Sound Reason',
    category: 'Win Efficiency',
    tier: 'GOLD',
    icon: '🔥',
    colorBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    ribbonGradient: 'from-amber-500 via-yellow-400 to-amber-600',
    description: 'Awarded for securing 5 total arena victories against AI logic models.',
    requirement: 'Win >= 5 Tournament Battles',
    rewardSp: 4,
    rewardXp: 350,
    rewardRevisionPts: 80,
    isReached: (h) => h.totalWins >= 5
  },
  {
    id: 'medal_tier3_sovereign',
    name: 'AST Invariant Sovereign Medal',
    category: 'Level Mastery',
    tier: 'PLATINUM',
    icon: '👑',
    colorBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    ribbonGradient: 'from-cyan-400 via-teal-500 to-indigo-600',
    description: 'Awarded upon reaching Level 10 and unlocking sovereign celestial wings.',
    requirement: 'Reach Character Level 10',
    rewardSp: 6,
    rewardXp: 600,
    rewardRevisionPts: 150,
    isReached: (h) => h.level >= 10
  },
  {
    id: 'medal_undefeated_10',
    name: 'Throne Sovereign Grand Medal',
    category: 'Grandmastery',
    tier: 'DIAMOND',
    icon: '💎',
    colorBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    ribbonGradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    description: 'Awarded for winning 10+ tournament battles with zero unhandled refutations.',
    requirement: 'Win >= 10 Tournament Battles',
    rewardSp: 8,
    rewardXp: 1000,
    rewardRevisionPts: 250,
    isReached: (h) => h.totalWins >= 10
  },
  {
    id: 'medal_revision_centurion',
    name: 'Sovereign Proof Archivist Ribbon',
    category: 'Evidence Provenance',
    tier: 'OBSIDIAN',
    icon: '📜',
    colorBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    ribbonGradient: 'from-purple-500 via-violet-600 to-slate-950',
    description: 'Awarded for accumulating 250+ formal evidence revision points.',
    requirement: 'Accumulate >= 250 Revision Points',
    rewardSp: 5,
    rewardXp: 400,
    rewardRevisionPts: 100,
    isReached: (h) => h.revisionPoints >= 250
  }
];

interface HonorMedalsVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  hero: HeroProfile;
  claimedMilestoneIds: string[];
  onClaimMilestone: (medal: HonorMedalDefinition) => void;
}

export const HonorMedalsVaultModal: React.FC<HonorMedalsVaultModalProps> = ({
  isOpen,
  onClose,
  hero,
  claimedMilestoneIds,
  onClaimMilestone
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 text-amber-400 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                <span>Honor Medals &amp; Idempotent Claims Vault</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                  {claimedMilestoneIds.length} / {CANONICAL_HONOR_MEDALS.length} Claimed
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Claim what you have achieved idempotently without ever losing rewards or duplicate-awarding.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Medals List */}
        <div className="p-5 overflow-y-auto space-y-3 font-mono">
          {CANONICAL_HONOR_MEDALS.map((medal) => {
            const isClaimed = claimedMilestoneIds.includes(medal.id);
            const isReached = medal.isReached(hero);

            return (
              <div
                key={medal.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isClaimed
                    ? 'bg-slate-950/60 border-slate-800 opacity-90'
                    : isReached
                    ? 'bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="text-3xl p-2.5 bg-slate-900 rounded-xl border border-slate-800 shrink-0 shadow-inner">
                    {medal.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-100">{medal.name}</h4>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold border uppercase ${medal.colorBadge}`}>
                        {medal.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{medal.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-amber-300 pt-0.5">
                      <span>Requirement: {medal.requirement}</span>
                      <span className="text-emerald-400 font-bold">
                        +{medal.rewardSp} SP | +{medal.rewardXp} XP
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center self-end sm:self-auto">
                  {isClaimed ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Claimed ✓</span>
                    </div>
                  ) : isReached ? (
                    <button
                      onClick={() => onClaimMilestone(medal)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 animate-pulse min-h-[38px] flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Tage Belohnung</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-slate-500 border border-slate-800 rounded-xl text-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
