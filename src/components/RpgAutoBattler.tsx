import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Shield,
  Zap,
  Sparkles,
  Trophy,
  Crown,
  Heart,
  Flame,
  Award,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  User,
  Star,
  Activity,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  ExternalLink,
  Volume2,
  VolumeX,
  Dumbbell,
  Box,
  Eye,
  Layers,
  Maximize2
} from 'lucide-react';
import { ArenaViewport, CharacterModel3DInfo } from './ArenaViewport';
import { Model3DSelectorModal, DEFAULT_3D_CHIBI_MODELS } from './Model3DSelectorModal';
import { HonorMedalsVaultModal, CANONICAL_HONOR_MEDALS, HonorMedalDefinition } from './HonorMedalsVaultModal';
import { MatchQueueVisualizer } from './MatchQueueVisualizer';
import { MatchQueueItem } from '../utils/matchQueueService';
import {
  CombatEngine,
  CombatRevisionRecord,
  CombatTurn,
  CombatStats
} from '../utils/combatEngine';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export type CharacterClass = 'paladin' | 'archmage' | 'assassin' | 'berserker' | 'logic_knight';

export interface HeroProfile {
  name: string;
  className: CharacterClass;
  level: number;
  currentXp: number;
  totalBattles: number;
  totalWins: number;
  totalTrainingSessions: number;
  revisionPoints: number;
  allocatedStats: {
    atkBonus: number;
    defBonus: number;
    hpBonus: number;
    critBonus: number;
  };
  statPointsAvailable: number;
  selectedModel3DId?: string;
  claimedMilestoneIds?: string[];
  processedMatchReceipts?: string[];
  equippedMedalId?: string;
}

interface FloatingText {
  id: string;
  text: string;
  type: 'damage_hero' | 'damage_enemy' | 'heal' | 'crit' | 'shield' | 'xp' | 'miss';
  x: number;
  y: number;
}

interface BattleLogEntry {
  id: string;
  turn: number;
  actor: string;
  actionName: string;
  damage: number;
  isCrit: boolean;
  message: string;
  type: 'attack' | 'skill' | 'ultimate' | 'defense' | 'system';
}

interface RpgAutoBattlerProps {
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
  availableOpponents?: Array<{
    model_id: string;
    name: string;
    org: string;
    elo: number;
  }>;
}

