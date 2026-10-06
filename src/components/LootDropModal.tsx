import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Package, Shield, Swords, Check, Trophy, X } from 'lucide-react';
import { LootItem } from './ModelIdentity';

interface LootDropModalProps {
  isOpen: boolean;
  droppedItems: LootItem[];
  onClose: () => void;
  onEquipItem?: (item: LootItem) => void;
}

export const LootDropModal: React.FC<LootDropModalProps> = ({
  isOpen,
  droppedItems,
  onClose,
  onEquipItem
}) => {
  if (!isOpen || droppedItems.length === 0) return null;

  const getRarityGlow = (rarity: LootItem['rarity']) => {
    switch (rarity) {
      case 'mythic': return 'from-rose-500 via-amber-500 to-rose-600 border-rose-500 shadow-rose-500/40';
      case 'legendary': return 'from-amber-400 to-amber-600 border-amber-400 shadow-amber-500/40';
      case 'epic': return 'from-purple-500 to-indigo-600 border-purple-400 shadow-purple-500/30';
      case 'rare': return 'from-cyan-400 to-blue-600 border-cyan-400 shadow-cyan-500/30';
      default: return 'from-slate-700 to-slate-900 border-slate-700 shadow-slate-900/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center overflow-hidden"
        >
          {/* Top Sparks & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>VICTORY REWARD DROPS</span>
            </div>
            <h3 className="text-xl font-black font-mono text-slate-100">
              ⚡ Random RPG Loot Acquired!
            </h3>
            <p className="text-xs text-slate-400">
              New logic relics and equipment dropped from your victorious tournament match.
            </p>
          </div>

          {/* Dropped Items Grid */}
          <div className="space-y-3">
            {droppedItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ scale: 0.8, opacity: 0, x: -10 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15 }}
                className={`p-4 rounded-2xl border-2 bg-gradient-to-r ${getRarityGlow(
                  item.rarity
                )} shadow-xl text-left flex items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl p-2.5 bg-slate-950/80 rounded-xl border border-white/10 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black font-mono text-slate-950">
                        {item.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black bg-slate-950 text-amber-300 uppercase border border-amber-400/40">
                        {item.rarity}
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-950/90 mt-0.5">
                      {item.statBonusText}
                    </p>
                  </div>
                </div>

                {onEquipItem && (
                  <button
                    onClick={() => onEquipItem(item)}
                    className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-amber-300 font-mono font-bold text-xs rounded-xl border border-amber-400/50 transition-colors shrink-0 shadow-md min-h-[38px]"
                  >
                    Equip Now
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Close Action */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-mono text-xs rounded-xl shadow-lg transition-colors min-h-[44px]"
          >
            Claim All Drops &amp; Continue
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
