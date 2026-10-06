import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  LogOut,
  LogIn,
  Database,
  FolderGit2,
  Plus,
  Trash2,
  UploadCloud,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  FileCode,
  Tag,
  BookOpen,
  X,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import { useFirebaseAuth, SavedDatasetRecord, ConnectedHfProject } from '../context/FirebaseAuthContext';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  onExportToHf
}) => {
  const {
    user,
    loading,
    signInWithGoogle,
    logout,
    savedDatasets,
    connectedProjects,
    saveDataset,
    deleteSavedDataset,
    connectHfProject,
    disconnectHfProject
  } = useFirebaseAuth();

  const [activeTab, setActiveTab] = useState<'datasets' | 'projects' | 'new_project'>('datasets');

  // New Project Form State
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoType, setNewRepoType] = useState<'dataset' | 'model' | 'space'>('dataset');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newDefaultFormat, setNewDefaultFormat] = useState('chatml');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  // Export State
  const [exportingDatasetId, setExportingDatasetId] = useState<string | null>(null);
  const [selectedTargetProject, setSelectedTargetProject] = useState<string>('');

  if (!isOpen) return null;

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) {
      alert('Please enter a valid repository name (e.g. username/dataset-name)');
      return;
    }

    setIsSubmittingProject(true);
    try {
      await connectHfProject({
        repoName: newRepoName.trim(),
        repoType: newRepoType,
        description: newRepoDesc.trim(),
        defaultFormat: newDefaultFormat,
        isDefaultTarget: isDefault || connectedProjects.length === 0
      });
      setNewRepoName('');
      setNewRepoDesc('');
      setActiveTab('projects');
    } catch (err: any) {
      alert(`Error connecting project: ${err.message}`);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleExportSavedDataset = (ds: SavedDatasetRecord) => {
    const targetRepo = selectedTargetProject || ds.targetProject || connectedProjects.find(p => p.isDefaultTarget)?.repoName || 'ouroboroscollective/evidence-bound-css';
    if (onExportToHf) {
      let payload: any = ds;
      try {
        if (ds.learningData) {
          payload = JSON.parse(ds.learningData);
        }
      } catch (e) {
        // Keep as raw object
      }
      onExportToHf('export_dataset', `Export ${ds.name} to ${targetRepo}`, payload, targetRepo);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-12 h-12 rounded-full border-2 border-amber-500 shadow-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{user ? user.displayName || 'Authenticated User' : 'Guest Account'}</span>
                  {user && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                      Firebase Connected
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {user ? user.email : 'Sign in with Google to sync datasets and connect Hugging Face projects.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl border border-slate-700 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs font-mono rounded-xl shadow-md transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          {user && (
            <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('datasets')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'datasets'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Saved Datasets ({savedDatasets.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'projects'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Connected HF Projects ({connectedProjects.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('new_project')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'new_project'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Connect New HF Project</span>
              </button>
            </div>
          )}

          {/* Tab 1: Saved Datasets */}
          {user && activeTab === 'datasets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>My Saved Datasets &amp; Learning Data</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Datasets persisted to Firebase Firestore. Export any dataset to a chooseable Hugging Face project repository.
                  </p>
                </div>
              </div>

              {savedDatasets.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <Database className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">
                    No datasets saved yet. Use the "Save to My Datasets" action in the Hub Explorer, Dataset Visualizer, or Optimizer to save your datasets here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedDatasets.map(ds => (
                    <div
                      key={ds.id}
                      className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm font-bold text-slate-100 font-mono">
                            {ds.name}
                          </h5>
                          {ds.format && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase">
                              {ds.format}
                            </span>
                          )}
                          {ds.sampleCount !== undefined && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {ds.sampleCount} rows
                            </span>
                          )}
                        </div>
                        {ds.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {ds.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-1">
                          <span>Target: <strong className="text-slate-300">{ds.targetProject || 'Default HF Project'}</strong></span>
                          <span>·</span>
                          <span>Saved: {new Date(ds.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {/* Chooseable Project Selector */}
                        {connectedProjects.length > 0 && (
                          <select
                            defaultValue={ds.targetProject || connectedProjects[0].repoName}
                            onChange={(e) => setSelectedTargetProject(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300 px-2 py-1.5 rounded-lg focus:outline-none"
                          >
                            {connectedProjects.map(p => (
                              <option key={p.id} value={p.repoName}>
                                📦 {p.repoName}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          onClick={() => handleExportSavedDataset(ds)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono rounded-xl transition-colors min-h-[36px]"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Export to Project</span>
                        </button>

                        <button
                          onClick={() => deleteSavedDataset(ds.id)}
                          className="p-2 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition-colors"
                          title="Delete Dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Connected HF Projects */}
          {user && activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-amber-400" />
                    <span>Connected Hugging Face Projects ({connectedProjects.length})</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Target repositories linked to your account for streaming, fine-tuning and export.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('new_project')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Project</span>
                </button>
              </div>

              {connectedProjects.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">
                    No Hugging Face projects connected yet. Connect any repository to export your datasets and learning data!
                  </p>
                  <button
                    onClick={() => setActiveTab('new_project')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono rounded-xl transition-colors"
                  >
                    Connect Your First Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {connectedProjects.map(proj => (
                    <div
                      key={proj.id}
                      className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-100 font-mono truncate" title={proj.repoName}>
                            {proj.repoName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-900 border border-slate-800 text-amber-400">
                            {proj.repoType || 'dataset'}
                          </span>
                        </div>
                        {proj.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                        <span>Format: {proj.defaultFormat || 'chatml'}</span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://huggingface.co/datasets/${proj.repoName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:text-amber-400"
                            title="Open on Hugging Face"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => disconnectHfProject(proj.id)}
                            className="p-1 hover:text-rose-400"
                            title="Disconnect Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Connect New Project Form */}
          {user && activeTab === 'new_project' && (
            <form onSubmit={handleAddProject} className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Connect Any Hugging Face Project Repository</span>
              </h4>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 block">
                    Repository Name (HF identifier):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. username/my-dataset or org/dataset-repo"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 font-mono">
                    Any existing or planned Hugging Face repo where learning data and datasets will be exported.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-300 block">Repository Type:</label>
                    <select
                      value={newRepoType}
                      onChange={(e) => setNewRepoType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="dataset">Dataset Repository</option>
                      <option value="model">Model Repository</option>
                      <option value="space">Space Repository</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-300 block">Default Schema Format:</label>
                    <select
                      value={newDefaultFormat}
                      onChange={(e) => setNewDefaultFormat(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="chatml">ChatML (Messages Array)</option>
                      <option value="alpaca">Alpaca (Instruction / Output)</option>
                      <option value="llama3">Llama-3 Header Format</option>
                      <option value="dpo">DPO Preference Pairs</option>
                      <option value="sharegpt">ShareGPT Conversations</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 block">Description / Notes (Optional):</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary dataset repository for fine-tuning our reasoning model"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isDefaultCheckbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="accent-amber-500 rounded cursor-pointer"
                  />
                  <label htmlFor="isDefaultCheckbox" className="text-xs font-mono text-slate-400 cursor-pointer">
                    Set as default export destination for datasets and learning data
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs rounded-xl border border-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-mono text-xs rounded-xl shadow-md transition-colors"
                >
                  {isSubmittingProject ? 'Connecting...' : 'Connect Project Repository'}
                </button>
              </div>
            </form>
          )}

          {!user && (
            <div className="text-center py-10 px-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <User className="w-12 h-12 text-amber-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-100 font-mono">
                  Create Account or Sign In
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Connect your Google account with Firebase to securely save datasets on the cloud, link any Hugging Face project, and export fine-tuning data seamlessly.
                </p>
              </div>
              <button
                onClick={signInWithGoogle}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs font-mono rounded-xl shadow-lg transition-all"
              >
                Sign In with Google
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
