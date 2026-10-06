import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  Sparkles,
  Swords,
  Shield,
  Zap,
  Crown,
  UploadCloud,
  RefreshCw,
  Award,
  Flame,
  Check,
  Copy,
  Sliders,
  Package,
  Layers,
  Wand2,
  ExternalLink
} from 'lucide-react';

export interface LootItem {
  id: string;
  name: string;
  type: 'weapon' | 'shield' | 'relic' | 'scroll';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  statBonusText: string;
  atkBonus: number;
  defBonus: number;
  critBonus: number;
  icon: string;
  description: string;
  equipped?: boolean;
}

const DEFAULT_LOOT_ITEMS: LootItem[] = [
  {
    id: 'item_titan_blade',
    name: 'Empty-Clause Titan Blade',
    type: 'weapon',
    rarity: 'mythic',
    statBonusText: '+25 ATK, +10% Crit',
    atkBonus: 25,
    defBonus: 0,
    critBonus: 10,
    icon: '⚔️',
    description: 'A legendary sword forged in pure resolution refutation. Slices through invalid invariant assertions.',
    equipped: true
  },
  {
    id: 'item_merkle_shield',
    name: 'Merkle Root SHA-256 Aegis',
    type: 'shield',
    rarity: 'legendary',
    statBonusText: '+20 DEF, +5% Damage Reduction',
    atkBonus: 0,
    defBonus: 20,
    critBonus: 0,
    icon: '🛡️',
    description: 'An impenetrable cryptographic barrier anchored directly to immutable evidence blocks.',
    equipped: true
  },
  {
    id: 'item_davis_amulet',
    name: 'Davis-Putnam Focus Amulet',
    type: 'relic',
    rarity: 'epic',
    statBonusText: '+15 ATK, +15 DEF',
    atkBonus: 15,
    defBonus: 15,
    critBonus: 5,
    icon: '🔮',
    description: 'Amplifies clause derivation speed, increasing critical hit chance during logic duels.',
    equipped: false
  }
];

