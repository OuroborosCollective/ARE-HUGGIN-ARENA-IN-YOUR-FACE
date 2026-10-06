import React, { useState, useId } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Sparkles, UploadCloud, RefreshCw, Layers, Copy, Check, ExternalLink, Code2, Sliders, Smartphone } from 'lucide-react';

interface CssInvariantValidatorProps {
  onExportToHf?: (actionType: 'css_evidence_bound', title: string, payload: any, defaultRepo?: string) => void;
}

interface InvariantContract {
  id: string;
  name: string;
  category: 'radius' | 'padding' | 'touch' | 'overflow' | 'ratio';
  formula: string;
  description: string;
  cssSelector: string;
  defaultParams: Record<string, number | string | boolean>;
  checkFn: (params: Record<string, any>) => {
    valid: boolean;
    reason: string;
    computedCss: string;
    astProof: string[];
  };
}

export const CssInvariantValidator: React.FC<CssInvariantValidatorProps> = ({ onExportToHf }) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>('nested_radius');
  const [copiedHash, setCopiedHash] = useState(false);

  // Parameter states
  const [outerRadius, setOuterRadius] = useState<number>(20);
  const [padding, setPadding] = useState<number>(8);
  const [innerRadiusInput, setInnerRadiusInput] = useState<number>(12); // user custom inner radius test

  const [outerPadding, setOuterPadding] = useState<number>(24);
  const [innerPadding, setInnerPadding] = useState<number>(16);

  const [touchHeight, setTouchHeight] = useState<number>(48);
  const [touchWidth, setTouchWidth] = useState<number>(120);

  const [boxSizingBorderBox, setBoxSizingBorderBox] = useState<boolean>(true);
  const [overflowHidden, setOverflowHidden] = useState<boolean>(true);

  // Contracts Definition
  const CONTRACTS: InvariantContract[] = [
    {
      id: 'nested_radius',
      name: 'Nested Border Radius Contract',
      category: 'radius',
      formula: 'r_inner = max(0, r_outer - padding)',
      description: 'Nested elements must prevent visual concentric distortion by reducing inner radius by the exact outer padding distance.',
      cssSelector: '.card-container .inner-badge',
      defaultParams: { outerRadius: 20, padding: 8, innerRadiusInput: 12 },
      checkFn: () => {
        const expected = Math.max(0, outerRadius - padding);
        const isValid = innerRadiusInput === expected;
        return {
          valid: isValid,
          reason: isValid
            ? `Exact concentric alignment: r_inner (${innerRadiusInput}px) = r_outer (${outerRadius}px) - pad (${padding}px)`
            : `Distortion violation! r_inner is ${innerRadiusInput}px, but mathematical boundary requires exactly ${expected}px.`,
          computedCss: `.card-container { border-radius: ${outerRadius}px; padding: ${padding}px; }\n.inner-badge { border-radius: ${innerRadiusInput}px; /* Expected: ${expected}px */ }`,
          astProof: [
            `1. Assert outer boundary: B_out = { radius: ${outerRadius}px, pad: ${padding}px }`,
            `2. Compute invariant resolvent: r_target = max(0, ${outerRadius} - ${padding}) = ${expected}px`,
            `3. Compare hypothesis: (innerRadius === ${expected}) => ${isValid ? 'VALID' : 'INVALID'}`,
            `4. Verifier grade: ${isValid ? 'Grade-A Formally Verified' : 'Failed Invariant Check'}`
          ]
        };
      }
    },
    {
      id: 'touch_target_bound',
      name: 'Mobile Touch Target Bound (WCAG AA / Apple HIG)',
      category: 'touch',
      formula: 'min_height >= 44px && min_width >= 44px',
      description: 'All interactive clickable nodes must guarantee physical touch accessibility without accidental touch bleed.',
      cssSelector: '.interactive-touch-target',
      defaultParams: { touchHeight: 48, touchWidth: 120 },
      checkFn: () => {
        const isValid = touchHeight >= 44 && touchWidth >= 44;
        return {
          valid: isValid,
          reason: isValid
            ? `Compliant with mobile touch discipline: height ${touchHeight}px >= 44px, width ${touchWidth}px >= 44px`
            : `Touch target violation: ${touchHeight < 44 ? `height ${touchHeight}px < 44px; ` : ''}${touchWidth < 44 ? `width ${touchWidth}px < 44px` : ''}`,
          computedCss: `.interactive-touch-target {\n  min-height: ${touchHeight}px;\n  min-width: ${touchWidth}px;\n  touch-action: manipulation;\n}`,
          astProof: [
            `1. Evaluate touch surface: S = { h: ${touchHeight}px, w: ${touchWidth}px }`,
            `2. Physical finger contact boundary: T_min = 44px`,
            `3. Inequality assertion: (${touchHeight} >= 44 && ${touchWidth} >= 44) => ${isValid}`,
            `4. Outcome: ${isValid ? 'Compliant Mobile Touchpoint' : 'Sub-44px Touch Point Violation'}`
          ]
        };
      }
    },
    {
      id: 'padding_hierarchy',
      name: 'Container Padding Spatial Balance',
      category: 'padding',
      formula: 'p_outer >= p_inner && min(p) >= 16px',
      description: 'Outer container padding must equal or exceed child gap spacing, preserving visual typographic hierarchy.',
      cssSelector: '.evidence-layout-grid',
      defaultParams: { outerPadding: 24, innerPadding: 16 },
      checkFn: () => {
        const isValid = outerPadding >= innerPadding && innerPadding >= 16;
        return {
          valid: isValid,
          reason: isValid
            ? `Hierarchy preserved: outer (${outerPadding}px) >= inner (${innerPadding}px) >= 16px`
            : `Padding inversion! Outer padding (${outerPadding}px) must be >= inner gap (${innerPadding}px) with baseline 16px`,
          computedCss: `.evidence-layout-grid {\n  padding: ${outerPadding}px;\n  gap: ${innerPadding}px;\n  box-sizing: border-box;\n}`,
          astProof: [
            `1. Constraint 1: p_outer >= p_inner (${outerPadding} >= ${innerPadding}) => ${outerPadding >= innerPadding}`,
            `2. Constraint 2: p_inner >= 16px (${innerPadding} >= 16) => ${innerPadding >= 16}`,
            `3. Conjunction evaluation: C1 AND C2 => ${isValid}`,
            `4. Layout integrity verdict: ${isValid ? 'VERIFIED_SPATIAL_HIERARCHY' : 'SPATIAL_COLLAPSE_DETECTED'}`
          ]
        };
      }
    },
    {
      id: 'zero_overflow',
      name: 'Zero-Overflow Layout Contract',
      category: 'overflow',
      formula: 'box-sizing: border-box && overflow: hidden/clip',
      description: 'Prevents horizontal layout blowout and screen-edge scrollbars on mobile viewport boundaries.',
      cssSelector: '.viewport-bounded-card',
      defaultParams: { boxSizingBorderBox: true, overflowHidden: true },
      checkFn: () => {
        const isValid = boxSizingBorderBox && overflowHidden;
        return {
          valid: isValid,
          reason: isValid
            ? 'Zero horizontal scroll leak: border-box padding containment and clipping enforced.'
            : 'Unbounded layout risk: box-sizing content-box or visible overflow will trigger viewport blowouts.',
          computedCss: `.viewport-bounded-card {\n  box-sizing: ${boxSizingBorderBox ? 'border-box' : 'content-box'};\n  overflow: ${overflowHidden ? 'hidden' : 'visible'};\n  max-width: 100%;\n}`,
          astProof: [
            `1. Viewport width bound: W_elem <= W_viewport`,
            `2. box-sizing constraint: ${boxSizingBorderBox ? 'border-box (SAFE)' : 'content-box (RISK)'}`,
            `3. overflow policy: ${overflowHidden ? 'hidden (BOUNDED)' : 'visible (UNBOUNDED)'}`,
            `4. Mathematical contract: ${isValid ? 'ZERO_OVERFLOW_SATISFIED' : 'OVERFLOW_HAZARD'}`
          ]
        };
      }
    }
  ];

  const currentContract = CONTRACTS.find(c => c.id === selectedRuleId) || CONTRACTS[0];
  const validation = currentContract.checkFn({
    outerRadius,
    padding,
    innerRadiusInput,
    outerPadding,
    innerPadding,
    touchHeight,
    touchWidth,
    boxSizingBorderBox,
    overflowHidden
  });

  const receiptHash = `rcpt_0x${Math.abs(
    (currentContract.id + validation.reason).split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  ).toString(16).padStart(10, '0')}`;

  const handleExportToDataset = () => {
    if (!onExportToHf) return;
    const rulePayload = {
      rule_id: currentContract.id,
      name: currentContract.name,
      formula: currentContract.formula,
      css_selector: currentContract.cssSelector,
      computed_css: validation.computedCss,
      verification_status: validation.valid,
      receipt_hash: receiptHash,
      ast_proof: validation.astProof,
      timestamp: new Date().toISOString()
    };

    onExportToHf(
      'css_evidence_bound',
      `CSS Invariant Rule: ${currentContract.name} (${validation.valid ? 'VERIFIED' : 'UNVERIFIED'})`,
      rulePayload,
      'ouroboroscollective/evidence-bound-css'
    );
  };

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(receiptHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">Formal Verification Tool</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-300 font-mono">ouroboroscollective/evidence-bound-css</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mt-0.5">
                Evidence-Bound CSS Proof Linter & Invariant Validator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Test mathematical UI layout contracts, detect distortion violations, and export verified invariants to the canonical Hugging Face dataset.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://huggingface.co/datasets/ouroboroscollective/evidence-bound-css"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 font-semibold rounded-xl border border-slate-800 transition-colors text-xs"
            >
              <span>View on HF Hub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {onExportToHf && (
              <button
                onClick={handleExportToDataset}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors shadow-md shadow-amber-500/15 text-xs min-h-[44px]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Commit Proof to HF</span>
              </button>
            )}
          </div>
        </div>

        {/* Rule Selector Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
          {CONTRACTS.map((contract) => (
            <button
              key={contract.id}
              onClick={() => setSelectedRuleId(contract.id)}
              className={`p-3 rounded-xl border text-left transition-all min-h-[44px] flex flex-col justify-between ${
                selectedRuleId === contract.id
                  ? 'bg-slate-950 border-amber-500/50 shadow-md shadow-amber-500/5'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">{contract.category}</span>
                <span className={`w-2 h-2 rounded-full ${selectedRuleId === contract.id ? 'bg-amber-400' : 'bg-slate-600'}`} />
              </div>
              <p className="text-xs font-bold text-slate-200 mt-1 truncate">{contract.name}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{contract.formula}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Parameters & Interactive Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Invariant Parameter Controls</span>
            </h3>
            <span className="text-[11px] font-mono text-amber-300 font-semibold">{currentContract.category.toUpperCase()}</span>
          </div>

          {/* Conditional Parameter Sliders */}
          {currentContract.id === 'nested_radius' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Outer Container Radius (r_outer):</span>
                  <span className="font-mono text-amber-400 font-bold">{outerRadius}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={outerRadius}
                  onChange={(e) => setOuterRadius(Number(e.target.value))}
                  className="w-full accent-amber-500 min-h-[44px] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Container Padding (pad):</span>
                  <span className="font-mono text-amber-400 font-bold">{padding}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  className="w-full accent-amber-500 min-h-[44px] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Tested Inner Element Radius (r_inner):</span>
                  <span className="font-mono text-amber-400 font-bold">{innerRadiusInput}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="48"
                  value={innerRadiusInput}
                  onChange={(e) => setInnerRadiusInput(Number(e.target.value))}
                  className="w-full accent-amber-500 min-h-[44px] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Required by Invariant:</span>
                  <button
                    onClick={() => setInnerRadiusInput(Math.max(0, outerRadius - padding))}
                    className="text-amber-400 font-mono font-bold hover:underline"
                  >
                    Auto-Fit: {Math.max(0, outerRadius - padding)}px
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentContract.id === 'touch_target_bound' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Mobile baseline touch guidelines mandate minimum 44px by 44px to eliminate touch fat-finger miss clicks.</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Touch Element Height:</span>
                  <span className="font-mono text-amber-400 font-bold">{touchHeight}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={touchHeight}
                  onChange={(e) => setTouchHeight(Number(e.target.value))}
                  className="w-full accent-amber-500 min-h-[44px] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Touch Element Width:</span>
                  <span className="font-mono text-amber-400 font-bold">{touchWidth}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={touchWidth}
                  onChange={(e) => setTouchWidth(Number(e.target.value))}
                  className="w-full accent-amber-500 min-h-[44px] cursor-pointer"
                />
              </div>

              <button
                onClick={() => { setTouchHeight(48); setTouchWidth(120); }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-xl text-xs transition-colors min-h-[44px]"
              >
                Set to Recommended 48px Touch Target
              </button>
            </div>
          )}

          {currentContract.id === 'padding_hierarchy' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Outer Container Padding (p_outer):</span>
                  <span className="font-mono text-amber-400 font-bold">{outerPadding}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={outerPadding}
                  onChange={(e) => setOuterPadding(Number(e.target.value))}
                  className="w-full accent-amber-500 min-h-[44px] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Inner Child Spacing (p_inner):</span>
                  <span className="font-mono text-amber-400 font-bold">{innerPadding}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={innerPadding}
                  onChange={(e) => setInnerPadding(Number(e.target.value))}
                  className="w-full accent-amber-500 min-h-[44px] cursor-pointer"
                />
              </div>
            </div>
          )}

          {currentContract.id === 'zero_overflow' && (
            <div className="space-y-4 text-xs">
              <label className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer min-h-[44px]">
                <span>Enforce box-sizing: border-box</span>
                <input
                  type="checkbox"
                  checked={boxSizingBorderBox}
                  onChange={(e) => setBoxSizingBorderBox(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </label>

              <label className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer min-h-[44px]">
                <span>Enforce overflow: hidden / clip</span>
                <input
                  type="checkbox"
                  checked={overflowHidden}
                  onChange={(e) => setOverflowHidden(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Verdict Card */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            validation.valid
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <h4 className="font-bold text-xs">
                {validation.valid ? 'MATHEMATICAL INVARIANT VALIDATED' : 'INVARIANT CONSTRAINT VIOLATED'}
              </h4>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{validation.reason}</p>
            <div className="flex items-center justify-between pt-1 text-[11px] font-mono border-t border-current/20">
              <span>Receipt: {receiptHash}</span>
              <button
                onClick={handleCopyReceipt}
                className="hover:underline flex items-center gap-1"
              >
                {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Visual Preview & Proof AST Column */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Real-Time Visual Geometry & Proof AST</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Live Render Window</span>
          </div>

          {/* Interactive Visual Box */}
          <div className="p-8 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[200px]">
            {currentContract.id === 'nested_radius' && (
              <div
                style={{
                  borderRadius: `${outerRadius}px`,
                  padding: `${padding}px`,
                }}
                className="bg-amber-500/20 border-2 border-amber-500/60 transition-all max-w-sm w-full flex items-center justify-center shadow-xl"
              >
                <div
                  style={{
                    borderRadius: `${innerRadiusInput}px`,
                  }}
                  className={`p-6 transition-all text-center w-full ${
                    validation.valid
                      ? 'bg-slate-900 border-2 border-emerald-500/80 text-emerald-300'
                      : 'bg-slate-900 border-2 border-rose-500/80 text-rose-300'
                  }`}
                >
                  <p className="font-mono text-xs font-bold">Inner Child Element</p>
                  <p className="text-[11px] font-mono opacity-80">r_inner: {innerRadiusInput}px</p>
                </div>
              </div>
            )}

            {currentContract.id === 'touch_target_bound' && (
              <div className="text-center space-y-3">
                <button
                  style={{
                    minHeight: `${touchHeight}px`,
                    minWidth: `${touchWidth}px`,
                  }}
                  className={`px-4 rounded-xl font-bold font-mono text-xs transition-all shadow-lg flex items-center justify-center gap-2 mx-auto active:scale-95 ${
                    validation.valid
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  }`}
                >
                  <span>Touch Button ({touchHeight}x{touchWidth}px)</span>
                </button>
                <p className="text-[11px] font-mono text-slate-400">
                  {validation.valid ? 'Accessible on touch devices' : 'Hazardous on mobile touch screens'}
                </p>
              </div>
            )}

            {currentContract.id === 'padding_hierarchy' && (
              <div
                style={{ padding: `${outerPadding}px`, gap: `${innerPadding}px` }}
                className="bg-slate-900 border-2 border-slate-700 rounded-2xl flex flex-col w-full max-w-md shadow-xl"
              >
                <div
                  style={{ padding: `${innerPadding}px` }}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-xl text-center"
                >
                  <span className="font-mono text-xs font-semibold text-amber-300">Child Component 1</span>
                </div>
                <div
                  style={{ padding: `${innerPadding}px` }}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-xl text-center"
                >
                  <span className="font-mono text-xs font-semibold text-amber-300">Child Component 2</span>
                </div>
              </div>
            )}

            {currentContract.id === 'zero_overflow' && (
              <div className="w-full max-w-sm bg-slate-900 p-4 border border-slate-700 rounded-xl space-y-2">
                <div
                  style={{
                    boxSizing: boxSizingBorderBox ? 'border-box' : 'content-box',
                    overflow: overflowHidden ? 'hidden' : 'visible'
                  }}
                  className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs font-mono text-amber-300 truncate"
                >
                  Strict Viewport Boundary Constraint
                </div>
              </div>
            )}
          </div>

          {/* AST Formal Proof Chain */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">Invariant Proof AST Chain:</h4>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-200/90 space-y-1">
              {validation.astProof.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400">›</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Computed CSS Declarations */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">Generated CSS Declarations:</h4>
            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
              {validation.computedCss}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
