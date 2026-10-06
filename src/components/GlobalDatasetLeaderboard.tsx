import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  ShieldCheck,
  Shield,
  Sparkles,
  Award,
  Layers,
  Search,
  Filter,
  Download,
  UploadCloud,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Zap,
  Code2,
  BookOpen,
  ArrowUpDown,
  Swords,
  Hash,
  Share2,
  FileCode,
  Flame,
  CheckCircle2,
  Sliders,
  Terminal,
  UserCheck,
  Eye,
  Info,
  Activity,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  Clock
} from 'lucide-react';

export interface DatasetLeaderboardItem {
  rank: number;
  dataset_id: string;
  dataset_name: string;
  author: string;
  description: string;
  num_rows: number;
  size: string;
  license: string;
  downloads: string;
  likes: number;
  tags: string[];
  logic_efficiency_score: number;
  ast_invariant_rate: number;
  defense_record: {
    defenses: number;
    losses: number;
    win_rate: number;
    undefeated_streak: number;
  };
  evidence_revision_points: number;
  reigning_champion: string;
  last_receipt_hash: string;
  fine_tuning_tier: string;
  recommended_formats: string[];
  context_window: string;
  loss_curve_estimate: string;
  sample_tuning_pair: {
    system: string;
    prompt: string;
    completion: string;
  };
  medals_awarded: Array<{
    id: string;
    name: string;
    icon: string;
    tier: string;
    description: string;
  }>;
}

export interface MedalOfHonor {
  id: string;
  name: string;
  category: string;
  tier: string;
  icon: string;
  color: string;
  ribbon_gradient: string;
  description: string;
  requirement: string;
  provenance: string;
  markdown_badge: string;
  html_badge: string;
}

export interface CircuitStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  failureThreshold: number;
  cooldownMs: number;
  timeRemainingMs: number;
  lastFailureTime: number | null;
  lastFailureError: string | null;
  activeModelTier: string;
  totalRequests: number;
  successCount: number;
  trippedCount: number;
  queuedRetriesCount: number;
}

interface DynamicHonorBadge {
  id: string;
  title: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'OBSIDIAN';
  category: 'Defense Streak' | 'Logic Efficiency' | 'AST Invariant' | 'Throne Combat';
  iconType: 'Crown' | 'Shield' | 'ShieldCheck' | 'Sparkles' | 'Award' | 'Flame' | 'Zap';
  ribbonGradient: string;
  badgeColor: string;
  description: string;
  requirement: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  isUnlocked: boolean;
  progressPercent: number;
  markdownBadge: string;
  htmlBadge: string;
}

interface GlobalDatasetLeaderboardProps {
  onSelectForFineTuning?: (datasetId: string) => void;
  onSelectForVisualizer?: (datasetId: string) => void;
  onSelectForPipeline?: (datasetId: string) => void;
  onChallengeThrone?: (datasetId: string) => void;
  onExportToHf?: (actionType: any, title: string, payload: any, defaultRepo?: string) => void;
}

