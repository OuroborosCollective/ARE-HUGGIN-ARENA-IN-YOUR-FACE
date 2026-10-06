import React, { useState, useEffect } from 'react';
import { Database, Server, Layers, Sparkles, MessageSquare, Cpu, Code2, BarChart3, Swords, Key, ShieldCheck, ExternalLink, UploadCloud, Smartphone, Monitor, Tablet, Menu, X, ChevronRight, CheckCircle2, Eye, Compass, Sun, Moon, User, Workflow } from 'lucide-react';
import { HubExplorer } from './components/HubExplorer';
import { DatasetVisualizer } from './components/DatasetVisualizer';
import { McpInspector } from './components/McpInspector';
import { PipelineOptimizer } from './components/PipelineOptimizer';
import { SyntheticGenerator } from './components/SyntheticGenerator';
import { CopilotChat } from './components/CopilotChat';
import { LogicArena } from './components/LogicArena';
import { CssInvariantValidator } from './components/CssInvariantValidator';
import { SovereignObservatory } from './components/SovereignObservatory';
import { GenkitFlowDashboard } from './components/GenkitFlowDashboard';
import { McpConfigModal } from './components/McpConfigModal';
import { ScriptExportModal } from './components/ScriptExportModal';
import { HfCredentialsModal, HfCredentials } from './components/HfCredentialsModal';
import { HfExportModal } from './components/HfExportModal';
import { RuntimeTestSuite } from './components/RuntimeTestSuite';
import { UserAccountModal } from './components/UserAccountModal';
import { AdminModel3DUploaderModal } from './components/AdminModel3DUploaderModal';
import { Box, Crown } from 'lucide-react';
import { useFirebaseAuth } from './context/FirebaseAuthContext';
import { useDeviceScreen, useThemePreference, ThemeMode } from './hooks/useDeviceScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'hub' | 'visualizer' | 'mcp' | 'pipeline' | 'synthetic' | 'chat' | 'arena' | 'css_invariants' | 'observatory' | 'genkit'>('hub');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isTestSuiteModalOpen, setIsTestSuiteModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdmin3DModalOpen, setIsAdmin3DModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDeviceDiagnostics, setShowDeviceDiagnostics] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState('ouroboroscollective/evidence-bound-css');
  const [datasetForVisualizer, setDatasetForVisualizer] = useState<any | null>(null);

  // Firebase Auth State
  const { user } = useFirebaseAuth();

  // Device Screen & Theme Detection Hook
  const screen = useDeviceScreen();
  const { themeMode, setThemeMode, effectiveTheme, systemTheme, isSystem } = useThemePreference();

  // Hugging Face Hub Credentials & Auth State
  const [hfCredentials, setHfCredentials] = useState<HfCredentials>(() => {
    try {
      const saved = localStorage.getItem('hf_studio_credentials');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved HF credentials:', e);
    }
    return {
      token: '',
      username: 'ouroboroscollective',
      targetRepo: 'ouroboroscollective/evidence-bound-css',
      defaultBranch: 'main',
      isValidated: false,
      statusMessage: 'Public reader & export mode'
    };
  });
  const [isHfCredsModalOpen, setIsHfCredsModalOpen] = useState(false);

  // Universal HF Action Export Modal State
  const [hfExportConfig, setHfExportConfig] = useState<{
    isOpen: boolean;
    actionType: 'arena_match' | 'arena_tournament' | 'pipeline_optimization' | 'synthetic_dataset' | 'auto_tagging' | 'dataset_diff' | 'css_evidence_bound' | 'sovereign_passport';
    title: string;
    payload: any;
    defaultTargetRepo?: string;
  }>({
    isOpen: false,
    actionType: 'arena_match',
    title: '',
    payload: null,
    defaultTargetRepo: 'ouroboroscollective/evidence-bound-css'
  });

  const handleSaveHfCredentials = (newCreds: HfCredentials) => {
    setHfCredentials(newCreds);
    try {
      localStorage.setItem('hf_studio_credentials', JSON.stringify(newCreds));
    } catch (e) {
      console.warn('Failed to save HF credentials:', e);
    }
  };

  const handleOpenHfExport = (
    actionType: 'arena_match' | 'arena_tournament' | 'pipeline_optimization' | 'synthetic_dataset' | 'auto_tagging' | 'dataset_diff' | 'css_evidence_bound' | 'sovereign_passport',
    title: string,
    payload: any,
    defaultTargetRepo?: string
  ) => {
    setHfExportConfig({
      isOpen: true,
      actionType,
      title,
      payload,
      defaultTargetRepo: defaultTargetRepo || (actionType === 'sovereign_passport' ? 'Thorsu/sovereign-evidence-observatory' : (hfCredentials.targetRepo || 'ouroboroscollective/evidence-bound-css'))
    });
  };

  // Load selected dataset details for visualizer
  useEffect(() => {
    fetch('/api/datasets/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: selectedDatasetId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.dataset) {
          setDatasetForVisualizer(data.dataset);
        }
      })
      .catch(console.error);
  }, [selectedDatasetId]);

  const handleSelectForPipeline = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setActiveTab('pipeline');
  };

  const handleSelectForVisualizer = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setActiveTab('visualizer');
  };

  const handleOpenScriptExport = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setIsScriptModalOpen(true);
  };

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-200 ${effectiveTheme === 'light' ? 'bg-slate-100 text-slate-900 selection:bg-amber-400 selection:text-slate-900' : 'bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950'}`}>
      {/* Top Bar: Zone 1 (Brand), Zone 2 (Nav Links), Zone 3 (Actions & Device Info) */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${effectiveTheme === 'light' ? 'bg-white/95 border-slate-200 shadow-sm' : 'bg-slate-950/95 border-slate-800/80'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Zone 1: Single text wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('hub');
            }}
            className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-100 tracking-tight hover:text-amber-300 transition-colors shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/10 shrink-0">
              HF
            </div>
            <span className={`hidden xs:inline sm:inline truncate ${effectiveTheme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
              {screen.isMobile ? 'HF MCP Studio' : 'Hugging Face MCP Data Studio'}
            </span>
          </a>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'hub'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Hub Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'visualizer'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics & Diffs</span>
            </button>

            <button
              onClick={() => setActiveTab('arena')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'arena'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>ARE Logic Arena</span>
            </button>

            <button
              onClick={() => setActiveTab('observatory')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'observatory'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Observatory</span>
            </button>

            <button
              onClick={() => setActiveTab('css_invariants')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'css_invariants'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CSS Invariants</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'pipeline'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('genkit')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'genkit'
                  ? 'bg-cyan-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-cyan-400/80 hover:text-cyan-300'
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-cyan-300" />
              <span>Genkit Flows</span>
            </button>

            <button
              onClick={() => setActiveTab('synthetic')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'synthetic'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthetic</span>
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'mcp'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>MCP Protocol</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Copilot</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Screen Status */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Automatic / User Theme Mode Switcher */}
            <button
              onClick={() => {
                const nextMode: ThemeMode = themeMode === 'system' ? 'dark' : themeMode === 'dark' ? 'light' : 'system';
                setThemeMode(nextMode);
              }}
              title={`Theme Setting: ${themeMode === 'system' ? `Auto (Device: ${systemTheme})` : themeMode === 'dark' ? 'Dark' : 'Light'}. Tap to toggle.`}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 min-h-[36px] ${
                effectiveTheme === 'light'
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
              }`}
            >
              {themeMode === 'system' ? (
                <Monitor className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : effectiveTheme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {themeMode === 'system' ? `Auto (${systemTheme})` : themeMode === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>

            {/* Real-Time Device Screen Detection Badge */}
            <button
              onClick={() => setShowDeviceDiagnostics(prev => !prev)}
              title={`Device: ${screen.screenLabel}. Touch: ${screen.isTouchDevice ? 'Enabled (min 44px targets active)' : 'Mouse'}. System Theme: ${screen.systemTheme}. Tap for diagnostics.`}
              className={`px-2.5 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 min-h-[36px] text-[11px] font-mono ${
                effectiveTheme === 'light'
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {screen.isMobile ? (
                <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : screen.isTablet ? (
                <Tablet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="hidden md:inline font-semibold">{screen.width}px</span>
              <span className={`w-1.5 h-1.5 rounded-full ${screen.isTouchDevice ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </button>

            {/* Hugging Face Hub Credentials & Auth Config */}
            <button
              onClick={() => setIsHfCredsModalOpen(true)}
              title="Configure Hugging Face Token / Write Key / Login Credentials"
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 shadow-sm min-h-[36px]"
            >
              <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">HF Auth</span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  hfCredentials.token ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400/50'
                }`}
                title={hfCredentials.token ? 'HF Write Key Configured' : 'Public Reader Mode (Click to set Login Key)'}
              />
            </button>

            {/* Firebase Account & Saved Datasets Hub */}
            <button
              onClick={() => setIsAccountModalOpen(true)}
              title={user ? `Logged in as ${user.displayName || user.email}` : 'Sign in with Google to save datasets and connect Hugging Face projects'}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 shadow-sm min-h-[36px]"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Account'}
                  className="w-4 h-4 rounded-full object-cover border border-amber-400 shrink-0"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="hidden sm:inline font-mono font-semibold">
                {user ? (user.displayName?.split(' ')[0] || 'Account') : 'Account'}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  user ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                }`}
              />
            </button>

            {/* Direct Link to Thorsu Sovereign Evidence Observatory on HF Space */}
            <a
              href="https://huggingface.co/spaces/Thorsu/sovereign-evidence-observatory"
              target="_blank"
              rel="noopener noreferrer"
              title="View Thorsu/sovereign-evidence-observatory directly on Hugging Face Spaces"
              className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-mono font-semibold rounded-xl border border-slate-800 transition-colors min-h-[36px]"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>observatory</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>

            <button
              onClick={() => setIsAdmin3DModalOpen(true)}
              title="Admin 3D Studio: Upload & manage custom .glb 3D character models for the Arena"
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition-colors flex items-center gap-1.5 shadow-sm min-h-[36px]"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">3D Models</span>
            </button>

            <button
              onClick={() => setIsTestSuiteModalOpen(true)}
              title="Run Automated Regression Test Suite & Invariant Checks"
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 min-h-[36px]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Tests</span>
            </button>

            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="hidden sm:flex px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-800 transition-colors items-center gap-1.5 min-h-[36px]"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline">MCP Protocol</span>
            </button>

            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md shadow-amber-500/10 flex items-center gap-1.5 min-h-[36px] shrink-0"
            >
              <Code2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Script</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Horizontal Touch-Scrollable Navigation Ribbon */}
        <div className="lg:hidden border-t border-slate-900 bg-slate-950/95 overflow-x-auto touch-scroll-x scrollbar-none px-2 py-2">
          <div className="flex items-center gap-1.5 w-max">
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'hub'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Hub Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'visualizer'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Analytics & Diffs</span>
            </button>

            <button
              onClick={() => setActiveTab('arena')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'arena'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Swords className="w-4 h-4 shrink-0" />
              <span>ARE Logic Arena</span>
            </button>

            <button
              onClick={() => setActiveTab('observatory')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'observatory'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span>Observatory</span>
            </button>

            <button
              onClick={() => setActiveTab('css_invariants')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'css_invariants'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>CSS Invariants</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'pipeline'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('genkit')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'genkit'
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-cyan-300 hover:text-white border border-cyan-500/30'
              }`}
            >
              <Workflow className="w-4 h-4 shrink-0 text-cyan-300" />
              <span>Genkit Flows</span>
            </button>

            <button
              onClick={() => setActiveTab('synthetic')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'synthetic'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Synthetic</span>
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'mcp'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>MCP Protocol</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Data Copilot</span>
            </button>
          </div>
        </div>

        {/* Device Screen Diagnostics Floating Banner (Toggleable) */}
        {showDeviceDiagnostics && (
          <div className="bg-slate-900/95 border-b border-amber-500/30 px-4 py-2.5 text-xs text-slate-300 flex items-center justify-between gap-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-amber-400 font-bold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Screen Engine:</span>
              </span>
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-slate-200">
                {screen.deviceType.toUpperCase()} ({screen.width}×{screen.height}px, {screen.orientation})
              </span>
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Touchpoint Target: {screen.isTouchDevice || screen.isMobile ? '44px+ compliant' : '36px standard'}</span>
              </span>

              {/* Theme Preference Quick Controls */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono">
                <span className="text-[10px] text-slate-400 px-1">Theme Setting:</span>
                <button
                  onClick={() => setThemeMode('system')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    themeMode === 'system'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Auto ({systemTheme})
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setThemeMode('light')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    themeMode === 'light'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Light
                </button>
              </div>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Momentum touch scrolling & fluid responsive boundaries active.
              </span>
            </div>
            <button
              onClick={() => setShowDeviceDiagnostics(false)}
              className="text-slate-400 hover:text-slate-200 p-1 min-h-[36px] flex items-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content View Container with Touch-To-Scroll */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 touch-scroll-y flex-1 w-full pb-28 sm:pb-12">
        {activeTab === 'hub' && (
          <HubExplorer
            onSelectForPipeline={handleSelectForPipeline}
            onSelectForVisualizer={handleSelectForVisualizer}
            onOpenScriptExport={handleOpenScriptExport}
            onExportToHf={handleOpenHfExport}
            onNavigateToArena={() => setActiveTab('arena')}
          />
        )}

        {activeTab === 'visualizer' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  Dataset Visualization & Distribution Tools
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interactive sequence length histograms, feature completeness meters, token estimations, and semantic version diff viewer.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-mono">Active Dataset:</span>
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-xs font-bold text-amber-300 font-mono">
                    {selectedDatasetId}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDatasetId);
                      const btn = document.getElementById('copy-dataset-id-btn');
                      if (btn) btn.innerText = 'Copied!';
                      setTimeout(() => { if (btn) btn.innerText = 'Copy ID'; }, 2000);
                    }}
                    id="copy-dataset-id-btn"
                    title="Copy full Hugging Face dataset path"
                    className="ml-1 text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded border border-slate-700/80 transition-colors flex items-center gap-1"
                  >
                    <span>Copy ID</span>
                  </button>
                </div>
                <a
                  href={`https://huggingface.co/datasets/${selectedDatasetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-amber-400 hover:underline font-mono px-2.5 py-1.5 bg-slate-950 rounded-lg border border-slate-800 min-h-[36px]"
                >
                  <span>Open on HF</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {datasetForVisualizer ? (
              <DatasetVisualizer dataset={datasetForVisualizer} onExportToHf={handleOpenHfExport} />
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm bg-slate-900 rounded-2xl border border-slate-800">
                Loading dataset visualization metrics...
              </div>
            )}
          </div>
        )}

        {/* Suggestion 1: CSS Invariant & Evidence-Bound Validator */}
        {activeTab === 'css_invariants' && (
          <CssInvariantValidator onExportToHf={handleOpenHfExport} />
        )}

        {/* Sovereign Evidence Observatory (Thorsu/sovereign-evidence-observatory) */}
        {activeTab === 'observatory' && (
          <SovereignObservatory onExportToHf={handleOpenHfExport} />
        )}

        {activeTab === 'arena' && (
          <LogicArena
            onExportToHf={handleOpenHfExport}
            onSelectForVisualizer={handleSelectForVisualizer}
            onSelectForPipeline={handleSelectForPipeline}
          />
        )}

        {activeTab === 'mcp' && <McpInspector />}

        {activeTab === 'pipeline' && (
          <PipelineOptimizer
            initialDatasetId={selectedDatasetId}
            onOpenScriptExport={handleOpenScriptExport}
            onExportToHf={handleOpenHfExport}
          />
        )}

        {activeTab === 'synthetic' && <SyntheticGenerator onExportToHf={handleOpenHfExport} />}

        {activeTab === 'chat' && <CopilotChat />}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (1-Thumb Touch Friendly) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 flex items-center justify-around px-1 py-1 safe-bottom shadow-2xl">
        <button
          onClick={() => setActiveTab('hub')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-lg transition-colors ${
            activeTab === 'hub' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('visualizer')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-lg transition-colors ${
            activeTab === 'visualizer' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('observatory')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-lg transition-colors ${
            activeTab === 'observatory' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Observatory</span>
        </button>

        <button
          onClick={() => setActiveTab('arena')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-lg transition-colors ${
            activeTab === 'arena' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Swords className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Arena</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-lg transition-colors text-slate-400 hover:text-slate-200"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>

      {/* Mobile "More" Drawer / Bottom Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 backdrop-blur-sm sm:hidden animate-in fade-in duration-150">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto touch-scroll-y shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  HF
                </div>
                <h3 className="text-sm font-bold text-slate-100">All Modules & Tools</h3>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-200 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => { setActiveTab('css_invariants'); setIsMobileMenuOpen(false); }}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center gap-2.5 min-h-[48px] hover:border-amber-500/50"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200">CSS Invariants</span>
              </button>

              <button
                onClick={() => { setActiveTab('pipeline'); setIsMobileMenuOpen(false); }}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center gap-2.5 min-h-[48px] hover:border-amber-500/50"
              >
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200">Pipeline Optimizer</span>
              </button>

              <button
                onClick={() => { setActiveTab('synthetic'); setIsMobileMenuOpen(false); }}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center gap-2.5 min-h-[48px] hover:border-amber-500/50"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200">Synthetic Generator</span>
              </button>

              <button
                onClick={() => { setActiveTab('mcp'); setIsMobileMenuOpen(false); }}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center gap-2.5 min-h-[48px] hover:border-amber-500/50"
              >
                <Server className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200">MCP Protocol</span>
              </button>

              <button
                onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center gap-2.5 min-h-[48px] hover:border-amber-500/50"
              >
                <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200">Data Copilot</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                onClick={() => { setIsHfCredsModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center justify-between min-h-[48px] text-xs"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-slate-200">Configure HF Write Key / Auth</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => { setIsConfigModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center justify-between min-h-[48px] text-xs"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-slate-200">MCP Client Configuration</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => { setIsScriptModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-left flex items-center justify-between min-h-[48px] text-xs"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-slate-200">Export Python Training Script</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mb-14 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
            <span>Hugging Face MCP Data Studio</span>
            <span aria-hidden="true">·</span>
            <span>Observatory: Thorsu/sovereign-evidence-observatory</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400/80 font-mono">{screen.screenLabel}</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button onClick={() => setActiveTab('hub')} className="hover:text-slate-300 transition-colors min-h-[36px] flex items-center">
              HF Hub
            </button>
            <button onClick={() => setActiveTab('visualizer')} className="hover:text-slate-300 transition-colors min-h-[36px] flex items-center">
              Analytics
            </button>
            <button onClick={() => setActiveTab('observatory')} className="hover:text-slate-300 transition-colors min-h-[36px] flex items-center text-amber-300">
              Observatory
            </button>
            <button onClick={() => setActiveTab('css_invariants')} className="hover:text-slate-300 transition-colors min-h-[36px] flex items-center">
              Invariants
            </button>
            <button onClick={() => setActiveTab('pipeline')} className="hover:text-slate-300 transition-colors min-h-[36px] flex items-center">
              Pipeline
            </button>
            <button onClick={() => setIsHfCredsModalOpen(true)} className="hover:text-slate-300 transition-colors text-amber-400 min-h-[36px] flex items-center">
              HF Auth
            </button>
            <button onClick={() => setIsConfigModalOpen(true)} className="hover:text-slate-300 transition-colors min-h-[36px] flex items-center">
              MCP Config
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <McpConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />

      <ScriptExportModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        datasetId={selectedDatasetId}
      />

      {/* HF Hub Authentication & Credentials Modal */}
      <HfCredentialsModal
        isOpen={isHfCredsModalOpen}
        onClose={() => setIsHfCredsModalOpen(false)}
        credentials={hfCredentials}
        onSaveCredentials={handleSaveHfCredentials}
      />

      {/* Universal HF Action Export Modal */}
      <HfExportModal
        isOpen={hfExportConfig.isOpen}
        onClose={() => setHfExportConfig(prev => ({ ...prev, isOpen: false }))}
        actionType={hfExportConfig.actionType}
        title={hfExportConfig.title}
        payload={hfExportConfig.payload}
        defaultTargetRepo={hfExportConfig.defaultTargetRepo}
        credentials={hfCredentials}
        onOpenCredentials={() => setIsHfCredsModalOpen(true)}
      />

      {/* App Automated Regression Test Suite Modal */}
      {isTestSuiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <RuntimeTestSuite onClose={() => setIsTestSuiteModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Admin 3D GLB Model Uploader & Studio Modal */}
      <AdminModel3DUploaderModal
        isOpen={isAdmin3DModalOpen}
        onClose={() => setIsAdmin3DModalOpen(false)}
        onModelUploaded={() => {}}
      />

      {/* Firebase User Account & Connected Projects Hub Modal */}
      <UserAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onExportToHf={handleOpenHfExport as any}
      />
    </div>
  );
}