interface ModelIdentityProps {
  modelId?: string;
  modelName?: string;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const ModelIdentity: React.FC<ModelIdentityProps> = ({
  modelId = 'ouroboros/ARE-rLOGIC-70b',
  modelName = 'ARE-rLOGIC-70b',
  onExportToHf
}) => {
  const [selectedSkill, setSelectedSkill] = useState('Empty-Clause Contradiction Titan');
  const [avatarStyle, setAvatarStyle] = useState<'raid_rpg_hero' | 'cyberpunk_pixel' | 'futuristic_mecha' | 'mystic_archmage'>('raid_rpg_hero');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem('are_model_identity_avatar_url') || null;
  });
  const [generationMeta, setGenerationMeta] = useState<any | null>(null);
  const [copiedBadge, setCopiedBadge] = useState(false);

  // Loot Inventory
  const [inventory, setInventory] = useState<LootItem[]>(() => {
    try {
      const saved = localStorage.getItem('are_rpg_loot_inventory_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading inventory:', e);
    }
    return DEFAULT_LOOT_ITEMS;
  });

  const saveInventory = (updated: LootItem[]) => {
    setInventory(updated);
    try {
      localStorage.setItem('are_rpg_loot_inventory_v1', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed saving inventory:', e);
    }
  };

  const handleToggleEquip = (itemId: string) => {
    const updated = inventory.map(item => {
      if (item.id === itemId) {
        return { ...item, equipped: !item.equipped };
      }
      return item;
    });
    saveInventory(updated);
  };

  // Generate Avatar with Imagen Tool
  const handleGenerateAvatar = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/arena/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          model_name: modelName,
          primary_skill: selectedSkill,
          avatar_style: avatarStyle,
          custom_prompt: customPrompt
        })
      });

      const data = await res.json();
      if (data.image_url) {
        setAvatarUrl(data.image_url);
        setGenerationMeta(data);
        localStorage.setItem('are_model_identity_avatar_url', data.image_url);
      } else {
        alert('Failed to generate avatar image.');
      }
    } catch (err: any) {
      alert('Avatar generation error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Compute Equipped Loot Bonuses
  const equippedItems = inventory.filter(i => i.equipped);
  const totalAtkBonus = equippedItems.reduce((acc, i) => acc + i.atkBonus, 0);
  const totalDefBonus = equippedItems.reduce((acc, i) => acc + i.defBonus, 0);
  const totalCritBonus = equippedItems.reduce((acc, i) => acc + i.critBonus, 0);

  const getRarityBadge = (rarity: LootItem['rarity']) => {
    switch (rarity) {
      case 'mythic': return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      case 'legendary': return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'epic': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'rare': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 text-amber-400 rounded-2xl shadow-lg shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                Model Identity &amp; Imagen Avatar Studio
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                Imagen 3 AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate unique model avatar artwork based on your model's highest-used logic skills, style choices, and equipped loot drops.
            </p>
          </div>
        </div>

        {onExportToHf && (
          <button
            onClick={() => onExportToHf(
              'arena_match',
              `Model Identity Passport & Avatar: ${modelName}`,
              {
                model_id: modelId,
                model_name: modelName,
                primary_skill: selectedSkill,
                avatar_style: avatarStyle,
                avatar_url: avatarUrl,
                equipped_loot: equippedItems,
                stat_bonuses: {
                  atk: totalAtkBonus,
                  def: totalDefBonus,
                  crit: totalCritBonus
                }
              },
              'ouroboroscollective/evidence-bound-css'
            )}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md min-h-[40px] self-start lg:self-auto"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Export Identity to HF</span>
          </button>
        )}
      </div>

      {/* Main Grid: Avatar Generator & Equipment Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar Preview & Imagen Generator Controls */}
        <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-amber-400" />
              Imagen Model Avatar Canvas
            </h4>
            {generationMeta && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {generationMeta.method_used}
              </span>
            )}
          </div>

          {/* Avatar Image Frame */}
          <div className="relative w-full aspect-square bg-slate-900 rounded-2xl border-2 border-slate-800 flex flex-col items-center justify-center overflow-hidden group shadow-2xl">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${modelName} Model Avatar`}
                className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-20 h-20 mx-auto rounded-full bg-slate-950 border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-400 text-3xl shadow-inner">
                  🧙‍♂️
                </div>
                <p className="text-xs font-mono text-slate-400 max-w-xs">
                  No avatar generated yet. Select a logic skill set and style below to synthesize your model avatar image!
                </p>
              </div>
            )}

            {/* Glowing Aura Ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-amber-500/30 pointer-events-none group-hover:border-amber-400/70 transition-colors" />
          </div>

          {/* Generator Controls */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Logic Attack Skill Set Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 block">Primary Logic Skill Set:</label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="Empty-Clause Contradiction Titan">Empty-Clause Contradiction Titan</option>
                  <option value="Davis-Putnam Resolution">Davis-Putnam Resolution</option>
                  <option value="AST Invariant Shatter">AST Invariant Shatter</option>
                  <option value="Merkle Proof Fortress">Merkle Proof Fortress</option>
                  <option value="SAT Invariant Disruption">SAT Invariant Disruption</option>
                </select>
              </div>

              {/* Avatar Art Style Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 block">Avatar Art Style:</label>
                <select
                  value={avatarStyle}
                  onChange={(e) => setAvatarStyle(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="raid_rpg_hero">Raid RPG Hero Portrait</option>
                  <option value="cyberpunk_pixel">Cyberpunk 16-Bit Pixel</option>
                  <option value="futuristic_mecha">Futuristic Mecha Visor</option>
                  <option value="mystic_archmage">Mystic Cosmic Archmage</option>
                </select>
              </div>
            </div>

            {/* Optional Custom Prompt */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 block">Custom Prompt Modifier (Optional):</label>
              <input
                type="text"
                placeholder="e.g., golden dragon wings, obsidian runic armor, glowing cyan eyes..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerateAvatar}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-xs font-mono rounded-xl shadow-lg shadow-amber-500/10 transition-all min-h-[44px] disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing Imagen Avatar...' : 'Generate Avatar with Imagen 3'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Equipped RPG Loot Drops & Stats Overview */}
        <div className="lg:col-span-6 space-y-4">
          {/* Active Model Stats Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center justify-between">
              <span>Model Attribute Totals</span>
              <span className="text-amber-400">{modelName}</span>
            </h4>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-rose-500/30">
                <span className="text-slate-400 text-[10px] block">Total ATK</span>
                <span className="text-rose-400 font-black text-base">+{totalAtkBonus}</span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-indigo-500/30">
                <span className="text-slate-400 text-[10px] block">Total DEF</span>
                <span className="text-indigo-400 font-black text-base">+{totalDefBonus}</span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-amber-500/30">
                <span className="text-slate-400 text-[10px] block">Critical Rate</span>
                <span className="text-amber-300 font-black text-base">+{totalCritBonus}%</span>
              </div>
            </div>
          </div>

          {/* Loot Inventory List */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold font-mono text-slate-200 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-400" />
                <span>RPG Loot Drops Inventory ({inventory.length})</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {equippedItems.length} Equipped
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {inventory.map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    item.equipped
                      ? 'bg-slate-900 border-amber-500/60 shadow-md shadow-amber-500/5'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl p-2 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 font-mono">
                          {item.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border uppercase ${getRarityBadge(item.rarity)}`}>
                          {item.rarity}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-300 font-mono mt-0.5">
                        {item.statBonusText}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEquip(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 min-h-[36px] ${
                      item.equipped
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {item.equipped ? 'Equipped ✓' : 'Equip Item'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
