import React, { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, UploadCloud, Copy, Check, FileCode, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Hash, Eye, Play, ArrowRight, Layers, Sparkles, Database, Package, GitPullRequest } from 'lucide-react';

export interface EvidencePassport {
  $schema?: string;
  passportSha256: string;
  claimSha256: string;
  evidenceReceiptSha256: string;
  evidenceSummarySha256: string;
  primaryOutputSha256: string;
  exactNormalizedAgreement: boolean;
  proofRoute: 'formal computation' | 'structured data' | 'source provenance' | 'runtime readback' | 'human judgment' | 'unknown';
  proofRouteInstruction: string;
  automaticFallback: boolean;
  note: string;
  timestamp: string;
  targetSpace: string;
  tags: string[];
}

interface SovereignObservatoryProps {
  onExportToHf?: (actionType: 'sovereign_passport' | 'css_evidence_bound' | 'arena_match', title: string, payload: any, defaultRepo?: string) => void;
}

const CANONICAL_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://huggingface.co/spaces/Thorsu/sovereign-evidence-observatory/raw/main/evidence-passport.v1.schema.json",
  "title": "EvidencePassport",
  "description": "Formal schema for cryptographic provenance, factuality, and hallucination bounds defined by Sovereign Evidence Observatory (Thorsu).",
  "type": "object",
  "required": [
    "passportSha256",
    "claimSha256",
    "evidenceReceiptSha256",
    "evidenceSummarySha256",
    "primaryOutputSha256",
    "exactNormalizedAgreement",
    "proofRoute"
  ],
  "properties": {
    "passportSha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 of canonical normalized passport payload."
    },
    "claimSha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 of the factual proposition or invariant hypothesis."
    },
    "evidenceReceiptSha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 of verified execution receipt (rcpt_0x...)."
    },
    "evidenceSummarySha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 of human/referee evidence summary text."
    },
    "primaryOutputSha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 of model primary inference output."
    },
    "exactNormalizedAgreement": {
      "type": "boolean",
      "description": "Whether normalized model output strictly agrees with confirmed truth."
    },
    "proofRoute": {
      "type": "string",
      "enum": [
        "formal computation",
        "structured data",
        "source provenance",
        "runtime readback",
        "human judgment",
        "unknown"
      ]
    },
    "proofRouteInstruction": { "type": "string" },
    "automaticFallback": { "type": "boolean" },
    "note": { "type": "string" }
  }
};