export const RpgAutoBattler: React.FC<RpgAutoBattlerProps> = ({ onExportToHf, availableOpponents = [] }) => {
  const { user } = useFirebaseAuth();

  // Viewport mode: 3D WebGL Arena vs 2D Sprites
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Sound effects toggle
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play retro synthesized chimes
  const playSfx = (type: 'hit' | 'crit' | 'shield' | 'level_up' | 'win' | 'skill') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'crit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'shield') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'level_up') {
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.08);
          g.gain.setValueAtTime(0.3, now + idx * 0.08);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.2);
        });
      } else if (type === 'win') {
        const notes = [523, 659, 784, 1046];
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + idx * 0.1);
          g.gain.setValueAtTime(0.35, now + idx * 0.1);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);
          o.start(now + idx * 0.1);
          o.stop(now + idx * 0.1 + 0.3);
        });
      } else if (type === 'skill') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.18);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (err) {
      console.warn('Audio play error:', err);
    }
  };

  // Hero Persistent State
  const [hero, setHero] = useState<HeroProfile>(() => {
    try {
      const saved = localStorage.getItem('are_rpg_hero_profile_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved hero:', e);
    }
    return {
      name: 'Ouroboros Logic Knight',
      className: 'paladin',
      level: 1,
      currentXp: 0,
      totalBattles: 0,
      totalWins: 0,
      totalTrainingSessions: 0,
      revisionPoints: 100,
      allocatedStats: {
        atkBonus: 0,
        defBonus: 0,
        hpBonus: 0,
        critBonus: 0
      },
      statPointsAvailable: 3,
      selectedModel3DId: 'chibi_paladin_aegis',
      claimedMilestoneIds: [],
      processedMatchReceipts: []
    };
  });

  // Sync with Firestore RPG Profile when authenticated
  useEffect(() => {
    if (!user) return;
    const fetchCloudHero = async () => {
      try {
        const heroRef = doc(db, 'users', user.uid, 'rpg_profile', 'hero');
        const snap = await getDoc(heroRef);
        if (snap.exists()) {
          const cloudData = snap.data() as Partial<HeroProfile>;
          setHero((localHero) => {
            // Idempotent merge: Take highest level and union of claimed milestones
            const mergedClaimed = Array.from(
              new Set([...(localHero.claimedMilestoneIds || []), ...(cloudData.claimedMilestoneIds || [])])
            );
            const mergedReceipts = Array.from(
              new Set([...(localHero.processedMatchReceipts || []), ...(cloudData.processedMatchReceipts || [])])
            );

            const merged: HeroProfile = {
              ...localHero,
              ...cloudData,
              level: Math.max(localHero.level, cloudData.level || 1),
              totalWins: Math.max(localHero.totalWins, cloudData.totalWins || 0),
              totalBattles: Math.max(localHero.totalBattles, cloudData.totalBattles || 0),
              revisionPoints: Math.max(localHero.revisionPoints, cloudData.revisionPoints || 0),
              claimedMilestoneIds: mergedClaimed,
              processedMatchReceipts: mergedReceipts
            };
            localStorage.setItem('are_rpg_hero_profile_v2', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn('Cloud RPG profile sync warning:', err);
      }
    };
    fetchCloudHero();
  }, [user]);

  const saveHero = (updatedHero: HeroProfile) => {
    setHero(updatedHero);
    try {
      localStorage.setItem('are_rpg_hero_profile_v2', JSON.stringify(updatedHero));
    } catch (e) {
      console.warn('Failed to persist hero:', e);
    }

    if (user) {
      const heroRef = doc(db, 'users', user.uid, 'rpg_profile', 'hero');
      setDoc(heroRef, {
        ...updatedHero,
        id: 'hero',
        userId: user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((e) => console.warn('Firestore hero save error:', e));
    }
  };

  // 3D Models & Selection State
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [selectedModel3D, setSelectedModel3D] = useState<CharacterModel3DInfo | null>(() => {
    return DEFAULT_3D_CHIBI_MODELS.find(m => m.id === hero.selectedModel3DId) || DEFAULT_3D_CHIBI_MODELS[0];
  });

  // Honor Medals Vault Modal State
  const [medalsModalOpen, setMedalsModalOpen] = useState(false);

  // XP needed formula
  const getXpNeeded = (lvl: number) => Math.round(100 * Math.pow(1.3, lvl - 1));

  // Tier info & visual scaling
  const getTierInfo = (lvl: number) => {
    if (lvl >= 20) {
      return {
        title: 'Mythic Titan Archon',
        tier: 'TIER IV (TITAN)',
        scale: 1.55,
        auraColor: 'from-amber-400 via-rose-500 to-indigo-600',
        glowClass: 'shadow-2xl shadow-amber-500/50 ring-4 ring-amber-400',
        colorBadge: 'bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950',
        wings: true
      };
    } else if (lvl >= 10) {
      return {
        title: 'AST Invariant Sovereign',
        tier: 'TIER III (SOVEREIGN)',
        scale: 1.35,
        auraColor: 'from-emerald-400 to-cyan-500',
        glowClass: 'shadow-xl shadow-cyan-500/40 ring-2 ring-cyan-400',
        colorBadge: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950',
        wings: true
      };
    } else if (lvl >= 5) {
      return {
        title: 'Formal Proof Champion',
        tier: 'TIER II (CHAMPION)',
        scale: 1.2,
        auraColor: 'from-amber-400 to-yellow-500',
        glowClass: 'shadow-lg shadow-amber-500/30 ring-1 ring-amber-400',
        colorBadge: 'bg-amber-400 text-slate-950',
        wings: false
      };
    } else {
      return {
        title: 'Logic Novice Apprentice',
        tier: 'TIER I (APPRENTICE)',
        scale: 1.0,
        auraColor: 'from-slate-600 to-slate-400',
        glowClass: 'border border-slate-700',
        colorBadge: 'bg-slate-700 text-slate-200',
        wings: false
      };
    }
  };

  const tierInfo = getTierInfo(hero.level);

  // Dynamic Scaling incorporates Level + Win-Streak Bonus
  const winRate = hero.totalBattles > 0 ? (hero.totalWins / hero.totalBattles) : 0;
  const streakScaleBonus = Math.min(0.25, winRate * 0.15 + (hero.totalWins >= 10 ? 0.1 : hero.totalWins >= 5 ? 0.05 : 0));
  const dynamicHeroScale = Number((tierInfo.scale + streakScaleBonus).toFixed(2));

  // Opponents
  const defaultOpponents = availableOpponents.length > 0
    ? availableOpponents
    : [
        { model_id: 'ouroboros/ARE-rLOGIC-70b', name: 'ARE rLOGIC 70B (Throne Sovereign)', org: 'Ouroboros Collective', elo: 2180 },
        { model_id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Neural Invariant Arbiter)', org: 'Google DeepMind', elo: 2145 },
        { model_id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (AST Reasoning Golem)', org: 'DeepSeek AI', elo: 2110 },
        { model_id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B (Clause Refutation Dragon)', org: 'Meta AI', elo: 2040 }
      ];

  const [selectedOpponentIdx, setSelectedOpponentIdx] = useState(0);
  const currentOpponent = defaultOpponents[selectedOpponentIdx] || defaultOpponents[0];

  // Derived Combat Stats via CombatEngine
  const heroCombatStats: CombatStats = CombatEngine.calculateHeroCombatStats(hero, {
    merkleRootHash: `0x_proof_${hero.level}_${hero.revisionPoints}`
  });
  const opponentCombatStats: CombatStats = CombatEngine.calculateOpponentCombatStats(
    currentOpponent,
    hero.level
  );

  // Battle State
  const [battleActive, setBattleActive] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState<1 | 2 | 4>(1);
  const [battleTurn, setBattleTurn] = useState(0);
  const [combatWinner, setCombatWinner] = useState<'hero' | 'enemy' | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [lastReceiptHash, setLastReceiptHash] = useState<string>('');
  const [currentCombatTurnData, setCurrentCombatTurnData] = useState<CombatTurn | null>(null);
  const [levelUpCelebration, setLevelUpCelebration] = useState<{ active: boolean; newLevel: number } | null>(null);

  // Deterministic Match Pipeline Reference
  const activeMatchRevisionRef = useRef<CombatRevisionRecord | null>(null);
  const currentTurnIndexRef = useRef<number>(0);

  // Training grounds state
  const [trainingActive, setTrainingActive] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingName, setTrainingName] = useState('');

  // Spawn floating text
  const addFloatingText = (text: string, type: FloatingText['type'], x: number, y: number) => {
    const id = `ft_${Math.random().toString(36).substring(2, 9)}`;
    setFloatingTexts(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(f => f.id !== id));
    }, 1200);
  };

  // Idempotent XP Grant with Level-Up Fanfare
  const grantXp = (amount: number, reason: string) => {
    let newXp = hero.currentXp + amount;
    let newLevel = hero.level;
    let newStatPoints = hero.statPointsAvailable;
    let leveledUp = false;

    while (newXp >= getXpNeeded(newLevel)) {
      newXp -= getXpNeeded(newLevel);
      newLevel += 1;
      newStatPoints += 3;
      leveledUp = true;
    }

    if (leveledUp) {
      playSfx('level_up');
      setLevelUpCelebration({ active: true, newLevel });
      setTimeout(() => setLevelUpCelebration(null), 4000);
      addFloatingText(`✨ LEVEL UP! ${newLevel}`, 'xp', 30, 35);
    } else {
      addFloatingText(`+${amount} XP`, 'xp', 30, 55);
    }

    const updatedHero: HeroProfile = {
      ...hero,
      level: newLevel,
      currentXp: newXp,
      statPointsAvailable: newStatPoints,
      revisionPoints: hero.revisionPoints + Math.round(amount / 2)
    };

    saveHero(updatedHero);
  };

  // Idempotent Claim for Reached Milestones & Medals
  const handleClaimMilestone = (medal: HonorMedalDefinition) => {
    const milestoneId = medal.id;
    const existingClaimed = hero.claimedMilestoneIds || [];

    // Idempotent Check: if already claimed, do nothing!
    if (existingClaimed.includes(milestoneId)) {
      return;
    }

    playSfx('win');
    addFloatingText(`🎖️ CLAIMED: ${medal.name}!`, 'heal', 50, 40);

    let newXp = hero.currentXp + medal.rewardXp;
    let newLevel = hero.level;
    let newStatPoints = hero.statPointsAvailable + medal.rewardSp;

    while (newXp >= getXpNeeded(newLevel)) {
      newXp -= getXpNeeded(newLevel);
      newLevel += 1;
      newStatPoints += 3;
    }

    const updatedHero: HeroProfile = {
      ...hero,
      level: newLevel,
      currentXp: newXp,
      statPointsAvailable: newStatPoints,
      revisionPoints: hero.revisionPoints + medal.rewardRevisionPts,
      claimedMilestoneIds: [...existingClaimed, milestoneId]
    };

    saveHero(updatedHero);
  };

  // -------------------------------------------------------------
  // PURE DETERMINISTIC COMBAT ENGINE EXECUTION
  // -------------------------------------------------------------
  const startBattle = () => {
    // 1. Calculate entire deterministic match sequence based purely on immutable dataset attributes
    const matchRecord = CombatEngine.runFullCombat(
      {
        name: hero.name,
        className: hero.className,
        level: hero.level,
        currentXp: hero.currentXp,
        totalBattles: hero.totalBattles,
        totalWins: hero.totalWins,
        revisionPoints: hero.revisionPoints,
        allocatedStats: hero.allocatedStats,
        selectedModel3DId: selectedModel3D?.id
      },
      currentOpponent,
      {
        merkleRootHash: `0x_proof_root_${hero.level}_${hero.revisionPoints}`
      }
    );

    activeMatchRevisionRef.current = matchRecord;
    currentTurnIndexRef.current = 0;

    setBattleTurn(1);
    setCombatWinner(null);
    setCurrentCombatTurnData(null);
    setLastReceiptHash(matchRecord.proofOfWorkHash);

    setBattleLogs([
      {
        id: `log_0`,
        turn: 0,
        actor: 'Referee',
        actionName: 'BATTLE START',
        damage: 0,
        isCrit: false,
        message: `⚔️ Pure Deterministic Title match initiated: [${hero.name} Lv.${hero.level} (${dynamicHeroScale}x)] VS [${currentOpponent.name}]! Proof: ${matchRecord.proofOfWorkHash.slice(0, 14)}...`,
        type: 'system'
      }
    ]);

    setBattleActive(true);
  };

  // -------------------------------------------------------------
  // AUTOMATIC COMBAT ANIMATION TICK (No WASD / Manual Movement)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!battleActive || combatWinner || !activeMatchRevisionRef.current) return;

    const matchRecord = activeMatchRevisionRef.current;
    const delay = 1300 / battleSpeed;

    const timer = setTimeout(() => {
      const turnIndex = currentTurnIndexRef.current;

      if (turnIndex < matchRecord.turns.length) {
        const turnData = matchRecord.turns[turnIndex];
        setCurrentCombatTurnData(turnData);
        setBattleTurn(turnData.turn);

        // Sound & Floating text
        playSfx(turnData.isCrit ? 'crit' : turnData.isUltimate ? 'skill' : 'hit');
        addFloatingText(
          turnData.isCrit ? `💥 CRIT -${turnData.mitigatedDamage}` : `-${turnData.mitigatedDamage}`,
          turnData.isCrit ? 'crit' : turnData.attacker === 'hero' ? 'damage_enemy' : 'damage_hero',
          turnData.attacker === 'hero' ? 70 : 30,
          42
        );

        // Add to log
        const logEntry: BattleLogEntry = {
          id: `log_${turnData.turn}_${turnIndex}`,
          turn: turnData.turn,
          actor: turnData.attackerName,
          actionName: turnData.actionName,
          damage: turnData.mitigatedDamage,
          isCrit: turnData.isCrit,
          message: turnData.message,
          type: turnData.actionType === 'ultimate' ? 'ultimate' : 'attack'
        };

        setBattleLogs(prev => [logEntry, ...prev.slice(0, 40)]);
        currentTurnIndexRef.current += 1;
      } else {
        // MATCH FINISHED: Save Proof of Work Revision to Firestore
        const isVictory = matchRecord.outcome === 'VICTORY';
        const winner = isVictory ? 'hero' : 'enemy';
        setCombatWinner(winner);
        setBattleActive(false);

        // Save proof-of-work revision to Firestore
        CombatEngine.saveCombatRevisionToFirestore(matchRecord, user).then((res) => {
          if (res.success) {
            console.log('Proof-of-work combat revision permanently anchored to Firestore:', res.revisionId);
          }
        });

        const receipt = matchRecord.proofOfWorkHash;
        const alreadyProcessed = (hero.processedMatchReceipts || []).includes(receipt);

        if (!alreadyProcessed) {
          if (isVictory) {
            playSfx('win');
            grantXp(matchRecord.xpAwarded, 'Tournament Battle Victory');

            saveHero({
              ...hero,
              totalBattles: hero.totalBattles + 1,
              totalWins: hero.totalWins + 1,
              revisionPoints: hero.revisionPoints + matchRecord.pointsAwarded,
              processedMatchReceipts: [...(hero.processedMatchReceipts || []), receipt]
            });
          } else {
            grantXp(matchRecord.xpAwarded, 'Battle Consolation XP');
            saveHero({
              ...hero,
              totalBattles: hero.totalBattles + 1,
              processedMatchReceipts: [...(hero.processedMatchReceipts || []), receipt]
            });
          }
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [battleActive, battleTurn, battleSpeed, combatWinner]);

  // Deterministic Training Drill
  const runTrainingDrill = (drillName: string, xpReward: number, durationMs: number) => {
    if (trainingActive || battleActive) return;
    setTrainingActive(true);
    setTrainingName(drillName);
    setTrainingProgress(0);

    const stepMs = 50;
    const totalSteps = durationMs / stepMs;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const pct = Math.min(100, Math.round((step / totalSteps) * 100));
      setTrainingProgress(pct);

      if (step >= totalSteps) {
        clearInterval(interval);
        setTrainingActive(false);
        grantXp(xpReward, drillName);
        playSfx('skill');
        saveHero({
          ...hero,
          totalTrainingSessions: hero.totalTrainingSessions + 1,
          revisionPoints: hero.revisionPoints + 20
        });
      }
    }, stepMs);
  };

  // Stat Allocation Handler
  const allocateStat = (statType: 'hpBonus' | 'atkBonus' | 'defBonus' | 'critBonus') => {
    if (hero.statPointsAvailable <= 0) return;
    const updatedHero: HeroProfile = {
      ...hero,
      statPointsAvailable: hero.statPointsAvailable - 1,
      allocatedStats: {
        ...hero.allocatedStats,
        [statType]: hero.allocatedStats[statType] + 1
      }
    };
    saveHero(updatedHero);
    playSfx('shield');
  };

  // Load Match from Match Queue into 3D Arena
  const handleLoadQueueMatchInto3D = (item: MatchQueueItem) => {
    setViewMode('3d');
    const f1Model: CharacterModel3DInfo = {
      id: item.fighter1.id,
      name: item.fighter1.name,
      characterClass: item.fighter1.characterClass,
      modelUrl: item.fighter1.modelUrl || '',
      scale: item.fighter1.scale || 1.0,
      description: item.fighter1.description,
      evidenceAffinity: item.fighter1.evidenceAffinity
    };
    setSelectedModel3D(f1Model);

    if (item.revisionRecord) {
      activeMatchRevisionRef.current = item.revisionRecord;
      currentTurnIndexRef.current = 0;
      setBattleTurn(1);
      setCombatWinner(null);
      setCurrentCombatTurnData(null);
      setLastReceiptHash(item.proofOfWorkHash || '');
      setBattleActive(true);
    } else {
      startBattle();
    }
  };

  return (
    <div className="space-y-6">
      {/* Level Up Fanfare Toast */}
      <AnimatePresence>
        {levelUpCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 px-6 py-3.5 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-3 font-mono font-black select-none pointer-events-none"
          >
            <Sparkles className="w-6 h-6 animate-spin" />
            <div>
              <div className="text-sm uppercase tracking-wider">LEVEL UP ACHIEVED!</div>
              <div className="text-xs font-bold text-slate-900">Your Hero reached Level {levelUpCelebration.newLevel} &amp; grew in size! (+3 SP)</div>
            </div>
            <Crown className="w-6 h-6 animate-bounce" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* RPG Top Master Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Background Runes Ambient Glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
                  ARE 3D RPG Auto-Battler &amp; Proof-of-Work Engine
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black ${tierInfo.colorBadge}`}>
                  {tierInfo.tier}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 border border-slate-800 text-[10px] font-mono font-bold">
                  Scale: {dynamicHeroScale}x
                </span>
                {hero.totalWins >= 3 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-emerald-400" />
                    +{Math.round(streakScaleBonus * 100)}% Win Streak Growth
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                3D Three.js Chibi Fighter environment, deterministic CombatEngine calculated solely on immutable dataset attributes, and proof-of-work revisions saved to Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Honor Medals Vault Button */}
            <button
              onClick={() => setMedalsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono rounded-xl min-h-[40px] transition-colors"
              title="Open Honor Medals Vault & Idempotent Claims"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Honor Medals Vault</span>
            </button>

            {/* 3D GLB Chibi Fighter Selector Button */}
            <button
              onClick={() => setModelSelectorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl border border-slate-800 min-h-[40px] transition-colors"
              title="Select or upload 3D GLB Chibi Fighter"
            >
              <Box className="w-4 h-4 text-cyan-400" />
              <span>3D Model: {selectedModel3D?.name.split(' ')[0] || 'Chibi'}</span>
            </button>

            {/* Audio Button */}
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl border border-slate-800 min-h-[40px] transition-colors"
              title="Toggle Retro Chime Audio"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span>{soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>
            </button>

            {onExportToHf && (
              <button
                onClick={() => onExportToHf(
                  'arena_match',
                  `RPG Hero Profile & Evidence Passport: ${hero.name}`,
                  {
                    hero_profile: hero,
                    tier: tierInfo.tier,
                    dynamic_scale: dynamicHeroScale,
                    stats: heroCombatStats,
                    last_receipt: lastReceiptHash
                  },
                  'ouroboroscollective/evidence-bound-css'
                )}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md min-h-[40px]"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Export Hero to HF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Character Profile Sheet & Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hero Avatar & Level Progress Card */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-slate-100">Hero Character Avatar</h4>
              </div>
              <span className="text-xs font-mono font-bold text-amber-300">
                Lv. {hero.level}
              </span>
            </div>

            {/* Visual Pixel / 2D Avatar Sprite Box with Framer Motion Scaling */}
            <div className="relative w-full h-56 bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center p-4 overflow-hidden">
              {/* Radial Aura Glow based on Tier */}
              <div
                className={`absolute w-36 h-36 rounded-full bg-gradient-to-tr ${tierInfo.auraColor} opacity-20 blur-xl animate-pulse pointer-events-none`}
              />

              {/* Runic Wings for Tier 3 & 4 */}
              {tierInfo.wings && (
                <div className="absolute text-amber-400/40 text-6xl animate-pulse font-serif pointer-events-none select-none">
                  🪽 🪽
                </div>
              )}

              {/* Character Animated Sprite Container using Framer Motion */}
              <motion.div
                animate={{ scale: dynamicHeroScale }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="relative z-10 flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  playSfx('skill');
                  addFloatingText('⚔️ Logic Ready!', 'heal', 50, 40);
                }}
              >
                {/* Crown / Halo */}
                {hero.level >= 5 && (
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-amber-300 text-lg mb-1"
                  >
                    👑
                  </motion.div>
                )}

                {/* RPG Character Figure */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl transition-all ${tierInfo.glowClass} bg-gradient-to-br from-slate-800 via-slate-900 to-black`}>
                  {hero.className === 'paladin' ? '🛡️' : hero.className === 'archmage' ? '🔮' : hero.className === 'assassin' ? '🗡️' : hero.className === 'berserker' ? '🪓' : '👑'}
                </div>

                <span className="mt-2 text-xs font-black font-mono text-amber-300 tracking-wider">
                  {hero.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {tierInfo.title}
                </span>
              </motion.div>

              {/* Active 3D GLB Model Badge */}
              <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                <Box className="w-3 h-3 text-cyan-400" />
                <span>{selectedModel3D?.name || '3D Chibi'}</span>
              </div>

              {/* Revision Points Badge */}
              <div className="absolute bottom-2 right-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{hero.revisionPoints} pts</span>
              </div>
            </div>

            {/* Experience Bar */}
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Experience (XP):</span>
                <span className="text-amber-300 font-bold">
                  {hero.currentXp} / {getXpNeeded(hero.level)} XP
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full"
                  animate={{ width: `${Math.min(100, Math.max(5, (hero.currentXp / getXpNeeded(hero.level)) * 100))}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Class Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-mono block">Class Specialty:</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                {[
                  { id: 'paladin', label: '🛡️ Paladin (DEF)' },
                  { id: 'archmage', label: '🔮 Archmage (Burst)' },
                  { id: 'assassin', label: '🗡️ Assassin (Crit)' },
                  { id: 'berserker', label: '🪓 Berserker (ATK)' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      saveHero({ ...hero, className: c.id as CharacterClass });
                      playSfx('shield');
                    }}
                    className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-colors ${
                      hero.className === c.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Record Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono text-xs">
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Battles</span>
              <span className="font-bold text-slate-200">{hero.totalBattles}</span>
            </div>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Wins</span>
              <span className="font-bold text-emerald-400">{hero.totalWins}</span>
            </div>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Win Rate</span>
              <span className="font-bold text-amber-300">
                {hero.totalBattles > 0 ? `${Math.round((hero.totalWins / hero.totalBattles) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Column: RPG Attributes & Stat Upgrades */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-100">RPG Attributes &amp; Points</h4>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-bold">
                {hero.statPointsAvailable} SP Available
              </span>
            </div>

            {/* Stat Rows with Upgrade Buttons */}
            <div className="space-y-2.5 font-mono text-xs">
              {/* HP */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="text-slate-300 font-bold block">Health / Shield (HP)</span>
                    <span className="text-[11px] text-slate-500">Base {heroCombatStats.maxHp}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-rose-400">{heroCombatStats.maxHp}</span>
                  <button
                    onClick={() => allocateStat('hpBonus')}
                    disabled={hero.statPointsAvailable <= 0}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-amber-500 disabled:opacity-30 text-white hover:text-slate-950 font-black flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ATK */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-slate-300 font-bold block">Logic Strike (ATK)</span>
                    <span className="text-[11px] text-slate-500">Base {heroCombatStats.atk}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-amber-400">{heroCombatStats.atk}</span>
                  <button
                    onClick={() => allocateStat('atkBonus')}
                    disabled={hero.statPointsAvailable <= 0}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-amber-500 disabled:opacity-30 text-white hover:text-slate-950 font-black flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* DEF */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-slate-300 font-bold block">Invariant Defense (DEF)</span>
                    <span className="text-[11px] text-slate-500">Base {heroCombatStats.def}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-indigo-400">{heroCombatStats.def}</span>
                  <button
                    onClick={() => allocateStat('defBonus')}
                    disabled={hero.statPointsAvailable <= 0}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-amber-500 disabled:opacity-30 text-white hover:text-slate-950 font-black flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CRIT */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-slate-300 font-bold block">Critical Wit (CRIT)</span>
                    <span className="text-[11px] text-slate-500">Rate {heroCombatStats.critRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-cyan-400">{heroCombatStats.critRate.toFixed(1)}%</span>
                  <button
                    onClick={() => allocateStat('critBonus')}
                    disabled={hero.statPointsAvailable <= 0}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-amber-500 disabled:opacity-30 text-white hover:text-slate-950 font-black flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Equipped Medals Power Boost */}
          <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 text-xs font-mono space-y-1">
            <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>Idempotent Claims: {(hero.claimedMilestoneIds || []).length} Claimed</span>
            </span>
            <p className="text-slate-300 text-[11px]">
              Click "Honor Medals Vault" to view and claim reached milestone rewards without ever duplicate-awarding.
            </p>
          </div>
        </div>

        {/* Right Column: Training Dojo (Quick XP Grind) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-slate-100">Training Grounds (XP Dojo)</h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {hero.totalTrainingSessions} Sessions
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Complete automated logic reasoning drills to grind experience and level up without waiting for tournament turns.
            </p>

            {trainingActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2"
              >
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-amber-300 font-bold">{trainingName}</span>
                  <span className="text-slate-400">{trainingProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-100"
                    style={{ width: `${trainingProgress}%` }}
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-2 text-xs font-mono">
              {[
                { name: '📐 DAG Acyclicity Sparring', xp: 85, time: 2000, desc: 'Topological order constraint solver' },
                { name: '🛡️ CSS Invariant Bounding Drill', xp: 120, time: 3000, desc: 'Zero-overflow layout verification' },
                { name: '⚡ Davis-Putnam SAT Solver Grind', xp: 175, time: 4000, desc: 'Empty clause refutation derivation' },
                { name: '👑 Sovereign Passport Proof Crucible', xp: 240, time: 5000, desc: 'SHA-256 Merkle root invariant checks' }
              ].map((drill, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-slate-200 font-bold block">{drill.name}</span>
                    <span className="text-[10px] text-slate-500">{drill.desc}</span>
                  </div>
                  <button
                    onClick={() => runTrainingDrill(drill.name, drill.xp, drill.time)}
                    disabled={trainingActive || battleActive}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-[11px] font-black rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
                  >
                    +{drill.xp} XP
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono text-center">
            Grinding increases character level, physical avatar scale &amp; combat prowess.
          </div>
        </div>
      </div>

      {/* 🎮 MAIN ARENA AUTO-BATTLER STAGE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Arena Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Raid Arena Autobattler</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono rounded-full font-bold">
                  {battleActive ? '⚔️ ROUND IN PROGRESS' : combatWinner ? '🏁 MATCH FINISHED' : 'READY TO FIGHT'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Turn-by-turn automated logic battles in 3D Three.js WebGL with GLB Chibi Fighters, verifiable proof-of-work receipts, and zero random seeds.
              </p>
            </div>
          </div>

          {/* Battle Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 3D vs 2D Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                  viewMode === '3d' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D WebGL</span>
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                  viewMode === '2d' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D Sprites</span>
              </button>
            </div>

            {/* Speed Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-[10px] text-slate-400 px-1.5">Speed:</span>
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setBattleSpeed(s as any)}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    battleSpeed === s ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Target Opponent Selector */}
            <select
              value={selectedOpponentIdx}
              onChange={(e) => setSelectedOpponentIdx(Number(e.target.value))}
              disabled={battleActive}
              className="bg-slate-950 border border-slate-800 text-amber-300 text-xs font-mono font-bold px-3 py-2 rounded-xl focus:outline-none min-h-[40px]"
            >
              {defaultOpponents.map((op, idx) => (
                <option key={op.model_id} value={idx} className="bg-slate-900 text-slate-200">
                  Target: {op.name} ({op.elo} ELO)
                </option>
              ))}
            </select>

            {/* Fight / Reset Buttons */}
            {!battleActive ? (
              <button
                onClick={startBattle}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all min-h-[40px]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Start 3D Auto-Battle</span>
              </button>
            ) : (
              <button
                onClick={() => setBattleActive(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-rose-400 text-xs font-bold rounded-xl border border-slate-800 min-h-[40px]"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}
          </div>
        </div>

        {/* 3D ARENA VIEWPORT (THREE.JS WEBGL) */}
        {viewMode === '3d' ? (
          <div className="relative">
            <ArenaViewport
              heroName={hero.name}
              heroClass={hero.className}
              heroLevel={hero.level}
              heroScale={dynamicHeroScale}
              selectedModel3D={selectedModel3D}
              opponentName={currentOpponent.name}
              opponentModelId={currentOpponent.model_id}
              currentTurnData={currentCombatTurnData}
              isCombatActive={battleActive}
              heroStats={heroCombatStats}
              opponentStats={opponentCombatStats}
            />

            {/* Victory / Defeat Modal Overlay */}
            <AnimatePresence>
              {combatWinner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 rounded-2xl"
                >
                  <div className="p-5 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/50 rounded-2xl max-w-md w-full space-y-3 shadow-2xl">
                    <div className="text-4xl">
                      {combatWinner === 'hero' ? '🏆' : '💀'}
                    </div>
                    <h4 className="text-xl font-black font-mono text-slate-100">
                      {combatWinner === 'hero' ? '3D VICTORY ACHIEVED!' : 'CHALLENGE REPELLED!'}
                    </h4>
                    <p className="text-xs text-slate-300 font-mono">
                      {combatWinner === 'hero'
                        ? `Your Chibi Fighter deposed the opponent with pure deterministic proof-of-work derivation!`
                        : `The opponent defended their claim. Gain consolation experience and refine your invariants!`}
                    </p>

                    {lastReceiptHash && (
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 flex items-center justify-between">
                        <span className="text-slate-500">POW Receipt:</span>
                        <span className="font-bold truncate max-w-[220px]">{lastReceiptHash}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={startBattle}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-colors min-h-[40px]"
                      >
                        Battle Again
                      </button>
                      <button
                        onClick={() => setCombatWinner(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors min-h-[40px]"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* 2D SPRITE ARENA VIEWPORT (ALTERNATIVE) */
          <div className="relative w-full h-80 sm:h-96 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none">
            {/* Top HUD */}
            <div className="grid grid-cols-2 gap-6 z-20 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">{hero.name} (Lv.{hero.level})</span>
                  <span className="text-amber-400 font-bold">
                    HP: {currentCombatTurnData ? currentCombatTurnData.heroHpRemaining : heroCombatStats.currentHp} / {heroCombatStats.maxHp}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, (currentCombatTurnData ? currentCombatTurnData.heroHpRemaining : heroCombatStats.currentHp) / heroCombatStats.maxHp * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold">
                    HP: {currentCombatTurnData ? currentCombatTurnData.opponentHpRemaining : opponentCombatStats.currentHp} / {opponentCombatStats.maxHp}
                  </span>
                  <span className="font-bold text-rose-300">{currentOpponent.name.split(' ')[0]}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300 ml-auto"
                    style={{
                      width: `${Math.max(0, Math.min(100, (currentCombatTurnData ? currentCombatTurnData.opponentHpRemaining : opponentCombatStats.currentHp) / opponentCombatStats.maxHp * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sprites */}
            <div className="flex items-center justify-between px-12 my-auto z-10">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl bg-slate-900 border-2 border-amber-500">
                  {hero.className === 'paladin' ? '🛡️' : hero.className === 'archmage' ? '🔮' : hero.className === 'assassin' ? '🗡️' : '🪓'}
                </div>
                <span className="mt-2 text-xs font-mono font-bold text-amber-300">{hero.name}</span>
              </div>

              <div className="text-center font-mono">
                <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-amber-400">
                  VS
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">T#{battleTurn}</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl bg-slate-900 border-2 border-rose-500">
                  👑
                </div>
                <span className="mt-2 text-xs font-mono font-bold text-rose-300">{currentOpponent.name.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Auto-Battle Log Terminal */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 max-h-48 overflow-y-auto touch-scroll-y">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400">Combat Feed Terminal (Proof-of-Work Log)</span>
            <span>{battleLogs.length} events logged</span>
          </div>

          <div className="space-y-1.5">
            {battleLogs.length === 0 ? (
              <span className="text-slate-500">Awaiting match initiation...</span>
            ) : (
              battleLogs.map(log => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded flex items-center justify-between gap-2 text-[11px] ${
                    log.type === 'ultimate'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold'
                      : log.isCrit
                      ? 'bg-rose-500/10 text-rose-300 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500">T{log.turn}</span>
                    <span className="truncate">{log.message}</span>
                  </div>
                  {log.damage > 0 && (
                    <span className="font-black text-rose-400 shrink-0">
                      -{log.damage}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 📋 REAL-TIME MATCH QUEUE & DETERMINISTIC SIMULATION VISUALIZER */}
      <MatchQueueVisualizer
        unlockedFighters={DEFAULT_3D_CHIBI_MODELS}
        heroLevel={hero.level}
        onLoadMatchInto3D={handleLoadQueueMatchInto3D}
      />

      {/* 3D Model Selector Modal */}
      <Model3DSelectorModal
        isOpen={modelSelectorOpen}
        onClose={() => setModelSelectorOpen(false)}
        selectedModelId={selectedModel3D?.id || 'chibi_paladin_aegis'}
        onSelectModel={(model) => {
          setSelectedModel3D(model);
          saveHero({ ...hero, selectedModel3DId: model.id });
        }}
      />

      {/* Honor Medals Vault Modal */}
      <HonorMedalsVaultModal
        isOpen={medalsModalOpen}
        onClose={() => setMedalsModalOpen(false)}
        hero={hero}
        claimedMilestoneIds={hero.claimedMilestoneIds || []}
        onClaimMilestone={handleClaimMilestone}
      />
    </div>
  );
};
