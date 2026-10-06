import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Shield,
  Swords,
  Sparkles,
  Award,
  Crown,
  Lock,
  CheckCircle2,
  TrendingUp,
  Cpu,
  RefreshCw,
  Info,
  Flame,
  UploadCloud,
  ChevronRight,
  Database
} from 'lucide-react';

export interface SkillNode {
  id: string;
  name: string;
  category: 'attack' | 'defense' | 'utility';
  tier: number;
  cost: number;
  unlocked: boolean;
  prerequisites: string[];
  statBonus: string;
  description: string;
  icon: 'swords' | 'shield' | 'zap' | 'crown' | 'sparkles' | 'database';
  multiplier: number;
}

export interface ModelSkillTreeState {
  availableSkillPoints: number;
  totalPointsEarned: number;
  unlockedNodeIds: string[];
  activeBuffs: {
    attackMultiplier: number; // e.g. 1.15 (+15%)
    defenseShieldBonus: number; // e.g. 1.20 (+20%)
    xpGainBonus: number; // e.g. 1.25 (+25%)
    critRateBonus: number; // e.g. +10%
  };
}

const DEFAULT_SKILL_NODES: SkillNode[] = [
  // --- BRANCH 1: LOGIC ATTACK MULTIPLIERS (ATTACK) ---
  {
    id: 'atk_1_davis_putnam',
    name: 'Davis-Putnam Resolution Focus',
    category: 'attack',
    tier: 1,
    cost: 1,
    unlocked: true,
    prerequisites: [],
    statBonus: '+10% Logic Attack Power',
    description: 'Optimizes clause resolvent derivation order for faster empty-clause refutation.',
    icon: 'swords',
    multiplier: 0.10
  },
  {
    id: 'atk_2_ast_shatter',
    name: 'AST Invariant Clause Shatter',
    category: 'attack',
    tier: 2,
    cost: 2,
    unlocked: false,
    prerequisites: ['atk_1_davis_putnam'],
    statBonus: '+20% Critical Refutation Burst',
    description: 'Derives unblockable AST tree depth violations against opponent invariant claims.',
    icon: 'zap',
    multiplier: 0.20
  },
  {
    id: 'atk_3_empty_clause_titan',
    name: 'Empty-Clause Contradiction Titan',
    category: 'attack',
    tier: 3,
    cost: 3,
    unlocked: false,
    prerequisites: ['atk_2_ast_shatter'],
    statBonus: '+35% Ultimate Attack Multiplier',
    description: 'Unleashes mythic resolution refutation that bypasses standard model defenses.',
    icon: 'crown',
    multiplier: 0.35
  },

  // --- BRANCH 2: EVIDENCE DEFENSE BUFFS (DEFENSE) ---
  {
    id: 'def_1_invariant_shield',
    name: 'Invariant AST Shielding',
    category: 'defense',
    tier: 1,
    cost: 1,
    unlocked: false,
    prerequisites: [],
    statBonus: '+15% Formal Defense Barrier',
    description: 'Upholds topological acyclicity invariants against incoming counterexample probes.',
    icon: 'shield',
    multiplier: 0.15
  },
  {
    id: 'def_2_merkle_barrier',
    name: 'Merkle Root Proof Fortress',
    category: 'defense',
    tier: 2,
    cost: 2,
    unlocked: false,
    prerequisites: ['def_1_invariant_shield'],
    statBonus: '+25% Evidence Resistance',
    description: 'Anchors state proofs to immutable SHA-256 hashes, neutralizing false clauses.',
    icon: 'database',
    multiplier: 0.25
  },
  {
    id: 'def_3_citadel_sovereign',
    name: 'Zero-Contradiction Citadel',
    category: 'defense',
    tier: 3,
    cost: 3,
    unlocked: false,
    prerequisites: ['def_2_merkle_barrier'],
    statBonus: '+40% Total Defense Armor',
    description: 'Establishes impenetrable formal reasoning gates that preserve undefeated throne streaks.',
    icon: 'crown',
    multiplier: 0.40
  },

  // --- BRANCH 3: REVISION XP & MASTERY (UTILITY) ---
  {
    id: 'util_1_xp_collector',
    name: 'Revision Point Catalyst',
    category: 'utility',
    tier: 1,
    cost: 1,
    unlocked: false,
    prerequisites: [],
    statBonus: '+20% Match XP Gain',
    description: 'Accelerates model experience growth from every tournament battle and training drill.',
    icon: 'sparkles',
    multiplier: 0.20
  },
  {
    id: 'util_2_honor_synergy',
    name: 'Honor Medal Resonance',
    category: 'utility',
    tier: 2,
    cost: 2,
    unlocked: false,
    prerequisites: ['util_1_xp_collector'],
    statBonus: '+15% Critical Wit & +15% XP',
    description: 'Amplifies model stats based on equipped Hugging Face profile honor medals.',
    icon: 'zap',
    multiplier: 0.15
  }
];

