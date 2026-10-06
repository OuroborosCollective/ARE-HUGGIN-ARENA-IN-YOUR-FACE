import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Check, Sparkles, UploadCloud, X, Shield, Swords, Zap, Crown, UserCheck } from 'lucide-react';
import { CharacterModel3DInfo } from './ArenaViewport';
import { AdminModel3DUploaderModal } from './AdminModel3DUploaderModal';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export const DEFAULT_3D_CHIBI_MODELS: CharacterModel3DInfo[] = [
  {
    id: 'chibi_paladin_aegis',
    name: 'Chibi Aegis Paladin',
    characterClass: 'paladin',
    modelUrl: '', // Uses Three.js high-fidelity procedural chibi geometry
    description: 'Golden-armored logic knight equipped with an invariant tower shield and sunburst broadsword. High DEF/HP.',
    scale: 1.0,
    evidenceAffinity: 'ARE-rLOGIC Formal Proofs'
  },
  {
    id: 'chibi_archmage_ast',
    name: 'Chibi AST Archmage',
    characterClass: 'archmage',
    modelUrl: '',
    description: 'Mystic scholar channeling quantum invariant orbs and floating crystalline spell staves. High Magic Burst.',
    scale: 1.0,
    evidenceAffinity: 'Evidence-Bound CSS Layouts'
  },
  {
    id: 'chibi_assassin_shadow',
    name: 'Chibi Shadow Assassin',
    characterClass: 'assassin',
    modelUrl: '',
    description: 'Swift refutation duelist wielding dual high-frequency phase daggers. High Crit Rate & Speed.',
    scale: 1.0,
    evidenceAffinity: 'Topological DAG Constraints'
  },
  {
    id: 'chibi_berserker_davis',
    name: 'Chibi Davis-Putnam Berserker',
    characterClass: 'berserker',
    modelUrl: '',
    description: 'Fierce warrior wielding a double-headed heavy battleaxe that cleaves through empty clauses. Heavy ATK.',
    scale: 1.05,
    evidenceAffinity: 'Davis-Putnam Empty Clause'
  },
  {
    id: 'chibi_sovereign_titan',
    name: 'Chibi Sovereign Archon',
    characterClass: 'logic_knight',
    modelUrl: '',
    description: 'Mythic logic champion crowned with an immutable SHA-256 halo and celestial energy wings. Balanced Power.',
    scale: 1.15,
    evidenceAffinity: 'Sovereign Evidence Observatory'
  }
];

interface Model3DSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (model: CharacterModel3DInfo) => void;
}

export const Model3DSelectorModal: React.FC<Model3DSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  onSelectModel
}) => {
  const { user } = useFirebaseAuth();
  const [allModels, setAllModels] = useState<CharacterModel3DInfo[]>(() => {
    try {
      const saved = localStorage.getItem('are_custom_3d_models_v1');
      const custom: CharacterModel3DInfo[] = saved ? JSON.parse(saved) : [];
      return [...custom, ...DEFAULT_3D_CHIBI_MODELS];
    } catch {
      return DEFAULT_3D_CHIBI_MODELS;
    }
  });

  const [uploaderOpen, setUploaderOpen] = useState(false);

  // Sync models from Firestore /models collection
  useEffect(() => {
    try {
      const modelsCol = collection(db, 'models');
      const unsub = onSnapshot(modelsCol, (snapshot) => {
        const firestoreModels: CharacterModel3DInfo[] = [];
        snapshot.forEach((docSnap) => {
          firestoreModels.push(docSnap.data() as CharacterModel3DInfo);
        });

        if (firestoreModels.length > 0) {
          setAllModels((prev) => {
            const combined = [...firestoreModels, ...DEFAULT_3D_CHIBI_MODELS];
            const unique = combined.filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx);
            return unique;
          });
        }
      }, (err) => {
        // Not fatal if collection empty
        console.warn('Firestore models listener warning:', err);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Failed connecting firestore models:', e);
    }
  }, []);

  if (!isOpen) return null;

  const handleModelUploaded = (newModel: CharacterModel3DInfo) => {
    setAllModels((prev) => [newModel, ...prev.filter((m) => m.id !== newModel.id)]);
    onSelectModel(newModel);
  };

  const getClassIcon = (cClass: string) => {
    switch (cClass) {
      case 'paladin': return '🛡️';
      case 'archmage': return '🔮';
      case 'assassin': return '🗡️';
      case 'berserker': return '🪓';
      default: return '👑';
    }
  };

  return (
    <>
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
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                  <span>3D GLB Chibi Fighter Selection</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                    {allModels.length} Models Available
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select your 3D GLB combatant to enter the 3D automated arena!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setUploaderOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono rounded-xl transition-colors"
                title="Upload custom 3D GLB model"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Admin Upload GLB</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="p-5 overflow-y-auto space-y-3 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allModels.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model);
                      onClose();
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                          {getClassIcon(model.characterClass)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{model.name}</span>
                            {model.modelUrl && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                                GLB
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-amber-400 uppercase font-semibold">
                            {model.characterClass}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shrink-0">
                          ✓
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                      <span>Affinity: {model.evidenceAffinity || 'Universal'}</span>
                      <span className="text-amber-300 font-bold">{model.scale || 1.0}x Scale</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Admin GLB Uploader Modal */}
      <AdminModel3DUploaderModal
        isOpen={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
        onModelUploaded={handleModelUploaded}
      />
    </>
  );
};
