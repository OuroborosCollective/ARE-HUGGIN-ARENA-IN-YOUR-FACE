import React, { useState, useEffect } from 'react';
import { Search, Database, Download, Heart, Eye, Sparkles, Filter, Code2, Layers, ChevronRight, Check, BarChart3, UploadCloud, ExternalLink, ShieldCheck, Swords, Trophy, Crown, UserCheck, X, AlertCircle, RefreshCw, Hash, Play, BookmarkPlus } from 'lucide-react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';

interface Dataset {
  id: string;
  name: string;
  author: string;
  task: string;
  modality: string;
  description: string;
  downloads: string;
  likes: number;
  tags: string[];
  size: string;
  num_rows: number;
  license: string;
  features: { name: string; type: string }[];
  sample_rows: any[];
}

interface CombatThroneInfo {
  dataset_id: string;
  dataset_name: string;
  author: string;
  owner_hf_account: string;
  current_champion_model: string;
  champion_org: string;
  champion_score: number;
  evidence_revision_points: number;
  undefeated_streak: number;
  last_receipt_hash: string;
  last_deposed_at: string;
  combat_status: string;
  top_target_claim?: string;
}

interface HubExplorerProps {
  onSelectForPipeline: (datasetId: string) => void;
  onSelectForVisualizer: (datasetId: string) => void;
  onOpenScriptExport: (datasetId: string) => void;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
  onNavigateToArena?: () => void;
}

