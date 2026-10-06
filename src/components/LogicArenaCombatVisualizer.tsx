import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Sparkles, Crown, Award, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import { MatchReceipt } from './LogicArena';

interface LogicArenaCombatVisualizerProps {
  attackerModel: string;
  defenderModel: string;
  attackType: string;
  targetClaim: string;
  customPayload: string;
  isEvaluating: boolean;
  matchResult: MatchReceipt | null;
  attackerElo?: number;
  defenderElo?: number;
  attackerRecord?: string;
  defenderRecord?: string;
}

export const LogicArenaCombatVisualizer: React.FC<LogicArenaCombatVisualizerProps> = ({
  attackerModel,
  defenderModel,
  attackType,
  targetClaim,
  customPayload,
  isEvaluating,
  matchResult,
  attackerElo = 2100,
  defenderElo = 2050,
  attackerRecord = '12W - 2L',
  defenderRecord = '10W - 4L'
}) => {
  // Compute dynamic scaling based on Elo & Win efficiency (similar to Raid Shadow Legends / Auto-Battlers)
  const getModelScale = (elo: number) => {
    if (elo >= 2150) return 1.45; // Titan Sovereign
    if (elo >= 2100) return 1.30; // Grand Champion
    if (elo >= 2000) return 1.15; // Master Challenger
    return 1.0; // Standard Logic Combatant
  };

  const attackerScale = getModelScale(attackerElo);
  const defenderScale = getModelScale(defenderElo);

  // Model class icon helper
  const getModelIcon = (modelId: string) => {
    if (modelId.includes('rLOGIC') || modelId.includes('70b')) return '👑';
    if (modelId.includes('gemini')) return '⚡';
    if (modelId.includes('DeepSeek')) return '🤖';
    if (modelId.includes('Llama')) return '🐉';
    if (modelId.includes('Qwen')) return '🔮';
    return '⚔️';
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Background Ambient Glows */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg">
            <Swords className="w-4 h-4" />
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-mono">
            Active RPG Combat Sequence — Logic Duel
          </h4>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-amber-300 font-bold">
            {attackType.replace('_', ' ').toUpperCase()}
          </span>
          {isEvaluating && (
            <span className="flex items-center gap-1 text-emerald-400 font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COMBAT ENGAGED</span>
            </span>
          )}
        </div>
      </div>

      {/* Main 2D Animated Duel Viewport */}
      <div className="relative w-full h-64 sm:h-72 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between overflow-hidden select-none">
        {/* Top Battle HUD */}
        <div className="grid grid-cols-2 gap-6 z-20 font-mono text-xs">
          {/* Attacker HUD */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 truncate">{attackerModel.split('/')[1] || attackerModel}</span>
              <span className="text-[10px] text-slate-400">{attackerElo} ELO ({attackerRecord})</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                animate={{ width: isEvaluating ? ['100%', '85%', '100%'] : matchResult?.outcome === 'ATTACK_SUCCESSFUL' ? '100%' : '75%' }}
                transition={{ duration: 1.2, repeat: isEvaluating ? Infinity : 0 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Avatar Scale: {attackerScale}x</span>
              <span className="text-amber-400 font-semibold">ATTACKER</span>
            </div>
          </div>

          {/* Defender HUD */}
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{defenderElo} ELO ({defenderRecord})</span>
              <span className="font-bold text-indigo-300 truncate">{defenderModel.split('/')[1] || defenderModel}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full ml-auto"
                animate={{ width: isEvaluating ? ['100%', '70%', '100%'] : matchResult?.outcome === 'DEFENSE_HELD_VALID' ? '100%' : '40%' }}
                transition={{ duration: 1.2, repeat: isEvaluating ? Infinity : 0 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className="text-indigo-400 font-semibold">DEFENDER</span>
              <span>Avatar Scale: {defenderScale}x</span>
            </div>
          </div>
        </div>

        {/* Flying Combat Projectiles Layer */}
        <AnimatePresence>
          {isEvaluating && (
            <motion.div
              initial={{ x: '25%', y: '50%', opacity: 0, scale: 0.5 }}
              animate={{ x: '75%', y: '50%', opacity: 1, scale: 1.8, rotate: [0, 180, 360] }}
              exit={{ opacity: 0, scale: 2.2 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
              className="absolute text-3xl pointer-events-none z-30 drop-shadow-2xl"
            >
              ⚡⚔️
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Combatant Sprites */}
        <div className="relative flex items-center justify-between px-6 sm:px-14 my-auto z-10">
          {/* Attacker Sprite with Dynamic Scaling */}
          <div className="flex flex-col items-center">
            <motion.div
              animate={
                isEvaluating
                  ? { x: [0, 50, 0], scale: [attackerScale, attackerScale * 1.2, attackerScale], rotate: [0, 10, 0] }
                  : matchResult?.outcome === 'ATTACK_SUCCESSFUL'
                  ? { scale: [attackerScale, attackerScale * 1.25, attackerScale], y: [0, -8, 0] }
                  : { scale: attackerScale, y: [0, -3, 0] }
              }
              transition={
                isEvaluating
                  ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                  : { duration: 0.5 }
              }
              className="relative cursor-pointer"
            >
              {/* Radial Aura Glow */}
              <div className="absolute -inset-2 rounded-full bg-amber-500/30 blur-md pointer-events-none animate-pulse" />

              {/* Attacker Sprite Box */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-2xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-black border-2 border-amber-500/60 shadow-amber-500/20">
                {getModelIcon(attackerModel)}
              </div>
            </motion.div>
            <span className="mt-2 text-xs font-mono font-bold text-amber-300">
              {attackerModel.split('/')[1] || attackerModel}
            </span>
          </div>

          {/* VS Battle Icon / AST Verdict Indicator */}
          <div className="text-center font-mono">
            <motion.div
              animate={isEvaluating ? { scale: [1, 1.2, 1], rotate: [0, 180, 360] } : {}}
              transition={{ repeat: isEvaluating ? Infinity : 0, duration: 1.5 }}
              className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-amber-400 shadow-inner"
            >
              VS
            </motion.div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {isEvaluating ? 'Simulating AST' : matchResult ? 'Verdict Ready' : 'Ready'}
            </span>
          </div>

          {/* Defender Sprite with Dynamic Scaling */}
          <div className="flex flex-col items-center">
            <motion.div
              animate={
                isEvaluating
                  ? { x: [0, -30, 0], scale: [defenderScale, defenderScale * 1.1, defenderScale], rotate: [0, -10, 0] }
                  : matchResult?.outcome === 'DEFENSE_HELD_VALID'
                  ? { scale: [defenderScale, defenderScale * 1.25, defenderScale], y: [0, -8, 0] }
                  : { scale: defenderScale, y: [0, -3, 0] }
              }
              transition={
                isEvaluating
                  ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                  : { duration: 0.5 }
              }
              className="relative"
            >
              {/* Radial Aura Glow */}
              <div className="absolute -inset-2 rounded-full bg-indigo-500/30 blur-md pointer-events-none animate-pulse" />

              {/* Defender Sprite Box */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-black border-2 border-indigo-500/60 shadow-indigo-500/20">
                {getModelIcon(defenderModel)}
              </div>
            </motion.div>
            <span className="mt-2 text-xs font-mono font-bold text-indigo-300">
              {defenderModel.split('/')[1] || defenderModel}
            </span>
          </div>
        </div>

        {/* Live Attack Claim Caption */}
        <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-amber-400 font-bold">Target Invariant:</span>
            <span className="truncate text-slate-400">{targetClaim}</span>
          </div>
          {matchResult && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
              +{matchResult.points_awarded} XP Points
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
