import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  X,
  Box,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Shield,
  Trash2,
  ExternalLink,
  Crown,
  Check,
  RefreshCw,
  Plus,
  Zap
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { CharacterModel3DInfo } from './ArenaViewport';
import { DEFAULT_3D_CHIBI_MODELS } from './Model3DSelectorModal';

interface AdminModel3DUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelUploaded: (model: CharacterModel3DInfo) => void;
}

export const AdminModel3DUploaderModal: React.FC<AdminModel3DUploaderModalProps> = ({
  isOpen,
  onClose,
  onModelUploaded
}) => {
  const { user } = useFirebaseAuth();

  const [activeTab, setActiveTab] = useState<'upload' | 'catalog'>('upload');
  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState<'paladin' | 'archmage' | 'assassin' | 'berserker' | 'logic_knight'>('paladin');
  const [description, setDescription] = useState('');
  const [evidenceAffinity, setEvidenceAffinity] = useState('ARE-rLOGIC Formal Proofs');
  const [scale, setScale] = useState(1.0);
  const [modelUrl, setModelUrl] = useState('');
  const [fileDataUri, setFileDataUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registered Models list from Firestore & Server
  const [registeredModels, setRegisteredModels] = useState<CharacterModel3DInfo[]>(() => {
    try {
      const saved = localStorage.getItem('are_custom_3d_models_v1');
      return saved ? JSON.parse(saved) : DEFAULT_3D_CHIBI_MODELS;
    } catch {
      return DEFAULT_3D_CHIBI_MODELS;
    }
  });

  // Load from server and Firestore
  useEffect(() => {
    if (!isOpen) return;

    // 1. Fetch from server
    fetch('/api/arena/models-3d')
      .then((res) => res.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models)) {
          setRegisteredModels(data.models);
        }
      })
      .catch(console.warn);

    // 2. Fetch from Firestore /models collection
    if (user) {
      const path = 'models';
      const colRef = collection(db, 'models');
      try {
        const unsub = onSnapshot(
          colRef,
          (snapshot) => {
            const firestoreModels: CharacterModel3DInfo[] = [];
            snapshot.forEach((docSnap) => {
              firestoreModels.push(docSnap.data() as CharacterModel3DInfo);
            });
            if (firestoreModels.length > 0) {
              setRegisteredModels((prev) => {
                const combined = [...firestoreModels, ...prev.filter((p) => !firestoreModels.some((f) => f.id === p.id))];
                return combined;
              });
            }
          },
          (err) => {
            console.warn('Firestore models listener note:', err);
          }
        );
        return () => unsub();
      } catch (err) {
        console.warn('Firestore models listener error:', err);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
      setErrorMsg('Please select a valid .glb or .gltf 3D model file.');
      return;
    }

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileDataUri(result);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read 3D model file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Model name is required.');
      return;
    }

    const finalUrl = fileDataUri || modelUrl.trim();
    if (!finalUrl) {
      setErrorMsg('Please upload a .glb file or provide a valid GLB URL.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const modelId = `model_3d_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const newModel: CharacterModel3DInfo = {
      id: modelId,
      name: name.trim(),
      characterClass,
      description: description.trim() || `3D Chibi Fighter model for ${characterClass}`,
      evidenceAffinity: evidenceAffinity.trim(),
      modelUrl: finalUrl,
      scale: Number(scale) || 1.0
    };

    try {
      // 1. Post to Server API
      await fetch('/api/arena/models-3d/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newModel.name,
          characterClass: newModel.characterClass,
          modelUrl: newModel.modelUrl.length < 500000 ? newModel.modelUrl : '/models/custom_uploaded.glb',
          description: newModel.description,
          scale: newModel.scale,
          evidenceAffinity: newModel.evidenceAffinity,
          uploadedBy: user?.email || 'admin'
        })
      }).catch(console.warn);

      // 2. Save to local storage registry
      const localKey = 'are_custom_3d_models_v1';
      const existingRaw = localStorage.getItem(localKey);
      const existing: CharacterModel3DInfo[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedList = [newModel, ...existing.filter((m) => m.id !== newModel.id)];
      localStorage.setItem(localKey, JSON.stringify(updatedList));
      setRegisteredModels(updatedList);

      // 3. Save to Firestore /models collection
      if (user) {
        const modelRef = doc(db, 'models', modelId);
        await setDoc(modelRef, {
          id: modelId,
          name: newModel.name,
          characterClass: newModel.characterClass,
          description: newModel.description,
          evidenceAffinity: newModel.evidenceAffinity,
          modelUrl: newModel.modelUrl.length < 500000 ? newModel.modelUrl : 'data:model/glb;stored_locally',
          scale: newModel.scale,
          author: user.email || 'Admin',
          uploadedBy: user.uid,
          isOfficial: user.email === 'projectouroboroscollective@gmail.com',
          createdAt: new Date().toISOString()
        });
      }

      setSuccessMsg(`Model "${newModel.name}" successfully registered and ready for combat!`);
      onModelUploaded(newModel);

      // Reset form
      setName('');
      setDescription('');
      setModelUrl('');
      setFileDataUri(null);
      setFileName(null);
      setActiveTab('catalog');
    } catch (err: any) {
      console.warn('Failed saving 3D model to Firestore:', err);
      setSuccessMsg(`Model "${newModel.name}" registered locally.`);
      onModelUploaded(newModel);
      setActiveTab('catalog');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      await fetch(`/api/arena/models-3d/${id}`, { method: 'DELETE' }).catch(console.warn);

      if (user) {
        await deleteDoc(doc(db, 'models', id)).catch(console.warn);
      }

      const updated = registeredModels.filter((m) => m.id !== id);
      setRegisteredModels(updated);
      localStorage.setItem('are_custom_3d_models_v1', JSON.stringify(updated));
    } catch (err) {
      console.warn('Delete model error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-400 border border-amber-500/30 rounded-xl shadow-md">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  Admin 3D GLB Studio &amp; Model Manager
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                  Admin Access
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload and manage custom 3D chibi fighter GLB models for live Three.js battles.
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

        {/* Modal Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New GLB Model</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage Catalog ({registeredModels.length})</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD FORM */}
        {activeTab === 'upload' && (
          <form onSubmit={handleSaveModel} className="p-5 space-y-4 font-mono text-xs overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Model Name */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>Model / Fighter Name</span>
                <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chibi Invariant Paladin Alpha"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            {/* Character Class */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Character Class Affinity</label>
              <select
                value={characterClass}
                onChange={(e: any) => setCharacterClass(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="paladin">Paladin (High Defense &amp; AST Invariant Shield)</option>
                <option value="archmage">Archmage (High Energy &amp; Davis-Putnam Spells)</option>
                <option value="assassin">Assassin (High Crit Rate &amp; Cycle Strikes)</option>
                <option value="berserker">Berserker (High ATK &amp; Clause Contradictions)</option>
                <option value="logic_knight">Logic Knight (Balanced All-Around Mastery)</option>
              </select>
            </div>

            {/* 3D GLB File Upload Box */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Upload 3D Binary File (.glb / .gltf)</label>
              <div className="p-4 bg-slate-950 border-2 border-dashed border-slate-800 hover:border-amber-500/40 rounded-xl text-center cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <UploadCloud className="w-7 h-7 text-amber-400" />
                  <p className="text-slate-200 font-bold">
                    {fileName ? fileName : 'Click to browse or drop .glb model file'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Supports GLB standard with embedded PBR textures &amp; skeletal meshes
                  </p>
                </div>
              </div>
            </div>

            {/* Or External GLB URL */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Or External GLB URL (Hugging Face / CDN)</label>
              <input
                type="url"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://huggingface.co/.../resolve/main/model.glb"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Scale Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">Scale Multiplier: {scale}x</label>
                <span className="text-[10px] text-slate-500">Normal is 1.0x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Lore & Evidence Affinity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Evidence Affinity</label>
                <input
                  type="text"
                  value={evidenceAffinity}
                  onChange={(e) => setEvidenceAffinity(e.target.value)}
                  placeholder="e.g. ARE-rLOGIC Formal Proofs"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Description / Lore</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Guardian forged from immutable AST trees"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 min-h-[40px]"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registering Model...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload &amp; Activate Model</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CATALOG MANAGEMENT */}
        {activeTab === 'catalog' && (
          <div className="p-5 space-y-4 font-mono text-xs overflow-y-auto flex-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
              <span>Registered 3D Models in Arena Catalog ({registeredModels.length})</span>
              <span>Active in Three.js Viewport</span>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {registeredModels.map((model) => (
                <div
                  key={model.id}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 text-base shrink-0">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{model.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {model.characterClass}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{model.description}</p>
                      <span className="text-[10px] text-slate-500">
                        Affinity: {model.evidenceAffinity || 'General'} · Scale: {model.scale || 1.0}x
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onModelUploaded(model);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      Select
                    </button>
                    {!DEFAULT_3D_CHIBI_MODELS.some((d) => d.id === model.id) && (
                      <button
                        onClick={() => handleDeleteModel(model.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove model"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