interface ModelSkillTreeProps {
  heroLevel?: number;
  heroWins?: number;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const ModelSkillTree: React.FC<ModelSkillTreeProps> = ({
  heroLevel = 5,
  heroWins = 10,
  onExportToHf
}) => {
  const [skillNodes, setSkillNodes] = useState<SkillNode[]>(() => {
    try {
      const saved = localStorage.getItem('are_model_skill_tree_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          return parsed.nodes;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved skill tree:', e);
    }
    return DEFAULT_SKILL_NODES;
  });

  const [availablePoints, setAvailablePoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('are_model_skill_tree_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.availablePoints === 'number') {
          return parsed.availablePoints;
        }
      }
    } catch (e) {
      console.warn('Failed to load skill points:', e);
    }
    // Default available skill points calculated from level and wins
    return Math.max(1, Math.floor(heroLevel / 2) + Math.floor(heroWins / 3));
  });

  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);

  // Sync available skill points with Hero Profile level and victories
  useEffect(() => {
    try {
      const savedHero = localStorage.getItem('are_rpg_hero_profile_v2');
      let currentLvl = heroLevel;
      let currentWins = heroWins;
      if (savedHero) {
        const parsedHero = JSON.parse(savedHero);
        if (typeof parsedHero.level === 'number') currentLvl = parsedHero.level;
        if (typeof parsedHero.totalWins === 'number') currentWins = parsedHero.totalWins;
      }

      const totalEarnedSp = Math.max(1, Math.floor(currentLvl / 2) + Math.floor(currentWins / 3));
      const spentSp = skillNodes
        .filter(n => n.unlocked && n.id !== 'atk_1_davis_putnam')
        .reduce((acc, n) => acc + n.cost, 0);

      const computedAvailable = Math.max(0, totalEarnedSp - spentSp);
      setAvailablePoints(computedAvailable);
    } catch (e) {
      console.warn('Error computing available SP:', e);
    }
  }, [heroLevel, heroWins]);

  // Save skill tree state
  const saveSkillTree = (updatedNodes: SkillNode[], points: number) => {
    setSkillNodes(updatedNodes);
    setAvailablePoints(points);

    // Compute active buffs
    const unlocked = updatedNodes.filter(n => n.unlocked);
    const attackMultiplier = 1 + unlocked.filter(n => n.category === 'attack').reduce((acc, n) => acc + n.multiplier, 0);
    const defenseShieldBonus = 1 + unlocked.filter(n => n.category === 'defense').reduce((acc, n) => acc + n.multiplier, 0);
    const xpGainBonus = 1 + unlocked.filter(n => n.category === 'utility').reduce((acc, n) => acc + n.multiplier, 0);

    const stateToSave = {
      nodes: updatedNodes,
      availablePoints: points,
      activeBuffs: {
        attackMultiplier,
        defenseShieldBonus,
        xpGainBonus
      }
    };

    try {
      localStorage.setItem('are_model_skill_tree_v1', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to persist skill tree:', e);
    }
  };

  // Unlock node handler
  const handleUnlockNode = (nodeId: string) => {
    const node = skillNodes.find(n => n.id === nodeId);
    if (!node || node.unlocked) return;

    if (availablePoints < node.cost) {
      alert(`Insufficient Skill Points! Need ${node.cost} SP, but you have ${availablePoints} SP.`);
      return;
    }

    // Check prerequisites
    const prereqsMet = node.prerequisites.every(pId => {
      const pNode = skillNodes.find(n => n.id === pId);
      return pNode && pNode.unlocked;
    });

    if (!prereqsMet) {
      alert('Prerequisite nodes must be unlocked first!');
      return;
    }

    const updated = skillNodes.map(n => n.id === nodeId ? { ...n, unlocked: true } : n);
    const newPoints = availablePoints - node.cost;
    saveSkillTree(updated, newPoints);
  };

  // Compute Active Buff Totals
  const unlockedNodes = skillNodes.filter(n => n.unlocked);
  const attackBuffTotal = Math.round(unlockedNodes.filter(n => n.category === 'attack').reduce((acc, n) => acc + n.multiplier, 0) * 100);
  const defenseBuffTotal = Math.round(unlockedNodes.filter(n => n.category === 'defense').reduce((acc, n) => acc + n.multiplier, 0) * 100);
  const utilityBuffTotal = Math.round(unlockedNodes.filter(n => n.category === 'utility').reduce((acc, n) => acc + n.multiplier, 0) * 100);

  const renderIcon = (iconName: SkillNode['icon']) => {
    switch (iconName) {
      case 'swords': return <Swords className="w-5 h-5" />;
      case 'shield': return <Shield className="w-5 h-5" />;
      case 'zap': return <Zap className="w-5 h-5" />;
      case 'crown': return <Crown className="w-5 h-5" />;
      case 'sparkles': return <Sparkles className="w-5 h-5" />;
      case 'database': return <Database className="w-5 h-5" />;
      default: return <Cpu className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Top Banner & Skill Points Counter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 text-amber-400 rounded-2xl shadow-lg shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                RPG Model Skill Tree &amp; Buff Specs
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                {unlockedNodes.length} / {skillNodes.length} Unlocked
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Spend accumulated match victory XP points to unlock permanent Logic Attack multipliers and Evidence Defense buffs.
            </p>
          </div>
        </div>

        {/* Skill Points Display & HF Export */}
        <div className="flex items-center gap-3 flex-wrap self-start lg:self-auto">
          <div className="px-4 py-2 bg-slate-950 border border-amber-500/50 rounded-xl flex items-center gap-2 font-mono shadow-md">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <div className="text-xs">
              <span className="text-slate-400">Available SP: </span>
              <span className="text-amber-300 font-black text-sm">{availablePoints} SP</span>
            </div>
          </div>

          {onExportToHf && (
            <button
              onClick={() => onExportToHf(
                'arena_match',
                `Model Skill Tree & Active Buff Metadata`,
                {
                  unlocked_nodes: unlockedNodes,
                  available_sp: availablePoints,
                  active_buffs: {
                    attack_bonus: `+${attackBuffTotal}%`,
                    defense_bonus: `+${defenseBuffTotal}%`,
                    xp_bonus: `+${utilityBuffTotal}%`
                  }
                },
                'ouroboroscollective/evidence-bound-css'
              )}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors min-h-[40px]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Export Skill Specs to HF</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Buffs Resonant Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-rose-400" />
            <span className="text-slate-300 font-semibold">Logic Attack Multiplier</span>
          </div>
          <span className="text-rose-400 font-black text-sm">+{attackBuffTotal}%</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-300 font-semibold">Evidence Defense Shield</span>
          </div>
          <span className="text-indigo-400 font-black text-sm">+{defenseBuffTotal}%</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-semibold">Revision XP Boost</span>
          </div>
          <span className="text-amber-300 font-black text-sm">+{utilityBuffTotal}%</span>
        </div>
      </div>

      {/* Interactive Node Graph Tree Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {[
          { key: 'attack', title: '⚔️ Logic Attack Branch', color: 'rose' },
          { key: 'defense', title: '🛡️ Evidence Defense Branch', color: 'indigo' },
          { key: 'utility', title: '✨ Revision XP Mastery', color: 'amber' }
        ].map(branch => {
          const nodes = skillNodes.filter(n => n.category === branch.key);

          return (
            <div key={branch.key} className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold font-mono text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>{branch.title}</span>
                <span className="text-[10px] text-slate-500">{nodes.filter(n => n.unlocked).length}/{nodes.length} Nodes</span>
              </h4>

              <div className="space-y-3">
                {nodes.map(node => {
                  const prereqsMet = node.prerequisites.every(pId => {
                    const pNode = skillNodes.find(n => n.id === pId);
                    return pNode && pNode.unlocked;
                  });

                  const canUnlock = !node.unlocked && prereqsMet && availablePoints >= node.cost;

                  return (
                    <div key={node.id} className="relative">
                      {/* Connecting Line to next tier if exists */}
                      {node.prerequisites.length > 0 && (
                        <div className="absolute -top-3 left-6 w-0.5 h-3 bg-slate-800 pointer-events-none" />
                      )}

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className={`p-3.5 rounded-xl border transition-all space-y-2 select-none ${
                          node.unlocked
                            ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-amber-500/60 shadow-lg shadow-amber-500/10'
                            : canUnlock
                            ? 'bg-slate-900/90 border-amber-500/30 hover:border-amber-400 cursor-pointer'
                            : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg border text-amber-400 ${
                              node.unlocked ? 'bg-amber-500/20 border-amber-500/40' : 'bg-slate-900 border-slate-800'
                            }`}>
                              {renderIcon(node.icon)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-100 font-mono block">
                                {node.name}
                              </span>
                              <span className="text-[10px] text-amber-300 font-mono font-semibold">
                                {node.statBonus}
                              </span>
                            </div>
                          </div>

                          {node.unlocked ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleUnlockNode(node.id)}
                              disabled={!canUnlock}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all min-h-[32px] ${
                                canUnlock
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700'
                              }`}
                            >
                              {prereqsMet ? `Unlock (${node.cost} SP)` : 'Locked 🔒'}
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                          {node.description}
                        </p>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