export const HubExplorer: React.FC<HubExplorerProps> = ({
  onSelectForPipeline,
  onSelectForVisualizer,
  onOpenScriptExport,
  onExportToHf,
  onNavigateToArena
}) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState('all');
  const [selectedModality, setSelectedModality] = useState('all');
  const [selectedLicense, setSelectedLicense] = useState('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'schema' | 'raw'>('preview');

  // Firebase integration
  const { user, saveDataset, connectedProjects } = useFirebaseAuth();
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [isSavingDataset, setIsSavingDataset] = useState(false);

  const handleSaveActiveToAccount = async (ds: Dataset) => {
    if (!user) {
      alert('Please click Account in the top navigation bar to sign in.');
      return;
    }
    setIsSavingDataset(true);
    try {
      const defaultTarget = connectedProjects.find(p => p.isDefaultTarget)?.repoName || '';
      await saveDataset({
        datasetId: ds.id,
        name: ds.name || ds.id,
        description: ds.description || `${ds.task} dataset with ${ds.num_rows} rows`,
        targetProject: defaultTarget,
        format: 'parquet',
        sampleCount: ds.sample_rows?.length || ds.num_rows,
        tags: ds.tags || [],
        learningData: JSON.stringify(ds.sample_rows || [])
      });
      setSavedSuccessId(ds.id);
      setTimeout(() => setSavedSuccessId(null), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSavingDataset(false);
    }
  };

  // Linked HF Account State
  const [linkedHfAccount, setLinkedHfAccount] = useState<string>(() => {
    return localStorage.getItem('are_hf_account') || 'ouroboroscollective';
  });
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);
  const [inputHfAccount, setInputHfAccount] = useState(linkedHfAccount);

  // Thrones State
  const [thrones, setThrones] = useState<Record<string, CombatThroneInfo>>({});

  // Challenge Modal State
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [selectedChallengeDataset, setSelectedChallengeDataset] = useState<Dataset | null>(null);
  const [challengerModel, setChallengerModel] = useState('gemini-3.8-flash');
  const [challengeAttackType, setChallengeAttackType] = useState('resolution_refutation');
  const [challengeClaim, setChallengeClaim] = useState('');
  const [challengePayload, setChallengePayload] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeResult, setChallengeResult] = useState<any | null>(null);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        q: searchQuery,
        task: selectedTask,
        modality: selectedModality,
      });
      const res = await fetch(`/api/datasets/search?${queryParams.toString()}`);
      const data = await res.json();
      setDatasets(data.datasets || []);
      if (data.datasets && data.datasets.length > 0 && !activeDataset) {
        setActiveDataset(data.datasets[0]);
      }
    } catch (err) {
      console.error('Failed to search datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThrones = async () => {
    try {
      const res = await fetch('/api/arena/thrones');
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, CombatThroneInfo> = {};
        (data.thrones || []).forEach((t: CombatThroneInfo) => {
          map[t.dataset_id] = t;
        });
        setThrones(map);
      }
    } catch (e) {
      console.warn('Failed to load thrones:', e);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [searchQuery, selectedTask, selectedModality]);

  useEffect(() => {
    fetchThrones();
  }, []);

  const handleSaveHfAccount = (acc: string) => {
    const clean = acc.trim().replace(/^@/, '');
    if (clean) {
      setLinkedHfAccount(clean);
      localStorage.setItem('are_hf_account', clean);
      setIsLinkingAccount(false);
    }
  };

  const handleOpenChallengeModal = (ds: Dataset) => {
    setSelectedChallengeDataset(ds);
    const throne = thrones[ds.id];
    setChallengeClaim(
      throne?.top_target_claim ||
      `All sample reasoning chains and schema invariants in ${ds.id} are minimal under formal resolution`
    );
    setChallengePayload(
      `Construct resolution refutation witness deriving empty clause contradiction on ${ds.id} invariant states`
    );
    setChallengeResult(null);
    setChallengeModalOpen(true);
  };

  const handleExecuteChallenge = async () => {
    if (!selectedChallengeDataset) return;
    setChallengeLoading(true);
    try {
      const res = await fetch('/api/arena/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedChallengeDataset.id,
          challenger_hf_account: linkedHfAccount || 'anonymous-challenger',
          challenger_model_id: challengerModel,
          attack_type: challengeAttackType,
          target_claim: challengeClaim,
          custom_payload: challengePayload
        })
      });

      const data = await res.json();
      setChallengeResult(data);
      if (data.throne) {
        setThrones(prev => ({
          ...prev,
          [data.throne.dataset_id]: data.throne
        }));
      }
    } catch (err: any) {
      alert('Challenge execution error: ' + err.message);
    } finally {
      setChallengeLoading(false);
    }
  };

  // Text-based filtering across name, license, and tags
  const filteredDatasets = datasets.filter(ds => {
    if (selectedLicense !== 'all' && ds.license.toLowerCase() !== selectedLicense.toLowerCase()) {
      return false;
    }
    if (selectedTag && !ds.tags.some(t => t.toLowerCase().includes(selectedTag.toLowerCase()))) {
      return false;
    }
    return true;
  });

  // Best Rated Datasets (Sorted by likes / rating)
  const bestRatedDatasets = [...datasets].sort((a, b) => b.likes - a.likes).slice(0, 4);

  const availableLicenses = Array.from(new Set(datasets.map(d => d.license))).filter(Boolean);
  const popularTags = ['evidence-bound-css', 'synthetic', 'instructions', 'reasoning', 'agent-studio', 'code', 'dpo', 'thorsu'];

  const tasks = [
    { id: 'all', label: 'All Tasks' },
    { id: 'instruction-tuning', label: 'Instruction Tuning' },
    { id: 'code-generation', label: 'Code Generation' },
    { id: 'preference-dpo', label: 'Preference (DPO)' },
    { id: 'math-reasoning', label: 'Math & Reasoning' },
    { id: 'vision-language', label: 'Vision Language' },
  ];

  return (
    <div className="space-y-6">
      {/* HF Account Ownership & Combat Linking Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Hugging Face Owner & Challenger Identity</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Claim ownership of datasets, post combat requests, or challenge reigning champions on the Combat Throne.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLinkingAccount ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputHfAccount}
                onChange={(e) => setInputHfAccount(e.target.value)}
                placeholder="HF username (e.g. ouroboroscollective)"
                className="px-3 py-1.5 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-amber-300 placeholder-slate-500 focus:outline-none min-h-[38px]"
              />
              <button
                onClick={() => handleSaveHfAccount(inputHfAccount)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors min-h-[38px]"
              >
                Save
              </button>
              <button
                onClick={() => setIsLinkingAccount(false)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors min-h-[38px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                @{linkedHfAccount || 'anonymous'}
              </span>
              <button
                onClick={() => {
                  setInputHfAccount(linkedHfAccount);
                  setIsLinkingAccount(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors min-h-[38px]"
              >
                Link Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BEST RATED DATASETS & COMBAT THRONE SHOWCASE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Best-Rated Datasets & Live Combat Thrones</span>
            <span className="text-[10px] text-amber-400/80 font-mono font-normal">
              (Challenge owner models to depose current top champion)
            </span>
          </h3>
          {onNavigateToArena && (
            <button
              onClick={onNavigateToArena}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
            >
              <span>View Full Arena Throne</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {bestRatedDatasets.map((ds) => {
            const throne = thrones[ds.id];
            const champName = throne?.current_champion_model || 'ARE-rLOGIC-70b';
            const champScore = throne?.champion_score || 2180;
            const streak = throne?.undefeated_streak || 14;

            return (
              <div
                key={ds.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
                        {ds.author}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                        {ds.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[11px] text-rose-400 font-mono font-bold shrink-0">
                      <Heart className="w-3 h-3 fill-rose-500/20" />
                      <span>{ds.likes}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {ds.description}
                  </p>

                  {/* Combat Throne Champion Badge */}
                  <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 mt-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        Reigning Champion
                      </span>
                      <span className="font-mono font-bold text-amber-400">{champScore} pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                        {champName}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {streak}W streak
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setActiveDataset(ds);
                      onSelectForVisualizer(ds.id);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 font-medium"
                  >
                    Inspect Details
                  </button>

                  <button
                    onClick={() => handleOpenChallengeModal(ds)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 min-h-[36px]"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Challenge to Combat</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TEXT-BASED MULTI-DIMENSIONAL FILTERING & SEARCH */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              Hugging Face Datasets Hub
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Discover, filter by name/license/tags, and verify reasoning data with cryptographic evidence receipts.
            </p>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search datasets (e.g. fineweb, alpaca, code, reasoning)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Text Filter Bar: License & Tag controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filter by License</label>
            <select
              value={selectedLicense}
              onChange={(e) => setSelectedLicense(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Licenses</option>
              {availableLicenses.map((lic) => (
                <option key={lic} value={lic}>{lic}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filter by Tag Keyword</label>
            <input
              type="text"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              placeholder="Filter tags (e.g. synthetic, math)..."
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-1.5 flex-wrap">
              {popularTags.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                  className={`px-2 py-1 text-[10px] font-mono rounded-lg transition-colors ${
                    selectedTag === tag
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task segmented controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs font-medium text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Task:
          </span>
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTask(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedTask === t.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Canonical Dataset Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">Featured Evidence Anchor</span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-300 font-mono font-semibold">45,000 Verified Invariants</span>
            </div>
            <h4 className="text-sm font-bold text-slate-100 mt-0.5">
              ouroboroscollective/evidence-bound-css
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic CSS layout invariants, anti-hallucination UI contracts, and verifiable proofs for resilient frontends.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const eb = datasets.find(d => d.id === 'ouroboroscollective/evidence-bound-css');
              if (eb) setActiveDataset(eb);
              else {
                fetch('/api/datasets/preview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dataset_id: 'ouroboroscollective/evidence-bound-css' })
                }).then(r => r.json()).then(d => { if (d.dataset) setActiveDataset(d.dataset); });
              }
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-sm min-h-[40px]"
          >
            <span>Inspect Rules</span>
          </button>

          <button
            onClick={() => {
              const eb = datasets.find(d => d.id === 'ouroboroscollective/evidence-bound-css') || activeDataset;
              if (eb) handleOpenChallengeModal(eb);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md shadow-amber-500/10 flex items-center gap-1.5 min-h-[40px]"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Challenge Throne</span>
          </button>

          <a
            href="https://huggingface.co/datasets/ouroboroscollective/evidence-bound-css"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-800 transition-colors flex items-center gap-1 min-h-[40px]"
          >
            <span>HF Page</span>
            <ExternalLink className="w-3 h-3 text-amber-400" />
          </a>
        </div>
      </div>

      {/* Main Grid: Dataset Cards on Left, Active Dataset Detailed Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dataset List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800">
              Loading datasets from Hugging Face Hub...
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-slate-900 rounded-2xl border border-slate-800">
              No matching Hugging Face datasets found for selected filters.
            </div>
          ) : (
            filteredDatasets.map((ds) => {
              const isSelected = activeDataset?.id === ds.id;
              const throne = thrones[ds.id];

              return (
                <div
                  key={ds.id}
                  onClick={() => setActiveDataset(ds)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 hover:text-amber-300 transition-colors">
                        {ds.id}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{ds.task}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ds.size}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-amber-400/80">{ds.license}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-amber-300 border border-slate-700">
                      {ds.modality}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {ds.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3 text-slate-400" />
                        {ds.downloads}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400/80" />
                        {ds.likes}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {throne && (
                        <span className="text-[10px] font-mono text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          👑 {throne.champion_score} pts
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-amber-400 font-medium hover:underline">
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Dataset Detail Panel */}
        <div className="lg:col-span-7">
          {activeDataset ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6 space-y-6">
              {/* Header */}
              <div className="space-y-3 pb-4 border-b border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
                      <span>{activeDataset.author}</span>
                      <span>/</span>
                      <span className="font-semibold text-slate-200">{activeDataset.name}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-100 mt-1">{activeDataset.id}</h2>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenChallengeModal(activeDataset)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm min-h-[38px]"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Challenge to Combat</span>
                    </button>

                    {/* Save to Firebase Account */}
                    <button
                      onClick={() => handleSaveActiveToAccount(activeDataset)}
                      disabled={isSavingDataset}
                      title="Save this dataset to your personal Firebase cloud account"
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[38px] ${
                        savedSuccessId === activeDataset.id
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                      }`}
                    >
                      {savedSuccessId === activeDataset.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-slate-950" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isSavingDataset ? 'Saving...' : 'Save Dataset'}</span>
                        </>
                      )}
                    </button>

                    {onExportToHf && (
                      <button
                        onClick={() => onExportToHf('generic_export', `Hugging Face Dataset Metadata: ${activeDataset.id}`, activeDataset, activeDataset.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors min-h-[38px]"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                        <span>Export</span>
                      </button>
                    )}

                    <a
                      href={`https://huggingface.co/datasets/${activeDataset.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-medium rounded-lg border border-slate-800 transition-colors min-h-[38px]"
                    >
                      <span>HF Hub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => onSelectForVisualizer(activeDataset.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors shadow-sm min-h-[38px]"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Analytics & Stream</span>
                    </button>
                    <button
                      onClick={() => onSelectForPipeline(activeDataset.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors min-h-[38px]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pipeline</span>
                    </button>
                    <button
                      onClick={() => onOpenScriptExport(activeDataset.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors min-h-[38px]"
                    >
                      <Code2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Train Code</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeDataset.description}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 flex-wrap">
                  <span>Task: <strong className="text-slate-200">{activeDataset.task}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Modality: <strong className="text-slate-200">{activeDataset.modality}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>License: <strong className="text-slate-200">{activeDataset.license}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Rows: <strong className="text-slate-200">{activeDataset.num_rows.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Inspector Sub-Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Data Sample Rows
                </button>
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'schema'
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Features & Schema
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'raw'
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw JSON
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'preview' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300">Sample Dataset Records</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {activeDataset.sample_rows.map((row, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                        {Object.entries(row).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-12 gap-2">
                            <span className="col-span-3 font-mono text-amber-400/90 font-medium truncate">{k}:</span>
                            <span className="col-span-9 font-mono text-slate-300 break-words whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'schema' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300">Feature Field Definitions</h4>
                  <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                    {activeDataset.features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                        <span className="font-mono text-slate-200 font-medium">{f.name}</span>
                        <span className="font-mono text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {f.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="relative">
                  <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-amber-300/90 max-h-80 overflow-auto">
                    {JSON.stringify(activeDataset, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800">
              Select a dataset from the left list to inspect its columns and preview sample rows.
            </div>
          )}
        </div>
      </div>

      {/* CHALLENGE TO COMBAT MODAL */}
      {challengeModalOpen && selectedChallengeDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Issue Combat Challenge</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fight to depose the reigning champion on <span className="font-mono text-amber-300">{selectedChallengeDataset.id}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setChallengeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Reigning Champion Info Banner */}
              {(() => {
                const throne = thrones[selectedChallengeDataset.id];
                const champ = throne?.current_champion_model || 'ouroboros/ARE-rLOGIC-70b';
                const score = throne?.champion_score || 2180;
                return (
                  <div className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" /> Current Undefeated Champion
                      </span>
                      <p className="text-sm font-bold text-slate-100 font-mono">{champ}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Top Winner's Score</span>
                      <p className="text-lg font-mono font-bold text-amber-400">{score} pts</p>
                    </div>
                  </div>
                );
              })()}

              {/* Linked HF Account Confirmation */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Linked Hugging Face Challenger Identity</span>
                  <span className="text-[11px] text-amber-400 font-mono">@{linkedHfAccount || 'anonymous'}</span>
                </label>
                <input
                  type="text"
                  value={linkedHfAccount}
                  onChange={(e) => setLinkedHfAccount(e.target.value)}
                  placeholder="Your Hugging Face Account handle"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              {/* Challenger Model Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Choose Challenger Model</label>
                <select
                  value={challengerModel}
                  onChange={(e) => setChallengerModel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Deep Logic Reasoning)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (High Thinking)</option>
                  <option value="ouroboros/ARE-rLOGIC-70b">ouroboros/ARE-rLOGIC-70b (Resolution Engine)</option>
                  <option value="deepseek-ai/DeepSeek-R1">deepseek-ai/DeepSeek-R1 (Chain-of-Thought)</option>
                  <option value="meta-llama/Llama-3.1-70B-Instruct">meta-llama/Llama-3.1-70B-Instruct</option>
                  <option value="Qwen/Qwen2.5-Coder-32B">Qwen/Qwen2.5-Coder-32B (AST Parser)</option>
                </select>
              </div>

              {/* Attack Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Combat Strategy / Attack Method</label>
                <select
                  value={challengeAttackType}
                  onChange={(e) => setChallengeAttackType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="resolution_refutation">Resolution Refutation (Derive empty clause contradiction)</option>
                  <option value="counterexample_induction">Counterexample Induction (Violate invariant model bounds)</option>
                  <option value="ast_invariant_violation">AST Invariant Violation (Break tree depth & acyclicity contracts)</option>
                </select>
              </div>

              {/* Target Claim & Payload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Claim to Refute</label>
                <input
                  type="text"
                  value={challengeClaim}
                  onChange={(e) => setChallengeClaim(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Challenger Attack Payload</label>
                <textarea
                  value={challengePayload}
                  onChange={(e) => setChallengePayload(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              {/* Live Challenge Result */}
              {challengeResult && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  challengeResult.deposed
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      {challengeResult.deposed ? <Crown className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                      {challengeResult.deposed ? 'Champion Deposed from Throne!' : 'Reigning Champion Defended!'}
                    </span>
                    <span className="font-mono text-xs font-bold">
                      Score: {challengeResult.score} pts (+{challengeResult.points_awarded} revision pts)
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {challengeResult.match?.referee_verdict}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                    <span>Receipt: {challengeResult.match?.evidence_receipt_hash}</span>
                    <span>Winner: {challengeResult.champion}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
              <button
                onClick={() => setChallengeModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 min-h-[42px]"
              >
                Close
              </button>

              <button
                onClick={handleExecuteChallenge}
                disabled={challengeLoading}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 min-h-[42px]"
              >
                {challengeLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Formal Combat...</span>
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4" />
                    <span>Launch Combat Challenge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