// Client SHA-256 helper
async function sha256Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const SovereignObservatory: React.FC<SovereignObservatoryProps> = ({ onExportToHf }) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'space_embed' | 'schema' | 'passports_ledger'>('generator');

  // Input states for generating an evidence passport
  const [claimText, setClaimText] = useState(
    'Topological sort invariant holds on all weighted DAGs under Davis-Putnam resolution'
  );
  const [receiptHashInput, setReceiptHashInput] = useState(
    'rcpt_0x4a9f2bc88194e631d87f0b5c7a3142e0'
  );
  const [evidenceSummary, setEvidenceSummary] = useState(
    'Defender preserved cycle-freedom invariant; attacker witness failed clause resolution contradiction'
  );
  const [primaryOutput, setPrimaryOutput] = useState(
    'VERIFIED_DETERMINISTIC: Invariant preserved with zero counterexample witness found in AST tree.'
  );
  const [proofRoute, setProofRoute] = useState<'formal computation' | 'structured data' | 'source provenance' | 'runtime readback' | 'human judgment' | 'unknown'>('formal computation');
  const [proofRouteInstruction, setProofRouteInstruction] = useState(
    'Execute backward-chaining resolution check on cycle invariants via ARE MCP referee'
  );
  const [automaticFallback, setAutomaticFallback] = useState(false);
  const [note, setNote] = useState(
    'Anchored in Sovereign Evidence Observatory (Thorsu) and Ouroboros Collective boundary'
  );
  const [exactAgreement, setExactAgreement] = useState(true);

  // Computed passport
  const [passport, setPassport] = useState<EvidencePassport | null>(null);
  const [computing, setComputing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Passport history ledger
  const [ledger, setLedger] = useState<EvidencePassport[]>([]);

  const handleComputePassport = async () => {
    setComputing(true);
    try {
      const claimSha = await sha256Hex(claimText.trim());
      const receiptSha = await sha256Hex(receiptHashInput.trim());
      const summarySha = await sha256Hex(evidenceSummary.trim());
      const outputSha = await sha256Hex(primaryOutput.trim());

      const basis = `${claimSha}:${receiptSha}:${summarySha}:${outputSha}:${proofRoute}:${exactAgreement}`;
      const passportSha = await sha256Hex(basis);

      const newPassport: EvidencePassport = {
        $schema: 'https://huggingface.co/spaces/Thorsu/sovereign-evidence-observatory/raw/main/evidence-passport.v1.schema.json',
        passportSha256: passportSha,
        claimSha256: claimSha,
        evidenceReceiptSha256: receiptSha,
        evidenceSummarySha256: summarySha,
        primaryOutputSha256: outputSha,
        exactNormalizedAgreement: exactAgreement,
        proofRoute,
        proofRouteInstruction,
        automaticFallback,
        note,
        timestamp: new Date().toISOString(),
        targetSpace: 'Thorsu/sovereign-evidence-observatory',
        tags: [
          'factuality',
          'hallucination-detection',
          'provenance',
          'uncertainty',
          'llm-evaluation',
          'agent-operations'
        ]
      };

      setPassport(newPassport);
      setLedger(prev => [newPassport, ...prev.slice(0, 19)]);
    } catch (e) {
      console.error('Passport generation error:', e);
    } finally {
      setComputing(false);
    }
  };

  useEffect(() => {
    handleComputePassport();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadJson = () => {
    if (!passport) return;
    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-passport-${passport.passportSha256.slice(0, 12)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPassport = () => {
    if (!passport || !onExportToHf) return;
    onExportToHf(
      'sovereign_passport' as any,
      `Evidence Passport: ${passport.passportSha256.slice(0, 16)} (${passport.proofRoute})`,
      passport,
      'Thorsu/sovereign-evidence-observatory'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
                  Hugging Face Space & Dataset
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-300 font-mono font-semibold">
                  Thorsu/sovereign-evidence-observatory
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-bold">
                  v1.schema.json
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mt-0.5">
                Sovereign Evidence Observatory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
                Cryptographic Evidence Passports, Hallucination Detection, Provenance Verification, and Deterministic LLM Evaluation hosted at Hugging Face Space <code className="text-amber-300 font-mono">Thorsu/sovereign-evidence-observatory</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <a
              href="https://huggingface.co/spaces/Thorsu/sovereign-evidence-observatory"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 font-semibold rounded-xl border border-slate-800 transition-colors text-xs min-h-[44px]"
            >
              <span>Open HF Space</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://huggingface.co/datasets/Thorsu/sovereign-evidence-observatory"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-800 transition-colors text-xs min-h-[44px]"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>HF Dataset</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>

            {onExportToHf && passport && (
              <button
                onClick={handleExportPassport}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors shadow-md shadow-amber-500/15 text-xs min-h-[44px]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Export to Observatory</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Navigation Ribbon (Touch-Scrollable) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto touch-scroll-x scrollbar-none">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
              activeTab === 'generator'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Passport Generator & Hasher</span>
          </button>

          <button
            onClick={() => setActiveTab('space_embed')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
              activeTab === 'space_embed'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Live HF Space Viewer</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
              activeTab === 'schema'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>v1.schema.json Specification</span>
          </button>

          <button
            onClick={() => setActiveTab('passports_ledger')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] shrink-0 ${
              activeTab === 'passports_ledger'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Audit Ledger ({ledger.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PASSPORT GENERATOR & HASHER */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Evidence Passport Inputs</span>
              </h3>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                Schema: Draft 2020-12
              </span>
            </div>

            {/* Quick Evidence Presets */}
            <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Preset Evidence Ledgers & Packages:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setClaimText('P2P Foundation Bitcoin announcement: Wayback 2009 capture and SNI reproduction preserve one origin; live route is link-drifted.');
                    setReceiptHashInput('rcpt_0x' + 'MIHA_2026_10_01_P2P_FOUNDATION_ORIGIN_01'.toLowerCase().padEnd(32, '0').slice(0, 32));
                    setEvidenceSummary('Wayback 20090221 and SNI thread1 share one normalized P2P origin. Display-name attribution does not establish cryptographic real-person identity; No Source, No Path.');
                    setPrimaryOutput('VERIFIED_PROVENANCE: Single origin preservation confirmed; live URL drift verified; candidate identity dead-end logged.');
                    setProofRoute('source provenance');
                    setProofRouteInstruction('Traverse MIHA dependency DAG; collapse dependent archival preservations into one origin cluster');
                    setExactAgreement(true);
                    setNote('MIHA-2026-10-01-P2P-FOUNDATION-ORIGIN-01 ledger entry for ouroboroscollective/satoshi-evidence-ledger');
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-mono text-[11px] rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <FileCode className="w-3 h-3 text-amber-400" />
                  <span>P2P Foundation Origin</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setClaimText('P2P Research 2009 announcement: archived list rendering & raw copy collapse to message-id 4993519e.8080300@gmx.com; historical domain drifted.');
                    setReceiptHashInput('rcpt_0x' + 'MIHA_2026_10_01_P2P_RESEARCH_ORIGIN_02'.toLowerCase().padEnd(32, '0').slice(0, 32));
                    setEvidenceSummary('Archived rendering and raw txt share identical message ID and body. Historical listcultures.org route redirects to unrelated page; attribution remains distinct from legal identity.');
                    setPrimaryOutput('VERIFIED_PROVENANCE: Dependent archives collapsed into one origin line; link drift recorded in Notion readback.');
                    setProofRoute('source provenance');
                    setProofRouteInstruction('Verify RFC822 message-id parity against diyhpl.us archive copies and readback verification');
                    setExactAgreement(true);
                    setNote('MIHA-2026-10-01-P2P-RESEARCH-ORIGIN-02 ledger entry');
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-mono text-[11px] rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <FileCode className="w-3 h-3 text-amber-400" />
                  <span>P2P Research Origin</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setClaimText('ARE-PACKAGE-V2: EUDI Wallet Backend security hardening invariants, HSM UTC validity oracle, and deterministic codec regressions pass zero-leak boundary.');
                    setReceiptHashInput('rcpt_0x73b102838963f764d8523e8bf94413abde4740bcf48a76f9a10a9640ea6b78bc');
                    setEvidenceSummary('Package pkg_2c7f8f726de9223d45 binds 6 hermetic artifacts with content hash 73b102838963... Fail-closed source invariants and mutation controls passed.');
                    setPrimaryOutput('WALLET_KEY_BOUNDARY_GATE_PASS: All security oracles and mutation controls killed; zero token state retained.');
                    setProofRoute('runtime readback');
                    setProofRouteInstruction('Execute restricted container JVM regression with digest-pinned Kotlin 2.4.10 and Temurin-25');
                    setExactAgreement(true);
                    setNote('ARE-PACKAGE-V2 manifest pkg_2c7f8f726de9223d45 from OuroborosCollective/de-eudi-wallet-backend');
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-mono text-[11px] rounded-lg border border-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <Package className="w-3 h-3 text-amber-400" />
                  <span>ARE-PACKAGE-V2 Wallet Manifest</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Claim / Proposition */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Verified Claim / Invariant Hypothesis:</span>
                  <span className="text-[10px] font-mono text-slate-500">claimSha256 input</span>
                </label>
                <textarea
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Evidence Receipt */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Execution Evidence Receipt (rcpt_0x...):</span>
                  <span className="text-[10px] font-mono text-slate-500">evidenceReceiptSha256</span>
                </label>
                <input
                  type="text"
                  value={receiptHashInput}
                  onChange={(e) => setReceiptHashInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs min-h-[44px]"
                />
              </div>

              {/* Evidence Summary */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Referee / Evidence Summary:</span>
                  <span className="text-[10px] font-mono text-slate-500">evidenceSummarySha256</span>
                </label>
                <textarea
                  value={evidenceSummary}
                  onChange={(e) => setEvidenceSummary(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Primary Output */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Model Primary Output:</span>
                  <span className="text-[10px] font-mono text-slate-500">primaryOutputSha256</span>
                </label>
                <textarea
                  value={primaryOutput}
                  onChange={(e) => setPrimaryOutput(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Proof Route & Exact Agreement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Proof Route (Enum):</label>
                  <select
                    value={proofRoute}
                    onChange={(e) => setProofRoute(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs min-h-[44px]"
                  >
                    <option value="formal computation">formal computation</option>
                    <option value="structured data">structured data</option>
                    <option value="source provenance">source provenance</option>
                    <option value="runtime readback">runtime readback</option>
                    <option value="human judgment">human judgment</option>
                    <option value="unknown">unknown</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Exact Normalized Agreement:</label>
                  <button
                    type="button"
                    onClick={() => setExactAgreement(prev => !prev)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between min-h-[44px] transition-colors ${
                      exactAgreement
                        ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                    }`}
                  >
                    <span>{exactAgreement ? 'Strict Agreement (TRUE)' : 'Discrepancy (FALSE)'}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${exactAgreement ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  onClick={handleComputePassport}
                  disabled={computing}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-amber-500/15 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <RefreshCw className={`w-4 h-4 ${computing ? 'animate-spin' : ''}`} />
                  <span>Compute Cryptographic Evidence Passport</span>
                </button>
              </div>
            </div>
          </div>

          {/* Result Column: Cryptographic Passport Card */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified Evidence Passport</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDownloadJson}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors min-h-[36px]"
                >
                  Download JSON
                </button>
                {passport && (
                  <button
                    onClick={() => handleCopy(JSON.stringify(passport, null, 2), 'full_passport')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg min-h-[36px] flex items-center justify-center"
                    title="Copy Passport JSON"
                  >
                    {copiedKey === 'full_passport' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {passport ? (
              <div className="space-y-4 text-xs">
                {/* Master Passport Hash Banner */}
                <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/40 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                    Canonical Passport SHA-256 Hash
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-bold text-amber-300 break-all">
                      {passport.passportSha256}
                    </p>
                    <button
                      onClick={() => handleCopy(passport.passportSha256, 'passport_hash')}
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-400 shrink-0"
                    >
                      {copiedKey === 'passport_hash' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sub-Hashes Breakdown */}
                <div className="space-y-2 font-mono">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 block uppercase">claimSha256:</span>
                    <p className="text-slate-300 break-all text-[11px]">{passport.claimSha256}</p>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 block uppercase">evidenceReceiptSha256:</span>
                    <p className="text-slate-300 break-all text-[11px]">{passport.evidenceReceiptSha256}</p>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 block uppercase">evidenceSummarySha256:</span>
                    <p className="text-slate-300 break-all text-[11px]">{passport.evidenceSummarySha256}</p>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 block uppercase">primaryOutputSha256:</span>
                    <p className="text-slate-300 break-all text-[11px]">{passport.primaryOutputSha256}</p>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-mono">PROOF ROUTE</span>
                    <span className="font-semibold text-amber-300">{passport.proofRoute}</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-mono">AGREEMENT STATUS</span>
                    <span className="font-semibold text-emerald-400">Strict Agreement (100%)</span>
                  </div>
                </div>

                {/* Target Hugging Face Space & Tags */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider font-bold">
                    Target Hugging Face Anchor:
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <a
                      href="https://huggingface.co/spaces/Thorsu/sovereign-evidence-observatory"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>Thorsu/sovereign-evidence-observatory</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-slate-500">Draft 2020-12</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {passport.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-400 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Computing verified evidence passport...
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE HF SPACE VIEWER */}
      {activeTab === 'space_embed' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-amber-400" />
                <span>Hugging Face Space: Thorsu/sovereign-evidence-observatory</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct view into the sovereign evidence observatory hosted at huggingface.co.
              </p>
            </div>

            <a
              href="https://huggingface.co/spaces/Thorsu/sovereign-evidence-observatory"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0 min-h-[44px]"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="w-full h-[650px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
            <iframe
              src="https://thorsu-sovereign-evidence-observatory.hf.space"
              title="Sovereign Evidence Observatory HF Space"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      )}

      {/* TAB 3: SCHEMA SPECIFICATION */}
      {activeTab === 'schema' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <span>evidence-passport.v1.schema.json (JSON Schema Draft 2020-12)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official formal contract specification from repository Thorsu/sovereign-evidence-observatory.
              </p>
            </div>

            <button
              onClick={() => handleCopy(JSON.stringify(CANONICAL_SCHEMA, null, 2), 'schema_copy')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              {copiedKey === 'schema_copy' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>Copy Schema</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300/90 overflow-x-auto touch-scroll-x max-h-[500px] overflow-y-auto touch-scroll-y">
            {JSON.stringify(CANONICAL_SCHEMA, null, 2)}
          </pre>
        </div>
      )}

      {/* TAB 4: PASSPORTS LEDGER */}
      {activeTab === 'passports_ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Hash className="w-5 h-5 text-amber-400" />
                <span>Cryptographic Evidence Passports Ledger</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit history of passports minted during current session for formal verification.
              </p>
            </div>
          </div>

          {ledger.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No passports minted yet. Generate a passport in Tab 1.
            </div>
          ) : (
            <div className="space-y-3">
              {ledger.map((p, idx) => (
                <div
                  key={p.passportSha256 + idx}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 font-mono font-bold flex items-center justify-center text-[10px] border border-slate-800">
                        #{ledger.length - idx}
                      </span>
                      <span className="font-mono font-bold text-amber-300">
                        {p.passportSha256.slice(0, 20)}...
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                        {p.proofRoute}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(p.timestamp).toLocaleTimeString()}
                      </span>
                      {onExportToHf && (
                        <button
                          onClick={() => onExportToHf('sovereign_passport' as any, `Evidence Passport: ${p.passportSha256.slice(0, 12)}`, p, 'Thorsu/sovereign-evidence-observatory')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-[11px] border border-slate-700 min-h-[36px]"
                        >
                          Export to HF
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-900 truncate">
                    Claim: {claimText}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
