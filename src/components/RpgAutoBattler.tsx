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
  Dumbbell
} from 'lucide-react';

export type CharacterClass = 'paladin' | 'archmage' | 'assassin' | 'berserker';

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
  equippedMedalId?: string;
}

interface FloatingText {
  id: string;
  text: string;
  type: 'damage_hero' | 'damage_enemy' | 'heal' | 'crit' | 'shield' | 'xp' | 'miss';
  x: number;
  y: number;
}

interface CombatantState {
  name: string;
  maxHp: number;
  currentHp: number;
  maxEnergy: number;
  currentEnergy: number;
  atk: number;
  def: number;
  critRate: number;
  speed: number;
  level: number;
  scale: number;
  isHero: boolean;
  statusEffects: Array<{ name: string; duration: number; type: 'buff' | 'debuff' }>;
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
      statPointsAvailable: 3
    };
  });

  const saveHero = (updatedHero: HeroProfile) => {
    setHero(updatedHero);
    try {
      localStorage.setItem('are_rpg_hero_profile_v2', JSON.stringify(updatedHero));
    } catch (e) {
      console.warn('Failed to persist hero:', e);
    }
  };

  // XP needed formula
  const getXpNeeded = (lvl: number) => Math.round(100 * Math.pow(1.3, lvl - 1));

  // Compute base scale & title tier based on level
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

  // Dynamic Scaling incorporates Level + Win-Streak & Win-Rate Efficiency Multiplier
  const winRate = hero.totalBattles > 0 ? (hero.totalWins / hero.totalBattles) : 0;
  const streakScaleBonus = Math.min(0.25, winRate * 0.15 + (hero.totalWins >= 10 ? 0.1 : hero.totalWins >= 5 ? 0.05 : 0));
  const dynamicHeroScale = Number((tierInfo.scale + streakScaleBonus).toFixed(2));

  // Compute full Hero Combat Stats
  const calculateHeroStats = () => {
    const baseHp = hero.className === 'paladin' ? 600 : hero.className === 'berserker' ? 550 : 450;
    const baseAtk = hero.className === 'berserker' ? 65 : hero.className === 'assassin' ? 70 : hero.className === 'archmage' ? 68 : 50;
    const baseDef = hero.className === 'paladin' ? 45 : hero.className === 'archmage' ? 25 : 30;
    const baseCrit = hero.className === 'assassin' ? 25 : 12;
    const baseSpeed = hero.className === 'assassin' ? 120 : hero.className === 'archmage' ? 105 : 95;

    return {
      maxHp: baseHp + (hero.level - 1) * 55 + hero.allocatedStats.hpBonus * 40,
      atk: baseAtk + (hero.level - 1) * 9 + hero.allocatedStats.atkBonus * 6,
      def: baseDef + (hero.level - 1) * 6 + hero.allocatedStats.defBonus * 5,
      critRate: Math.min(65, baseCrit + (hero.level - 1) * 1.5 + hero.allocatedStats.critBonus * 3),
      speed: baseSpeed + (hero.level - 1) * 4
    };
  };

  // Opponent Setup
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

  // Battle Engine State
  const [battleActive, setBattleActive] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState<1 | 2 | 4>(1);
  const [battleTurn, setBattleTurn] = useState(0);
  const [combatWinner, setCombatWinner] = useState<'hero' | 'enemy' | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [lastReceiptHash, setLastReceiptHash] = useState<string>('');

  // Live Combatants in Arena
  const [heroCombatant, setHeroCombatant] = useState<CombatantState | null>(null);
  const [enemyCombatant, setEnemyCombatant] = useState<CombatantState | null>(null);

  // Animation triggers & Projectiles
  const [heroAnim, setHeroAnim] = useState<'idle' | 'attack' | 'hit' | 'ultimate' | 'block'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit' | 'ultimate' | 'block'>('idle');
  const [projectileEffect, setProjectileEffect] = useState<{ active: boolean; type: 'hero_slash' | 'enemy_strike' | 'ultimate_burst' } | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [levelUpCelebration, setLevelUpCelebration] = useState<{ active: boolean; newLevel: number } | null>(null);

  // Training grounds state
  const [trainingActive, setTrainingActive] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingName, setTrainingName] = useState('');

  // Spawn floating text
  const addFloatingText = (text: string, type: FloatingText['type'], x: number, y: number) => {
    const id = `ft_${Date.now()}_${Math.random()}`;
    setFloatingTexts(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(f => f.id !== id));
    }, 1200);
  };

  // Add XP and handle Level-Up with Fanfare
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

  // Initialize Combat
  const startBattle = () => {
    const hStats = calculateHeroStats();
    const eLevel = Math.max(1, hero.level + (selectedOpponentIdx - 1));
    const eHp = 480 + eLevel * 50;
    const eAtk = 48 + eLevel * 8;
    const eDef = 28 + eLevel * 5;

    setHeroCombatant({
      name: hero.name,
      maxHp: hStats.maxHp,
      currentHp: hStats.maxHp,
      maxEnergy: 100,
      currentEnergy: 20,
      atk: hStats.atk,
      def: hStats.def,
      critRate: hStats.critRate,
      speed: hStats.speed,
      level: hero.level,
      scale: dynamicHeroScale,
      isHero: true,
      statusEffects: []
    });

    setEnemyCombatant({
      name: currentOpponent.name,
      maxHp: eHp,
      currentHp: eHp,
      maxEnergy: 100,
      currentEnergy: 10,
      atk: eAtk,
      def: eDef,
      critRate: 15,
      speed: 90 + eLevel * 3,
      level: eLevel,
      scale: 1.0 + eLevel * 0.02,
      isHero: false,
      statusEffects: []
    });

    setBattleTurn(1);
    setCombatWinner(null);
    setBattleLogs([
      {
        id: `log_0`,
        turn: 0,
        actor: 'Referee',
        actionName: 'BATTLE START',
        damage: 0,
        isCrit: false,
        message: `⚔️ Title match initiated: [${hero.name} Lv.${hero.level} (${dynamicHeroScale}x)] VS [${currentOpponent.name} Lv.${eLevel}]!`,
        type: 'system'
      }
    ]);
    setBattleActive(true);
  };

  // Battle Turn Loop Effect
  useEffect(() => {
    if (!battleActive || combatWinner || !heroCombatant || !enemyCombatant) return;

    const delay = 1400 / battleSpeed;
    const timer = setTimeout(() => {
      // Execute 1 turn
      const heroFirst = heroCombatant.speed >= enemyCombatant.speed;

      // First Actor Strike
      const attacker = heroFirst ? heroCombatant : enemyCombatant;
      const defender = heroFirst ? enemyCombatant : heroCombatant;
      const isHeroAttacking = heroFirst;

      const isUltimate = attacker.currentEnergy >= 100;
      const isCrit = Math.random() * 100 < attacker.critRate;
      let rawDamage = isUltimate
        ? attacker.atk * 2.4
        : attacker.atk * (1 + (Math.random() * 0.3 - 0.15));

      if (isCrit) rawDamage *= 1.6;

      const defReduction = Math.max(0.2, 1 - defender.def / (defender.def + 120));
      const finalDamage = Math.max(15, Math.round(rawDamage * defReduction));

      const newDefenderHp = Math.max(0, defender.currentHp - finalDamage);
      const newAttackerEnergy = isUltimate ? 0 : Math.min(100, attacker.currentEnergy + 35);

      // Trigger Framer Motion animations & Projectiles
      if (isHeroAttacking) {
        setHeroAnim(isUltimate ? 'ultimate' : 'attack');
        setEnemyAnim('hit');
        setProjectileEffect({ active: true, type: isUltimate ? 'ultimate_burst' : 'hero_slash' });
        playSfx(isCrit ? 'crit' : isUltimate ? 'skill' : 'hit');
        addFloatingText(
          isCrit ? `💥 CRIT -${finalDamage}` : `-${finalDamage}`,
          isCrit ? 'crit' : 'damage_enemy',
          72,
          42
        );
      } else {
        setEnemyAnim(isUltimate ? 'ultimate' : 'attack');
        setHeroAnim('hit');
        setProjectileEffect({ active: true, type: 'enemy_strike' });
        playSfx(isCrit ? 'crit' : isUltimate ? 'skill' : 'hit');
        addFloatingText(
          isCrit ? `💥 CRIT -${finalDamage}` : `-${finalDamage}`,
          isCrit ? 'crit' : 'damage_hero',
          28,
          42
        );
      }

      // Screen Shake
      if (isCrit || isUltimate) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 300);
      }

      setTimeout(() => {
        setHeroAnim('idle');
        setEnemyAnim('idle');
        setProjectileEffect(null);
      }, 500 / battleSpeed);

      // Action Title
      const actionName = isUltimate
        ? isHeroAttacking
          ? '🌌 AST Empty Clause Contradiction'
          : '⚡ Neural Invariant Disruption'
        : isHeroAttacking
        ? '⚔️ Logic Resolution Attack'
        : '🛡️ SAT Invariant Counter';

      // Log Entry
      const newLog: BattleLogEntry = {
        id: `log_${Date.now()}_${battleTurn}`,
        turn: battleTurn,
        actor: attacker.name,
        actionName,
        damage: finalDamage,
        isCrit,
        message: `${attacker.name} executed ${actionName} for ${finalDamage} damage!${isCrit ? ' [CRITICAL RESOLUTION]' : ''}`,
        type: isUltimate ? 'ultimate' : 'attack'
      };

      setBattleLogs(prev => [newLog, ...prev.slice(0, 40)]);

      // Update State
      if (isHeroAttacking) {
        setHeroCombatant(h => h ? { ...h, currentEnergy: newAttackerEnergy } : null);
        setEnemyCombatant(e => e ? { ...e, currentHp: newDefenderHp } : null);
      } else {
        setEnemyCombatant(e => e ? { ...e, currentEnergy: newAttackerEnergy } : null);
        setHeroCombatant(h => h ? { ...h, currentHp: newDefenderHp } : null);
      }

      // Check Match End Condition
      if (newDefenderHp <= 0) {
        const winner = isHeroAttacking ? 'hero' : 'enemy';
        setCombatWinner(winner);
        setBattleActive(false);

        const receipt = `rcpt_0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
        setLastReceiptHash(receipt);

        if (winner === 'hero') {
          playSfx('win');
          const xpGained = 180 + hero.level * 25;
          grantXp(xpGained, 'Tournament Battle Victory');

          saveHero({
            ...hero,
            totalBattles: hero.totalBattles + 1,
            totalWins: hero.totalWins + 1,
            revisionPoints: hero.revisionPoints + 85
          });
        } else {
          const xpGained = 60;
          grantXp(xpGained, 'Battle Consolation XP');
          saveHero({
            ...hero,
            totalBattles: hero.totalBattles + 1
          });
        }
      } else {
        setBattleTurn(t => t + 1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [battleActive, battleTurn, battleSpeed, heroCombatant, enemyCombatant, combatWinner]);

  // Quick Training Drill Function
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

  const heroStats = calculateHeroStats();

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
                  ARE RPG Auto-Battler &amp; Hero Growth
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
                Train your logic avatar, accumulate revision XP, level up, unlock mythic visual scale (Raid-style champion growth), and autobattle against tournament champions!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
                    stats: heroStats,
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

                {/* Pixelated / RPG Character Figure */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl transition-all ${tierInfo.glowClass} bg-gradient-to-br from-slate-800 via-slate-900 to-black`}>
                  {hero.className === 'paladin' ? '🛡️' : hero.className === 'archmage' ? '🔮' : hero.className === 'assassin' ? '🗡️' : '🪓'}
                </div>

                <span className="mt-2 text-xs font-black font-mono text-amber-300 tracking-wider">
                  {hero.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {tierInfo.title}
                </span>
              </motion.div>

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
                  { id: 'paladin', label: '🛡️ Paladin (DEF/HP)' },
                  { id: 'archmage', label: '🔮 Archmage (Burst)' },
                  { id: 'assassin', label: '🗡️ Assassin (Crit/SPD)' },
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
                    <span className="text-[11px] text-slate-500">Base {heroStats.maxHp} + {hero.allocatedStats.hpBonus * 40}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-rose-400">{heroStats.maxHp}</span>
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
                    <span className="text-[11px] text-slate-500">Base {heroStats.atk} + {hero.allocatedStats.atkBonus * 6}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-amber-400">{heroStats.atk}</span>
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
                    <span className="text-[11px] text-slate-500">Base {heroStats.def} + {hero.allocatedStats.defBonus * 5}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-indigo-400">{heroStats.def}</span>
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
                    <span className="text-[11px] text-slate-500">Rate {heroStats.critRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-cyan-400">{heroStats.critRate.toFixed(1)}%</span>
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
              <span>Honor Medal Resonance: Active</span>
            </span>
            <p className="text-slate-300 text-[11px]">
              +15% Logic Resolution Burst &amp; AST Shielding enabled by Throne Sovereign &amp; Sentinel Medals.
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
                { name: '🛡️ CSS Invariant Bounding Drill', xp: 120, time: 3000, desc: 'Zero-overflow mobile layout verification' },
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
                Turn-by-turn automated logic battles with Framer Motion sprite animations, logic attack projectiles, floating damage numbers and verifiable receipts.
              </p>
            </div>
          </div>

          {/* Battle Controls */}
          <div className="flex items-center gap-2 flex-wrap">
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
                <span>Start Auto-Battle</span>
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

        {/* 2D ARENA BATTLEGROUND VIEWPORT */}
        <motion.div
          animate={screenShake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.3 }}
          className="relative w-full h-80 sm:h-96 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none"
        >
          {/* Floating Numbers Layer using Framer Motion */}
          <div className="absolute inset-0 pointer-events-none z-30">
            <AnimatePresence>
              {floatingTexts.map(ft => (
                <motion.div
                  key={ft.id}
                  initial={{ opacity: 0, y: 0, scale: 0.6 }}
                  animate={{ opacity: 1, y: -45, scale: 1.15 }}
                  exit={{ opacity: 0, y: -70, scale: 0.8 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
                  className={`absolute font-mono font-black text-sm sm:text-base drop-shadow-md whitespace-nowrap ${
                    ft.type === 'crit'
                      ? 'text-amber-300 text-lg sm:text-xl scale-110'
                      : ft.type === 'damage_hero'
                      ? 'text-rose-400'
                      : ft.type === 'damage_enemy'
                      ? 'text-emerald-400'
                      : 'text-indigo-300'
                  }`}
                >
                  {ft.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Logic Attack Projectile Layer using Framer Motion */}
          <AnimatePresence>
            {projectileEffect && projectileEffect.type === 'hero_slash' && (
              <motion.div
                initial={{ x: '25%', y: '50%', opacity: 0, scale: 0.5 }}
                animate={{ x: '75%', y: '50%', opacity: 1, scale: 1.4 }}
                exit={{ opacity: 0, scale: 1.8 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="absolute text-3xl pointer-events-none z-25 text-amber-400 drop-shadow-lg"
              >
                ⚔️⚡
              </motion.div>
            )}
            {projectileEffect && projectileEffect.type === 'enemy_strike' && (
              <motion.div
                initial={{ x: '75%', y: '50%', opacity: 0, scale: 0.5 }}
                animate={{ x: '25%', y: '50%', opacity: 1, scale: 1.4 }}
                exit={{ opacity: 0, scale: 1.8 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="absolute text-3xl pointer-events-none z-25 text-rose-400 drop-shadow-lg"
              >
                🔥🔮
              </motion.div>
            )}
            {projectileEffect && projectileEffect.type === 'ultimate_burst' && (
              <motion.div
                initial={{ x: '30%', y: '50%', opacity: 0, scale: 0.8 }}
                animate={{ x: '75%', y: '50%', opacity: 1, scale: 2.2, rotate: 360 }}
                exit={{ opacity: 0, scale: 3.0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute text-4xl pointer-events-none z-25 text-cyan-300 drop-shadow-2xl"
              >
                🌌✨
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top HUD: Health & Energy Bars */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 z-20">
            {/* Hero Health & Energy Meter */}
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-100 truncate">{hero.name} (Lv.{hero.level})</span>
                <span className="text-emerald-400 font-bold">
                  {heroCombatant ? heroCombatant.currentHp : heroStats.maxHp} / {heroStats.maxHp} HP
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${heroCombatant ? (heroCombatant.currentHp / heroCombatant.maxHp) * 100 : 100}%`
                  }}
                />
              </div>

              {/* Energy / Burst Bar */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${heroCombatant ? heroCombatant.currentEnergy : 20}%` }}
                />
              </div>
            </div>

            {/* Boss / Opponent Health & Energy Meter */}
            <div className="space-y-1.5 font-mono text-right">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-400 font-bold">
                  {enemyCombatant ? enemyCombatant.currentHp : 550} / {enemyCombatant?.maxHp || 550} HP
                </span>
                <span className="font-bold text-slate-100 truncate">{currentOpponent.name}</span>
              </div>
              <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300 ml-auto"
                  style={{
                    width: `${enemyCombatant ? (enemyCombatant.currentHp / enemyCombatant.maxHp) * 100 : 100}%`
                  }}
                />
              </div>

              {/* Boss Energy Bar */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-300 ml-auto"
                  style={{ width: `${enemyCombatant ? enemyCombatant.currentEnergy : 10}%` }}
                />
              </div>
            </div>
          </div>

          {/* Central Combat Visualizer Stage with Framer Motion Sprites */}
          <div className="relative flex items-center justify-between px-8 sm:px-16 my-auto z-10">
            {/* HERO COMBATANT SPRITE */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={
                  heroAnim === 'attack'
                    ? { x: [0, 85, 0], scale: [dynamicHeroScale, dynamicHeroScale * 1.25, dynamicHeroScale], rotate: [0, 15, 0] }
                    : heroAnim === 'ultimate'
                    ? { scale: [dynamicHeroScale, dynamicHeroScale * 1.5, dynamicHeroScale * 1.2], rotate: [0, -10, 10, 0] }
                    : heroAnim === 'hit'
                    ? { x: [0, -20, 20, -10, 0], opacity: [1, 0.6, 1] }
                    : { scale: dynamicHeroScale, y: [0, -3, 0] }
                }
                transition={
                  heroAnim === 'idle'
                    ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
                    : { duration: 0.4 }
                }
                className="relative cursor-pointer"
              >
                {/* Visual Aura */}
                <div className={`absolute -inset-2 rounded-full bg-gradient-to-tr ${tierInfo.auraColor} opacity-30 blur-md pointer-events-none`} />

                {/* Main Hero Sprite Tile */}
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black ${tierInfo.glowClass}`}>
                  {hero.className === 'paladin' ? '🛡️' : hero.className === 'archmage' ? '🔮' : hero.className === 'assassin' ? '🗡️' : '🪓'}
                </div>
              </motion.div>
              <span className="mt-2 text-xs font-mono font-black text-amber-300">
                {hero.name}
              </span>
            </div>

            {/* VS Emblem / Ultimate Indicator */}
            <div className="text-center font-mono">
              <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-amber-400 shadow-inner">
                VS
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">Turn #{battleTurn}</span>
            </div>

            {/* BOSS / OPPONENT COMBATANT SPRITE */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={
                  enemyAnim === 'attack'
                    ? { x: [0, -85, 0], scale: [1, 1.25, 1], rotate: [0, -15, 0] }
                    : enemyAnim === 'ultimate'
                    ? { scale: [1, 1.5, 1.2], rotate: [0, 10, -10, 0] }
                    : enemyAnim === 'hit'
                    ? { x: [0, 20, -20, 10, 0], opacity: [1, 0.6, 1] }
                    : { y: [0, -3, 0] }
                }
                transition={
                  enemyAnim === 'idle'
                    ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
                    : { duration: 0.4 }
                }
                className="relative"
              >
                <div className="absolute -inset-2 rounded-full bg-rose-500/20 blur-md pointer-events-none" />
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-2xl bg-gradient-to-br from-rose-950 via-slate-900 to-black border-2 border-rose-500/60 shadow-rose-500/20">
                  {selectedOpponentIdx === 0 ? '👑' : selectedOpponentIdx === 1 ? '⚡' : selectedOpponentIdx === 2 ? '🤖' : '🐉'}
                </div>
              </motion.div>
              <span className="mt-2 text-xs font-mono font-black text-rose-400">
                {currentOpponent.name.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Victory / Defeat Modal Overlay */}
          <AnimatePresence>
            {combatWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40"
              >
                <div className="p-4 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/50 rounded-2xl max-w-md w-full space-y-3 shadow-2xl">
                  <div className="text-4xl">
                    {combatWinner === 'hero' ? '🏆' : '💀'}
                  </div>
                  <h4 className="text-xl font-black font-mono text-slate-100">
                    {combatWinner === 'hero' ? 'VICTORY ACHIEVED!' : 'CHALLENGE REPELLED!'}
                  </h4>
                  <p className="text-xs text-slate-300 font-mono">
                    {combatWinner === 'hero'
                      ? `Your hero deposed the opponent in ${battleTurn} turns with formal proof execution!`
                      : `The opponent defended their claim. Gain consolation experience and refine your invariants!`}
                  </p>

                  {lastReceiptHash && (
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 flex items-center justify-between">
                      <span className="text-slate-500">Receipt:</span>
                      <span className="font-bold">{lastReceiptHash}</span>
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
        </motion.div>

        {/* Live Auto-Battle Log Terminal */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 max-h-48 overflow-y-auto touch-scroll-y">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400">Combat Feed Terminal</span>
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
    </div>
  );
};
