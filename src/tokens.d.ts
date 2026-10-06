/**
 * ARE — Another Revision Engineering
 * TypeScript Type Definitions for Design Tokens (tokens.d.ts)
 *
 * System: Forensic Precision Instrument
 * Canonical Spec: Designer.md / DESIGN.md
 * Invariant: Evidence -> Comprehension -> Choice -> Action -> Receipt
 */

export namespace ARETokens {
  /**
   * Color System Palette
   */
  export interface Colors {
    readonly canvas: {
      readonly DEFAULT: '#080B0A';
      readonly dim: '#050706';
      readonly lowest: '#040505';
    };
    readonly surface: {
      readonly DEFAULT: '#101512';
      readonly dim: '#0D110F';
      readonly elevated: '#141A17';
      readonly bright: '#1B241F';
      readonly container: '#121714';
    };
    readonly border: {
      readonly DEFAULT: '#29322D';
      readonly muted: '#1D2420';
      readonly emphasis: '#3D4C44';
      readonly subtle: '#18201C';
    };
    readonly ink: {
      readonly primary: '#F0F4F1';
      readonly secondary: '#C2CDC6';
      readonly muted: '#94A19A';
      readonly faint: '#5D6762';
    };
    readonly signal: {
      readonly DEFAULT: '#D9FF6B';
      readonly hover: '#C8F554';
      readonly active: '#B5E83A';
      readonly muted: 'rgba(217, 255, 107, 0.12)';
      readonly border: 'rgba(217, 255, 107, 0.35)';
    };
    readonly amber: {
      readonly evidence: '#F0B95E';
      readonly 'evidence-dim': 'rgba(240, 185, 94, 0.15)';
      readonly 'evidence-border': 'rgba(240, 185, 94, 0.35)';
    };
    readonly mint: {
      readonly control: '#8BE7BD';
      readonly 'control-dim': 'rgba(139, 231, 189, 0.15)';
      readonly 'control-border': 'rgba(139, 231, 189, 0.35)';
    };
    readonly enclave: {
      readonly alert: '#FF5555';
      readonly 'alert-dim': '#4E1A1A';
      readonly 'alert-border': 'rgba(255, 85, 85, 0.4)';
    };
  }

  /**
   * Typography Font Families
   */
  export interface TypographyFonts {
    readonly display: readonly ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'];
    readonly body: readonly ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'];
    readonly mono: readonly ['IBM Plex Mono', 'Menlo', 'Consolas', 'Courier New', 'monospace'];
  }

  /**
   * Border Radii
   */
  export interface Radii {
    readonly sm: '4px';
    readonly DEFAULT: '6px';
    readonly md: '8px';
    readonly lg: '12px';
    readonly full: '9999px';
  }

  /**
   * Elevation & Instrumental Shadows
   */
  export interface Shadows {
    readonly 'instrument-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.6)';
    readonly 'instrument-panel': '0 4px 20px -2px rgba(0, 0, 0, 0.75)';
    readonly 'focus-signal': '0 0 0 2px #080B0A, 0 0 0 4px #D9FF6B';
    readonly 'focus-amber': '0 0 0 2px #080B0A, 0 0 0 4px #F0B95E';
  }

  /**
   * Animation & Motion Timings
   */
  export interface Motion {
    readonly easeInstrument: 'cubic-bezier(0.16, 1, 0.3, 1)';
    readonly durationTactile: '150ms';
    readonly durationPanel: '350ms';
  }

  /**
   * Touch & Accessibility Metrics
   */
  export interface AccessibilityMetrics {
    readonly touchMinHeight: '44px';
    readonly touchMinWidth: '44px';
  }

  /**
   * Forensic Status Badge Variants
   */
  export type StatusGateVariant =
    | 'SLSA_3_HERMETIC'
    | 'ZERO_LEAKS'
    | 'REVIEW_REQUIRED'
    | 'REPRODUCIBLE'
    | 'PORTABLE'
    | 'ENCLAVE_SEALED'
    | 'COSIGN_VERIFIED';
}

export default ARETokens;