export const GlobalDatasetLeaderboard: React.FC<GlobalDatasetLeaderboardProps> = ({
  onSelectForFineTuning,
  onSelectForVisualizer,
  onSelectForPipeline,
  onChallengeThrone,
  onExportToHf
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'fine_tuning' | 'medals' | 'circuit'>('leaderboard');
  const [datasets, setDatasets] = useState<DatasetLeaderboardItem[]>([]);
  const [medals, setMedals] = useState<MedalOfHonor[]>([]);
  const [circuitStatus, setCircuitStatus] = useState<CircuitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<'ALL' | 'TIER1' | 'TIER2' | 'TIER3'>('ALL');
  const [sortBy, setSortBy] = useState<'efficiency' | 'defense' | 'points' | 'ast'>('efficiency');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected Dataset for Fine-Tuning Modal
  const [selectedDatasetForTuning, setSelectedDatasetForTuning] = useState<DatasetLeaderboardItem | null>(null);
  const [tuningFormat, setTuningFormat] = useState<'chatml' | 'llama3' | 'alpaca' | 'axolotl'>('chatml');

  // Profile Medals & Decoration State
  const [userHfAccount, setUserHfAccount] = useState<string>(() => localStorage.getItem('are_hf_account') || 'ouroboroscollective');
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountInput, setAccountInput] = useState('');
  const [equippedMedalIds, setEquippedMedalIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('are_equipped_medals');
      return saved ? JSON.parse(saved) : ['throne_grand_sovereign', 'ast_invariant_sentinel', 'diamond_undefeated_legend'];
    } catch {
      return ['throne_grand_sovereign', 'ast_invariant_sentinel', 'diamond_undefeated_legend'];
    }
  });
  const [copiedBadgeId, setCopiedBadgeId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resettingCircuit, setResettingCircuit] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const fetchLeaderboardAndCircuit = async () => {
    setLoading(true);
    try {
      const [resDatasets, resMedals, resCircuit] = await Promise.all([
        fetch('/api/arena/dataset-leaderboard'),
        fetch('/api/arena/medals'),
        fetch('/api/arena/circuit-status')
      ]);
      if (resDatasets.ok) {
        const data = await resDatasets.json();
        setDatasets(data.datasets || []);
      }
      if (resMedals.ok) {
        const medalData = await resMedals.json();
        setMedals(medalData.medals || []);
      }
      if (resCircuit.ok) {
        const cData = await resCircuit.json();
        setCircuitStatus(cData.status || null);
      }
    } catch (err) {
      console.error('Failed to load dataset leaderboard or circuit status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardAndCircuit();
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/arena/circuit-status');
        if (res.ok) {
          const data = await res.json();
          setCircuitStatus(data.status);
        }
      } catch (e) {
        // silent polling
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCircuit = async () => {
    setResettingCircuit(true);
    try {
      const res = await fetch('/api/arena/circuit/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCircuitStatus(data.status);
        showToast('Circuit breaker manually reset to CLOSED (Nominal)');
      }
    } catch (err) {
      console.error('Failed to reset circuit breaker:', err);
    } finally {
      setResettingCircuit(false);
    }
  };

  const handleSaveAccount = (acc: string) => {
    const clean = acc.trim().replace(/^@/, '');
    if (clean) {
      setUserHfAccount(clean);
      localStorage.setItem('are_hf_account', clean);
      setIsEditingAccount(false);
      showToast(`Linked Hugging Face profile: @${clean}`);
    }
  };

  const toggleEquipMedal = (medalId: string) => {
    const newEquipped = equippedMedalIds.includes(medalId)
      ? equippedMedalIds.filter(id => id !== medalId)
      : [...equippedMedalIds, medalId];
    setEquippedMedalIds(newEquipped);
    localStorage.setItem('are_equipped_medals', JSON.stringify(newEquipped));
    showToast(
      equippedMedalIds.includes(medalId)
        ? 'Medal unequipped from profile'
        : 'Medal equipped to your public profile!'
    );
  };

  const handleCopyBadge = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBadgeId(id);
    setTimeout(() => setCopiedBadgeId(null), 2500);
    showToast('Badge code copied to clipboard!');
  };

  // Compute User's Live Dynamic Stats from Dataset Leaderboard
  const userDatasets = datasets.filter(
    d => d.author.toLowerCase() === userHfAccount.toLowerCase() || d.dataset_id.toLowerCase().includes(userHfAccount.toLowerCase())
  );
  const maxDefenseStreak = Math.max(
    ...userDatasets.map(d => d.defense_record.undefeated_streak),
    datasets[0]?.defense_record?.undefeated_streak || 18
  );
  const maxLogicEfficiency = Math.max(
    ...userDatasets.map(d => d.logic_efficiency_score),
    datasets[0]?.logic_efficiency_score || 99.5
  );
  const maxAstAccuracy = Math.max(
    ...userDatasets.map(d => d.ast_invariant_rate),
    datasets[0]?.ast_invariant_rate || 98.9
  );
  const totalEvidencePoints = userDatasets.reduce((acc, d) => acc + d.evidence_revision_points, 0) || (datasets[0]?.evidence_revision_points || 9420);

  // Dynamic Honor Badges System: Computed from user's Combat Throne defense streaks and logic efficiency
  const dynamicHonorBadges: DynamicHonorBadge[] = [
    {
      id: 'diamond_undefeated_legend',
      title: 'Diamond Undefeated Legend',
      tier: 'DIAMOND',
      category: 'Defense Streak',
      iconType: 'Sparkles',
      ribbonGradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      badgeColor: 'cyan',
      description: 'Reign undefeated on a top-tier Combat Throne across 20+ consecutive logic refutation challenges without falling.',
      requirement: 'Achieve Combat Throne defense streak >= 20 battles',
      currentValue: maxDefenseStreak,
      targetValue: 20,
      unit: 'Battles',
      isUnlocked: maxDefenseStreak >= 20,
      progressPercent: Math.min(100, Math.round((maxDefenseStreak / 20) * 100)),
      markdownBadge: `[![ARE Honor: Diamond Legend](https://img.shields.io/badge/ARE--Honor-Diamond%20Legend%20(${maxDefenseStreak}%20Streak)-cyan?style=for-the-badge&logo=huggingface)](https://huggingface.co/${userHfAccount})`,
      htmlBadge: `<a href="https://huggingface.co/${userHfAccount}"><img src="https://img.shields.io/badge/ARE--Honor-Diamond%20Legend%20(${maxDefenseStreak}%20Streak)-cyan?style=for-the-badge&logo=huggingface" alt="Diamond Legend Medal" /></a>`
    },
    {
      id: 'gold_throne_sovereign',
      title: 'Gold Throne Sovereign Grand Medal',
      tier: 'GOLD',
      category: 'Defense Streak',
      iconType: 'Crown',
      ribbonGradient: 'from-amber-400 via-amber-500 to-yellow-600',
      badgeColor: 'amber',
      description: 'Successfully defend reigning champion status on any dataset throne for 10 or more consecutive matches.',
      requirement: 'Achieve Combat Throne defense streak >= 10 battles',
      currentValue: maxDefenseStreak,
      targetValue: 10,
      unit: 'Battles',
      isUnlocked: maxDefenseStreak >= 10,
      progressPercent: Math.min(100, Math.round((maxDefenseStreak / 10) * 100)),
      markdownBadge: `[![ARE Honor: Gold Sovereign](https://img.shields.io/badge/ARE--Honor-Gold%20Sovereign%20(${maxDefenseStreak}%20Defenses)-gold?style=for-the-badge&logo=crown)](https://huggingface.co/${userHfAccount})`,
      htmlBadge: `<a href="https://huggingface.co/${userHfAccount}"><img src="https://img.shields.io/badge/ARE--Honor-Gold%20Sovereign%20(${maxDefenseStreak}%20Defenses)-gold?style=for-the-badge&logo=crown" alt="Gold Sovereign Medal" /></a>`
    },
    {
      id: 'silver_throne_centurion',
      title: 'Silver Throne Centurion',
      tier: 'SILVER',
      category: 'Defense Streak',
      iconType: 'Shield',
      ribbonGradient: 'from-slate-300 via-slate-400 to-slate-600',
      badgeColor: 'slate',
      description: 'Defend dataset logic invariants against 5 challenger models attempting clause refutation.',
      requirement: 'Achieve Combat Throne defense streak >= 5 battles',
      currentValue: maxDefenseStreak,
      targetValue: 5,
      unit: 'Battles',
      isUnlocked: maxDefenseStreak >= 5,
      progressPercent: Math.min(100, Math.round((maxDefenseStreak / 5) * 100)),
      markdownBadge: `[![ARE Honor: Silver Centurion](https://img.shields.io/badge/ARE--Honor-Silver%20Centurion-silver?style=for-the-badge&logo=shield)](https://huggingface.co/${userHfAccount})`,
      htmlBadge: `<a href="https://huggingface.co/${userHfAccount}"><img src="https://img.shields.io/badge/ARE--Honor-Silver%20Centurion-silver?style=for-the-badge&logo=shield" alt="Silver Centurion Medal" /></a>`
    },
    {
      id: 'grand_invariant_master',
      title: 'Grand Invariant Master Ribbon',
      tier: 'PLATINUM',
      category: 'Logic Efficiency',
      iconType: 'Zap',
      ribbonGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      badgeColor: 'emerald',
      description: 'Attain >= 99.0% verified formal logic efficiency score in the Global Dataset Leaderboard.',
      requirement: 'Dataset logic efficiency score >= 99.0%',
      currentValue: maxLogicEfficiency,
      targetValue: 99.0,
      unit: '%',
      isUnlocked: maxLogicEfficiency >= 99.0,
      progressPercent: Math.min(100, Math.round((maxLogicEfficiency / 99.0) * 100)),
      markdownBadge: `[![ARE Honor: Invariant Master](https://img.shields.io/badge/ARE--Honor-Invariant%20Master%20(${maxLogicEfficiency}%25)-emerald?style=for-the-badge&logo=check)](https://huggingface.co/${userHfAccount})`,
      htmlBadge: `<a href="https://huggingface.co/${userHfAccount}"><img src="https://img.shields.io/badge/ARE--Honor-Invariant%20Master%20(${maxLogicEfficiency}%25)-emerald?style=for-the-badge&logo=check" alt="Invariant Master Medal" /></a>`
    },
    {
      id: 'ast_sentinel_sovereign',
      title: 'AST Invariant Sentinel Medal',
      tier: 'PLATINUM',
      category: 'AST Invariant',
      iconType: 'ShieldCheck',
      ribbonGradient: 'from-purple-500 via-indigo-600 to-slate-900',
      badgeColor: 'purple',
      description: 'Maintain >= 98.5% formal AST syntax and semantic contract validity without cyclic deviations.',
      requirement: 'AST Invariant accuracy >= 98.5%',
      currentValue: maxAstAccuracy,
      targetValue: 98.5,
      unit: '%',
      isUnlocked: maxAstAccuracy >= 98.5,
      progressPercent: Math.min(100, Math.round((maxAstAccuracy / 98.5) * 100)),
      markdownBadge: `[![ARE Honor: AST Sentinel](https://img.shields.io/badge/ARE--Honor-AST%20Sentinel%20(${maxAstAccuracy}%25)-purple?style=for-the-badge&logo=shield)](https://huggingface.co/${userHfAccount})`,
      htmlBadge: `<a href="https://huggingface.co/${userHfAccount}"><img src="https://img.shields.io/badge/ARE--Honor-AST%20Sentinel%20(${maxAstAccuracy}%25)-purple?style=for-the-badge&logo=shield" alt="AST Sentinel Medal" /></a>`
    },
    {
      id: 'crown_slayer_deposer',
      title: 'Crown Slayer Refutation Medal',
      tier: 'OBSIDIAN',
      category: 'Throne Combat',
      iconType: 'Flame',
      ribbonGradient: 'from-rose-500 via-amber-600 to-red-700',
      badgeColor: 'rose',
      description: 'Successfully issue a battle challenge and depose a reigning champion on any high-ranked dataset throne.',
      requirement: 'Win at least 1 Combat Throne challenge with formal resolution proof',
      currentValue: 1,
      targetValue: 1,
      unit: 'Depose',
      isUnlocked: true,
      progressPercent: 100,
      markdownBadge: `[![ARE Honor: Crown Slayer](https://img.shields.io/badge/ARE--Honor-Crown%20Slayer-rose?style=for-the-badge&logo=swords)](https://huggingface.co/${userHfAccount})`,
      htmlBadge: `<a href="https://huggingface.co/${userHfAccount}"><img src="https://img.shields.io/badge/ARE--Honor-Crown%20Slayer-rose?style=for-the-badge&logo=swords" alt="Crown Slayer Medal" /></a>`
    }
  ];

  // Filtered and Sorted Datasets
  const filteredDatasets = datasets
    .filter(ds => {
      const matchesSearch =
        ds.dataset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ds.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ds.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedTier === 'TIER1') return ds.fine_tuning_tier.includes('Tier 1');
      if (selectedTier === 'TIER2') return ds.fine_tuning_tier.includes('Tier 2');
      if (selectedTier === 'TIER3') return ds.fine_tuning_tier.includes('Tier 3');
      return true;
    })
    .sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'efficiency') {
        valA = a.logic_efficiency_score;
        valB = b.logic_efficiency_score;
      } else if (sortBy === 'defense') {
        valA = a.defense_record.defenses;
        valB = b.defense_record.defenses;
      } else if (sortBy === 'points') {
        valA = a.evidence_revision_points;
        valB = b.evidence_revision_points;
      } else if (sortBy === 'ast') {
        valA = a.ast_invariant_rate;
        valB = b.ast_invariant_rate;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

  const generateFineTuningConfig = (ds: DatasetLeaderboardItem, format: string) => {
    if (format === 'chatml') {
      return JSON.stringify(
        {
          messages: [
            { role: 'system', content: ds.sample_tuning_pair.system },
            { role: 'user', content: ds.sample_tuning_pair.prompt },
            { role: 'assistant', content: ds.sample_tuning_pair.completion }
          ]
        },
        null,
        2
      );
    }
    if (format === 'llama3') {
      return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${ds.sample_tuning_pair.system}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${ds.sample_tuning_pair.prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n${ds.sample_tuning_pair.completion}<|eot_id|>`;
    }
    if (format === 'alpaca') {
      return JSON.stringify(
        {
          instruction: ds.sample_tuning_pair.prompt,
          input: '',
          output: ds.sample_tuning_pair.completion
        },
        null,
        2
      );
    }
    return `# Axolotl SFT Recipe for ${ds.dataset_id}
base_model: meta-llama/Llama-3.1-8B-Instruct
model_type: LlamaForCausalLM
tokenizer_type: AutoTokenizer

datasets:
  - path: ${ds.dataset_id}
    type: chatml
    split: train

sequence_len: 8192
sample_packing: true
eval_sample_packing: false
pad_to_sequence_len: true

adapter: lora
lora_r: 32
lora_alpha: 64
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

learning_rate: 0.0002
num_epochs: 3
micro_batch_size: 2
gradient_accumulation_steps: 4
optimizer: adamw_torch_fused
lr_scheduler: cosine
warmup_steps: 50
logging_steps: 10
bf16: true
tf32: true
`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-amber-300">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
            <Trophy className="w-4 h-4" />
            <span>COMMUNITY-VERIFIED LOGIC EFFICIENCY MATRIX</span>
            <span aria-hidden="true">·</span>
            {circuitStatus && (
              <span className={`flex items-center gap-1 font-bold ${
                circuitStatus.state === 'CLOSED'
                  ? 'text-emerald-400'
                  : circuitStatus.state === 'HALF_OPEN'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>CIRCUIT: {circuitStatus.state}</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Global Dataset Leaderboard & Medals of Honor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Ranks datasets based on verified formal logic efficiency, Combat Throne defense streaks, and AST invariant validity. Browse top-tier reasoning datasets for model fine-tuning, inspect real-time circuit breaker health, and earn dynamic prestige Medals of Honor.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Dataset Rankings</span>
          </button>
          <button
            onClick={() => setActiveTab('medals')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] whitespace-nowrap ${
              activeTab === 'medals'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Honor Medals & Profile ({dynamicHonorBadges.filter(b => b.isUnlocked).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('fine_tuning')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] whitespace-nowrap ${
              activeTab === 'fine_tuning'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fine-Tuning SFT Suite</span>
          </button>
          <button
            onClick={() => setActiveTab('circuit')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] whitespace-nowrap ${
              activeTab === 'circuit'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Circuit Breaker</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DATASET LEADERBOARD RANKINGS */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Controls Bar: Search, Tier Filter, Sorting */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by dataset name, author, or tag..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 min-h-[40px]"
              />
            </div>

            {/* Tier Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'TIER1', 'TIER2', 'TIER3'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px] ${
                    selectedTier === tier
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tier === 'ALL' && 'All Tiers'}
                  {tier === 'TIER1' && 'Tier 1: SFT Ready'}
                  {tier === 'TIER2' && 'Tier 2: RLVR Verifiable'}
                  {tier === 'TIER3' && 'Tier 3: Pretrain'}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 min-h-[36px]"
              >
                <option value="efficiency">Logic Efficiency Score</option>
                <option value="defense">Combat Defenses</option>
                <option value="points">Evidence Points</option>
                <option value="ast">AST Invariant Rate</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Toggle sort direction"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dataset Rankings Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                    <th className="p-3.5 w-14 text-center">Rank</th>
                    <th className="p-3.5">Dataset & Author</th>
                    <th className="p-3.5 text-right">Logic Efficiency</th>
                    <th className="p-3.5 text-right">Defense Record</th>
                    <th className="p-3.5 text-right">AST Invariant</th>
                    <th className="p-3.5 text-right">Revision Pts</th>
                    <th className="p-3.5">Reigning Champion</th>
                    <th className="p-3.5">Fine-Tuning Readiness</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400 animate-spin" />
                          <span>Computing Global Dataset Leaderboard rankings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDatasets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        No datasets match your active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDatasets.map((ds) => (
                      <tr key={ds.dataset_id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Rank */}
                        <td className="p-3.5 text-center font-bold font-mono">
                          {ds.rank === 1 && <span className="text-amber-400 flex items-center justify-center gap-1"><Crown className="w-3.5 h-3.5" /> #1</span>}
                          {ds.rank === 2 && <span className="text-slate-300">#2</span>}
                          {ds.rank === 3 && <span className="text-amber-600">#3</span>}
                          {ds.rank > 3 && <span className="text-slate-500">#{ds.rank}</span>}
                        </td>

                        {/* Dataset Name & Author */}
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{ds.dataset_name}</span>
                            {ds.medals_awarded.length > 0 && (
                              <div className="flex items-center gap-0.5" title="Medals Awarded">
                                {ds.medals_awarded.map((m) => (
                                  <span key={m.id} className="text-amber-400 text-[10px]" title={m.name}>
                                    🥇
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>@{ds.author}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ds.num_rows.toLocaleString()} rows</span>
                            <span aria-hidden="true">·</span>
                            <span>{ds.license}</span>
                          </div>
                        </td>

                        {/* Logic Efficiency */}
                        <td className="p-3.5 text-right font-mono font-bold text-amber-300 tabular-nums">
                          {ds.logic_efficiency_score}%
                        </td>

                        {/* Defense Record */}
                        <td className="p-3.5 text-right font-mono tabular-nums">
                          <span className="text-emerald-400 font-semibold">{ds.defense_record.defenses}W</span>
                          <span className="text-slate-600"> - </span>
                          <span className="text-slate-400">{ds.defense_record.losses}L</span>
                          <div className="text-[10px] text-slate-500">
                            Streak: {ds.defense_record.undefeated_streak}
                          </div>
                        </td>

                        {/* AST Invariant */}
                        <td className="p-3.5 text-right font-mono text-cyan-400 font-semibold tabular-nums">
                          {ds.ast_invariant_rate}%
                        </td>

                        {/* Evidence Revision Points */}
                        <td className="p-3.5 text-right font-mono text-purple-400 font-semibold tabular-nums">
                          {ds.evidence_revision_points.toLocaleString()}
                        </td>

                        {/* Reigning Champion */}
                        <td className="p-3.5 font-mono text-[11px] text-slate-300">
                          <div className="flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{ds.reigning_champion}</span>
                          </div>
                        </td>

                        {/* Fine-Tuning Tier */}
                        <td className="p-3.5">
                          <span className={`text-[11px] font-semibold ${
                            ds.fine_tuning_tier.includes('Tier 1')
                              ? 'text-emerald-400'
                              : ds.fine_tuning_tier.includes('Tier 2')
                              ? 'text-cyan-400'
                              : 'text-slate-400'
                          }`}>
                            {ds.fine_tuning_tier.split(':')[0]}
                          </span>
                          <div className="text-[10px] text-slate-500">
                            {ds.context_window}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedDatasetForTuning(ds);
                                setActiveTab('fine_tuning');
                              }}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 min-h-[32px]"
                              title="Inspect Fine-Tuning Config"
                            >
                              <Layers className="w-3 h-3" />
                              <span>Fine-Tune</span>
                            </button>
                            {onChallengeThrone && (
                              <button
                                onClick={() => onChallengeThrone(ds.dataset_id)}
                                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors min-h-[32px]"
                                title="Challenge Throne"
                              >
                                <Swords className="w-3 h-3 text-amber-400" />
                              </button>
                            )}
                            {onSelectForVisualizer && (
                              <button
                                onClick={() => onSelectForVisualizer(ds.dataset_id)}
                                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors min-h-[32px]"
                                title="Stream Dataset"
                              >
                                <Eye className="w-3 h-3 text-cyan-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DYNAMIC HONOR MEDALS & PROFILE DECORATION */}
      {activeTab === 'medals' && (
        <div className="space-y-6">
          {/* User Profile Honor Card Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-600/20 to-amber-900/30 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">
                      Hugging Face Profile Honor Registry
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      @{userHfAccount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Prestige Honor Medals dynamically assigned based on your active Combat Throne defense streak ({maxDefenseStreak}W) and verified logic efficiency ({maxLogicEfficiency}%).
                  </p>
                </div>
              </div>

              {/* Account Link/Edit */}
              <div className="flex items-center gap-2 shrink-0">
                {isEditingAccount ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={accountInput}
                      onChange={(e) => setAccountInput(e.target.value)}
                      placeholder="e.g. ouroboroscollective"
                      className="px-3 py-1.5 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-slate-200 focus:outline-none min-h-[38px]"
                    />
                    <button
                      onClick={() => handleSaveAccount(accountInput)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl min-h-[38px]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingAccount(false)}
                      className="px-2 py-1.5 text-slate-400 text-xs hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAccountInput(userHfAccount);
                      setIsEditingAccount(true);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 min-h-[38px]"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Account</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs pt-1">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Active Defense Streak</span>
                <span className="text-amber-400 font-bold text-sm">{maxDefenseStreak} Consecutive Wins</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Peak Logic Efficiency</span>
                <span className="text-emerald-400 font-bold text-sm">{maxLogicEfficiency}%</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">AST Validity Accuracy</span>
                <span className="text-cyan-400 font-bold text-sm">{maxAstAccuracy}%</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Evidence Points</span>
                <span className="text-purple-400 font-bold text-sm">{totalEvidencePoints.toLocaleString()}</span>
              </div>
            </div>

            {/* Equipped Badges Live Preview */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Active Equipped Profile Medals ({equippedMedalIds.length})
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {dynamicHonorBadges.filter(b => b.isUnlocked).length} / {dynamicHonorBadges.length} Medals Unlocked
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {equippedMedalIds.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">
                    No medals currently equipped. Click "Equip to Profile" on any unlocked badge below!
                  </span>
                ) : (
                  equippedMedalIds.map((id) => {
                    const badge = dynamicHonorBadges.find(b => b.id === id);
                    if (!badge) return null;
                    return (
                      <div
                        key={badge.id}
                        className="flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 border border-amber-500/40 rounded-xl shadow-md"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 text-xs">
                          {badge.iconType === 'Crown' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                          {badge.iconType === 'Sparkles' && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                          {badge.iconType === 'Shield' && <Shield className="w-3.5 h-3.5 text-slate-300" />}
                          {badge.iconType === 'ShieldCheck' && <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />}
                          {badge.iconType === 'Zap' && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                          {badge.iconType === 'Flame' && <Flame className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-200 block leading-tight">{badge.title}</span>
                          <span className="text-[10px] font-mono text-amber-400">{badge.tier} TIER</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Honor Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dynamicHonorBadges.map((badge) => {
              const isEquipped = equippedMedalIds.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between transition-all ${
                    badge.isUnlocked
                      ? 'border-slate-800 hover:border-amber-500/40'
                      : 'border-slate-800/60 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badge Header & Icon */}
                    <div className="flex items-start justify-between gap-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${badge.ribbonGradient} p-0.5 shadow-md flex items-center justify-center`}>
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                          {badge.iconType === 'Crown' && <Crown className="w-6 h-6 text-amber-400" />}
                          {badge.iconType === 'Sparkles' && <Sparkles className="w-6 h-6 text-cyan-400" />}
                          {badge.iconType === 'Shield' && <Shield className="w-6 h-6 text-slate-300" />}
                          {badge.iconType === 'ShieldCheck' && <ShieldCheck className="w-6 h-6 text-purple-400" />}
                          {badge.iconType === 'Zap' && <Zap className="w-6 h-6 text-emerald-400" />}
                          {badge.iconType === 'Flame' && <Flame className="w-6 h-6 text-rose-400" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {badge.isUnlocked ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-mono font-bold uppercase">
                            <Unlock className="w-3 h-3" />
                            <span>Unlocked</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-950 text-slate-500 border border-slate-800 rounded-lg text-[10px] font-mono font-bold uppercase">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono font-bold text-amber-400 uppercase">
                          {badge.tier}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{badge.title}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{badge.description}</p>
                    </div>

                    {/* Progress Bar & Criteria */}
                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Progress:</span>
                        <span className={badge.isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                          {badge.currentValue} / {badge.targetValue} {badge.unit} ({badge.progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all ${
                            badge.isUnlocked ? 'bg-emerald-500' : 'bg-amber-500/60'
                          }`}
                          style={{ width: `${badge.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions: Equip, Copy Markdown & HTML Badges */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => toggleEquipMedal(badge.id)}
                      disabled={!badge.isUnlocked}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 min-h-[38px] ${
                        !badge.isUnlocked
                          ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
                          : isEquipped
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Equipped to Profile</span>
                        </>
                      ) : badge.isUnlocked ? (
                        <>
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>Equip to Profile</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-600" />
                          <span>Locked</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyBadge(badge.markdownBadge, `md_${badge.id}`)}
                        className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 min-h-[32px]"
                      >
                        {copiedBadgeId === `md_${badge.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied MD</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy MD</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyBadge(badge.htmlBadge, `html_${badge.id}`)}
                        className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 min-h-[32px]"
                      >
                        {copiedBadgeId === `html_${badge.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied HTML</span>
                          </>
                        ) : (
                          <>
                            <Code2 className="w-3 h-3" />
                            <span>Copy HTML</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FINE-TUNING SUITE & DATASET FORMAT INSPECTOR */}
      {activeTab === 'fine_tuning' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Dataset Selector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Select Fine-Tuning Corpus</span>
              </h3>
              <p className="text-xs text-slate-400">
                Pick a top-tier verified reasoning dataset to generate fine-tuning prompt templates, loss convergence estimations, and Axolotl / TRL export scripts.
              </p>

              <div className="space-y-2 mt-3 max-h-[420px] overflow-y-auto pr-1">
                {datasets.map((ds) => {
                  const isSelected = (selectedDatasetForTuning?.dataset_id || datasets[0]?.dataset_id) === ds.dataset_id;
                  return (
                    <button
                      key={ds.dataset_id}
                      onClick={() => setSelectedDatasetForTuning(ds)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                          : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200">{ds.dataset_name}</span>
                        <span className="text-[10px] font-mono text-amber-400">{ds.logic_efficiency_score}%</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>@{ds.author}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400">{ds.fine_tuning_tier.split(':')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Active Dataset Fine-Tuning Inspector */}
          {(() => {
            const currentDs = selectedDatasetForTuning || datasets[0];
            if (!currentDs) return null;
            return (
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                  {/* Top Stats Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-100">{currentDs.dataset_name}</h3>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono font-bold">
                          {currentDs.fine_tuning_tier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{currentDs.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onSelectForPipeline && (
                        <button
                          onClick={() => onSelectForPipeline(currentDs.dataset_id)}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors min-h-[38px] flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Load Pipeline</span>
                        </button>
                      )}
                      {onExportToHf && (
                        <button
                          onClick={() =>
                            onExportToHf(
                              'tuning_config',
                              `Fine-Tuning Config: ${currentDs.dataset_name}`,
                              generateFineTuningConfig(currentDs, tuningFormat),
                              currentDs.dataset_id
                            )
                          }
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors min-h-[38px] flex items-center gap-1.5"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                          <span>Export to HF</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Training Specifications Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Context Window</span>
                      <span className="text-slate-200 font-bold">{currentDs.context_window}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">AST Accuracy</span>
                      <span className="text-cyan-400 font-bold">{currentDs.ast_invariant_rate}%</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Loss Estimate</span>
                      <span className="text-emerald-400 font-bold truncate block">{currentDs.loss_curve_estimate}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Throne Defenses</span>
                      <span className="text-amber-400 font-bold">{currentDs.defense_record.defenses} Defenses</span>
                    </div>
                  </div>

                  {/* Format Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        <span>Fine-Tuning Prompt & Recipe Format</span>
                      </label>
                      <div className="flex items-center gap-1">
                        {(['chatml', 'llama3', 'alpaca', 'axolotl'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setTuningFormat(fmt)}
                            className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-colors ${
                              tuningFormat === fmt
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {fmt.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[300px]">
                      <button
                        onClick={() =>
                          handleCopyBadge(
                            generateFineTuningConfig(currentDs, tuningFormat),
                            'tuning_code'
                          )
                        }
                        className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-sans flex items-center gap-1 transition-colors border border-slate-700"
                      >
                        {copiedBadgeId === 'tuning_code' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Recipe</span>
                          </>
                        )}
                      </button>
                      <pre className="whitespace-pre-wrap">{generateFineTuningConfig(currentDs, tuningFormat)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: CIRCUIT BREAKER TELEMETRY & RESILIENCE PANEL */}
      {activeTab === 'circuit' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <span>Gemini API Circuit Breaker & Multi-Tier Resilience Architecture</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Protects Logic Arena against 503 high-demand surges by automatically cascading across models (Primary ➔ Fast Backup ➔ Deterministic ARE-rLOGIC Resolver).
                </p>
              </div>

              <button
                onClick={handleResetCircuit}
                disabled={resettingCircuit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 min-h-[38px] shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${resettingCircuit ? 'animate-spin' : ''}`} />
                <span>Reset Circuit Breaker</span>
              </button>
            </div>

            {/* Circuit Health Cards */}
            {circuitStatus ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Circuit State</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      circuitStatus.state === 'CLOSED'
                        ? 'bg-emerald-400 animate-pulse'
                        : circuitStatus.state === 'HALF_OPEN'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-rose-400 animate-pulse'
                    }`} />
                    <span className="text-sm font-bold text-slate-100">{circuitStatus.state}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {circuitStatus.state === 'CLOSED' ? 'Nominal Operation' : circuitStatus.state === 'HALF_OPEN' ? 'Testing Recovery' : 'Fast-Failing to Backup'}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Active Engine Tier</span>
                  <span className="text-slate-200 font-bold block truncate">{circuitStatus.activeModelTier}</span>
                  <span className="text-[10px] text-slate-500 block">Automatic model cascade</span>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Consecutive Failures</span>
                  <span className="text-amber-400 font-bold text-sm block">
                    {circuitStatus.consecutiveFailures} / {circuitStatus.failureThreshold} (Threshold)
                  </span>
                  <span className="text-[10px] text-slate-500 block">Tripped {circuitStatus.trippedCount} times</span>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Success / Total Calls</span>
                  <span className="text-emerald-400 font-bold text-sm block">
                    {circuitStatus.successCount} / {circuitStatus.totalRequests}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {circuitStatus.totalRequests > 0 ? `${Math.round((circuitStatus.successCount / circuitStatus.totalRequests) * 100)}% reliability` : '100% reliability'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">Loading circuit status telemetry...</div>
            )}

            {/* Model Cascade Architecture Diagram */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
              <span className="text-[11px] font-bold text-slate-300 block uppercase">
                3-Tier Resilience & Zero-503 Guarantee Flow
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-lg space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold block">1. PRIMARY MODEL</span>
                  <span className="text-slate-200 block font-semibold">gemini-3.8-flash</span>
                  <p className="text-[10px] text-slate-400 font-sans">Full AST resolution evaluation. Retried with 350ms backoff on transient 503 spikes.</p>
                </div>
                <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-lg space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold block">2. FAST BACKUP MODEL</span>
                  <span className="text-slate-200 block font-semibold">gemini-3.1-flash-lite</span>
                  <p className="text-[10px] text-slate-400 font-sans">Low-latency secondary fallback when primary experiences rate-limits or 503 high demand.</p>
                </div>
                <div className="p-3 bg-slate-900 border border-cyan-500/30 rounded-lg space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold block">3. DETERMINISTIC ENGINE</span>
                  <span className="text-slate-200 block font-semibold">ARE-rLOGIC Authority</span>
                  <p className="text-[10px] text-slate-400 font-sans">100% offline mathematical SAT refutation solver with cryptographic evidence receipts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
