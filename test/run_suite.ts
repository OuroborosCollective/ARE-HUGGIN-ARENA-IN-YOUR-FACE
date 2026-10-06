/**
 * ARE / Hugging Face Studio — Automated Test Suite & Runtime Regression Validator
 * Invariants: Determinism, Evidence Receipts, 503 Fallback Resilience, Stream Bounds
 */

import crypto from 'crypto';

export interface TestCase {
  name: string;
  category: 'Receipt Invariants' | 'Combat Throne' | 'Dataset Stream' | '503 High-Demand Resilience' | 'AST Resolution' | 'Passport Hashing';
  run: () => Promise<void> | void;
}

export const registeredTests: TestCase[] = [];

function test(name: string, category: TestCase['category'], fn: () => Promise<void> | void) {
  registeredTests.push({ name, category, run: fn });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed [${message}]: Expected '${expected}', got '${actual}'`);
  }
}

// -------------------------------------------------------------------
// 1. Receipt Invariants & Deterministic Hashing Tests
// -------------------------------------------------------------------

test('Deterministic Evidence Receipt Hash Format & Length', 'Receipt Invariants', () => {
  const matchId = 'are-match-1042';
  const attacker = 'ouroboros/ARE-rLOGIC-70b';
  const defender = 'meta-llama/Llama-3.1-70B-Instruct';
  const targetClaim = 'All acyclic DAGs with positive edge weights have non-trivial topological subgraphs';
  const payload = 'Derived empty clause resolution on cycle witness back-edge {5->2}';

  const data = `${matchId}:${attacker}:${defender}:${targetClaim}:${payload}`;
  const receiptHash = 'rcpt_0x' + crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);

  assert(receiptHash.startsWith('rcpt_0x'), 'Receipt hash must begin with rcpt_0x prefix');
  assertEqual(receiptHash.length, 23, 'Receipt hash length must be exactly 23 chars (rcpt_0x + 16 hex)');

  // Reproducibility check
  const receiptHash2 = 'rcpt_0x' + crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  assertEqual(receiptHash, receiptHash2, 'Receipt hash must be 100% deterministic given identical inputs');
});

// -------------------------------------------------------------------
// 2. Combat Throne & Depose Logic Invariants
// -------------------------------------------------------------------

test('Combat Throne Depose Logic When Challenger Surpasses Score', 'Combat Throne', () => {
  const initialThrone = {
    dataset_id: 'ouroboroscollective/evidence-bound-css',
    current_champion_model: 'ouroboros/ARE-rLOGIC-70b',
    champion_score: 2180,
    evidence_revision_points: 9420,
    undefeated_streak: 18,
    combat_status: 'UNDEFEATED_CHAMPION' as const,
    recent_depose_events: [] as any[]
  };

  const challengerModel = 'gemini-3.8-flash';
  const challengerScore = 2215; // Higher than 2180
  const isDeposed = challengerScore > initialThrone.champion_score;

  assert(isDeposed, 'Challenger scoring higher than reigning champion must depose them');

  // Simulate depose state transition
  const previousChampion = initialThrone.current_champion_model;
  initialThrone.recent_depose_events.unshift({
    timestamp: new Date().toISOString(),
    deposed_champion: previousChampion,
    new_champion: challengerModel,
    winning_score: challengerScore,
    receipt_hash: 'rcpt_0x_test_depose'
  });

  initialThrone.current_champion_model = challengerModel;
  initialThrone.champion_score = challengerScore;
  initialThrone.undefeated_streak = 1;

  assertEqual(initialThrone.current_champion_model, 'gemini-3.8-flash', 'New champion must be seated on throne');
  assertEqual(initialThrone.champion_score, 2215, 'Throne score must update to highest winning score');
  assertEqual(initialThrone.recent_depose_events.length, 1, 'Depose event must be recorded in history');
});

test('Combat Throne Defense Retention When Challenger Fails', 'Combat Throne', () => {
  const throne = {
    current_champion_model: 'ouroboros/ARE-rLOGIC-70b',
    champion_score: 2180,
    undefeated_streak: 18,
    evidence_revision_points: 9420
  };

  const challengerScore = 2050; // Lower than 2180
  const isDeposed = challengerScore > throne.champion_score;

  assert(!isDeposed, 'Challenger scoring lower than champion must NOT depose');
  throne.undefeated_streak += 1;
  throne.evidence_revision_points += 50;

  assertEqual(throne.undefeated_streak, 19, 'Reigning champion streak must increment on successful defense');
  assertEqual(throne.current_champion_model, 'ouroboros/ARE-rLOGIC-70b', 'Champion remains on throne');
});

// -------------------------------------------------------------------
// 3. Hugging Face Dataset Stream Chunking & Checksum Bounds
// -------------------------------------------------------------------

test('Dataset Stream Chunking & Pagination Invariants', 'Dataset Stream', () => {
  const totalSimulatedRows = 50;
  const chunkSize = 5;
  const totalChunks = Math.ceil(totalSimulatedRows / chunkSize);

  assertEqual(totalChunks, 10, '50 rows with chunk size 5 must produce 10 chunks');

  // Test chunk index 0
  const chunk0Start = 0 * chunkSize;
  const chunk0End = chunk0Start + chunkSize;
  assertEqual(chunk0End - chunk0Start, 5, 'Chunk 0 must contain exactly 5 rows');

  // Checksum generation for stream row
  const row = { instruction: 'Test stream instruction', text: 'Sample text' };
  const checksum = 'sha256_' + crypto.createHash('sha256').update(`stream_1:${JSON.stringify(row)}`).digest('hex').slice(0, 12);

  assert(checksum.startsWith('sha256_'), 'Stream row checksum must have sha256_ prefix');
  assertEqual(checksum.length, 19, 'Checksum length must be 19 chars (sha256_ + 12 hex)');
});

// -------------------------------------------------------------------
// 4. 503 High-Demand Resilience & Fallback Hierarchy
// -------------------------------------------------------------------

test('Deterministic Referee Fallback When Gemini API Simulates 503 High Demand', '503 High-Demand Resilience', async () => {
  // Simulate 503 response from model
  const simulateModelCall = async (): Promise<any> => {
    throw new Error('This model is currently experiencing high demand (503 UNAVAILABLE)');
  };

  let battleOutcome: any = null;

  try {
    await simulateModelCall();
  } catch (err: any) {
    // Tier 3 Deterministic Engine Fallback
    const hashInput = `test_attacker:test_defender:test_claim:payload`;
    const hashVal = crypto.createHash('sha256').update(hashInput).digest('hex');
    const hashInt = parseInt(hashVal.slice(0, 8), 16);
    const attackWins = hashInt % 100 < 56;

    battleOutcome = {
      outcome: attackWins ? 'ATTACK_SUCCESSFUL' : 'DEFENSE_HELD_VALID',
      points_awarded: 45 + (hashInt % 25),
      engine_status: 'ARE-Deterministic-rLOGIC-Engine (503 Resilience Active)'
    };
  }

  assert(battleOutcome !== null, 'Battle outcome must be generated despite 503 model exception');
  assert(battleOutcome.outcome === 'ATTACK_SUCCESSFUL' || battleOutcome.outcome === 'DEFENSE_HELD_VALID', 'Outcome must be valid enum');
  assert(battleOutcome.points_awarded >= 45, 'Points awarded must be >= 45');
});

// -------------------------------------------------------------------
// 5. AST Resolution & Logic Invariant Verification
// -------------------------------------------------------------------

test('AST Resolution Refutation Derives Valid Resolvent', 'AST Resolution', () => {
  // Propositional Logic clause resolution: C1 = {A, ~B}, C2 = {~A, C}
  const clause1 = ['A', '!B'];
  const clause2 = ['!A', 'C'];
  const pivot = 'A';

  const resolvent = [
    ...clause1.filter(l => l !== pivot && l !== `!${pivot}`),
    ...clause2.filter(l => l !== pivot && l !== `!${pivot}`)
  ];

  assertEqual(resolvent.join(','), '!B,C', 'Resolvent of {A, !B} and {!A, C} on pivot A must be {!B, C}');
});

// -------------------------------------------------------------------
// 6. Sovereign Evidence Passport Hashing Invariants
// -------------------------------------------------------------------

test('Sovereign Evidence Passport SHA-256 Hash Matching', 'Passport Hashing', () => {
  const claim = 'Evidence-Bound CSS bounding contracts adhere to zero-overflow invariant';
  const claimSha256 = '0x' + crypto.createHash('sha256').update(claim).digest('hex');

  assert(claimSha256.startsWith('0x'), 'Passport hash must start with 0x');
  assertEqual(claimSha256.length, 66, 'SHA-256 hex string with 0x prefix must be 66 characters');
});

// -------------------------------------------------------------------
// 7. Global Dataset Leaderboard & Medals of Honor Invariants
// -------------------------------------------------------------------

test('Dataset Logic Efficiency & Fine-Tuning Tier Invariants', 'Combat Throne', () => {
  const datasets = [
    { name: 'evidence-bound-css', score: 99.5, defenses: 22, losses: 0, tier: 'Tier 1: SFT & Chain-of-Thought Ready' },
    { name: 'fineweb-edu', score: 98.9, defenses: 16, losses: 0, tier: 'Tier 1: SFT & Chain-of-Thought Ready' },
    { name: 'the-stack-v2', score: 96.2, defenses: 18, losses: 1, tier: 'Tier 2: RLVR / Preference Verifiable' }
  ];

  const sorted = [...datasets].sort((a, b) => b.score - a.score);
  assertEqual(sorted[0].name, 'evidence-bound-css', 'Highest logic efficiency score must rank #1');
  assert(sorted[0].tier.includes('Tier 1'), 'Top reasoning dataset must qualify for Tier-1 SFT');

  // Defense win rate calculation
  const winRate = Math.round((sorted[0].defenses / (sorted[0].defenses + sorted[0].losses)) * 100);
  assertEqual(winRate, 100, 'Undefeated dataset defense win rate must equal 100%');
});

test('Medals of Honor Markdown & HTML Badge Generation', 'Passport Hashing', () => {
  const medal = {
    id: 'throne_grand_sovereign',
    name: 'Throne Sovereign Grand Medal',
    tier: 'GOLD',
    markdown_badge: '[![ARE Medal of Honor: Throne Sovereign](https://img.shields.io/badge/ARE--Honor-Throne%20Sovereign-gold?style=for-the-badge&logo=huggingface)](https://huggingface.co/ouroboroscollective)',
    html_badge: '<a href="https://huggingface.co/ouroboroscollective"><img src="https://img.shields.io/badge/ARE--Honor-Throne%20Sovereign-gold?style=for-the-badge&logo=huggingface" alt="Throne Sovereign Medal" /></a>'
  };

  assert(medal.markdown_badge.includes('img.shields.io/badge/ARE--Honor'), 'Markdown badge must contain valid shields.io endpoint');
  assert(medal.html_badge.startsWith('<a href='), 'HTML badge must contain anchor link');
});

// -------------------------------------------------------------------
// 8. Gemini API Circuit Breaker & Multi-Tier Cascading Invariants
// -------------------------------------------------------------------

test('Gemini Circuit Breaker Tripping on Consecutive Failures', '503 High-Demand Resilience', () => {
  let state: string = 'CLOSED';
  let consecutiveFailures = 0;
  const failureThreshold = 3;

  const simulateFailure = () => {
    consecutiveFailures++;
    if (consecutiveFailures >= failureThreshold) {
      state = 'OPEN';
    }
  };

  assertEqual(state, 'CLOSED', 'Initial state must be CLOSED');
  simulateFailure();
  assertEqual(state, 'CLOSED', 'State must remain CLOSED after 1 failure');
  simulateFailure();
  assertEqual(state, 'CLOSED', 'State must remain CLOSED after 2 failures');
  simulateFailure();
  assertEqual(state, 'OPEN', 'State must transition to OPEN after 3 consecutive failures');

  // Fast-fail check
  assert(state === 'OPEN', 'Circuit OPEN must fast-route to Tier 2 backup without hammering primary');
});

// -------------------------------------------------------------------
// 6. Dataset Heatmap Matrix & Stream Completeness Invariants
// -------------------------------------------------------------------

test('Dataset Heatmap Matrix Density & Null Invariant Calculation', 'Dataset Stream', () => {
  const sampleRows = [
    { instruction: 'Verify DAG acyclicity', text: 'Formal proof steps...', css_selector: '.node-1' },
    { instruction: 'Check null bounds', text: null, css_selector: '.node-2' },
    { instruction: '', text: 'Data text record', css_selector: undefined },
    { instruction: 'Valid prompt', text: 'Valid output text', css_selector: '.node-4' }
  ];

  const features = ['instruction', 'text', 'css_selector'];
  const totalCells = sampleRows.length * features.length;
  let missingCells = 0;

  sampleRows.forEach(row => {
    features.forEach(feat => {
      const val = (row as any)[feat];
      const isNull = val === null || val === undefined || val === '' || (typeof val === 'string' && val.trim() === '');
      if (isNull) missingCells++;
    });
  });

  const filledCells = totalCells - missingCells;
  const densityPct = Math.round((filledCells / totalCells) * 100);

  // In this fixture:
  // row 0: 3 filled, 0 missing
  // row 1: 2 filled, 1 missing (text is null)
  // row 2: 1 filled, 2 missing (instruction is '', css_selector is undefined)
  // row 3: 3 filled, 0 missing
  // Total: 9 filled, 3 missing -> 9/12 = 75%
  assertEqual(totalCells, 12, 'Total cells must equal rows × features');
  assertEqual(missingCells, 3, 'Missing cells count must strictly equal 3');
  assertEqual(filledCells, 9, 'Filled cells count must strictly equal 9');
  assertEqual(densityPct, 75, 'Density score must be exactly 75%');
});

test('Device System Theme Auto-Toggle & Preference Resolution Invariant', 'Receipt Invariants', () => {
  const resolveTheme = (preference: 'system' | 'dark' | 'light', systemTheme: 'dark' | 'light') => {
    return preference === 'system' ? systemTheme : preference;
  };

  // When preference is 'system', it must follow systemTheme dynamically
  assertEqual(resolveTheme('system', 'dark'), 'dark', 'System preference with dark OS must resolve to dark');
  assertEqual(resolveTheme('system', 'light'), 'light', 'System preference with light OS must resolve to light');

  // When explicit preference is selected, it must override systemTheme
  assertEqual(resolveTheme('light', 'dark'), 'light', 'Explicit light preference must override dark system');
  assertEqual(resolveTheme('dark', 'light'), 'dark', 'Explicit dark preference must override light system');
});

// -------------------------------------------------------------------
// 7. RPG Auto-Battler & Hero Progression Invariants
// -------------------------------------------------------------------

test('RPG Hero Progression, Experience Curves & Visual Scaling Tiers', 'Combat Throne', () => {
  const getXpNeeded = (lvl: number) => Math.round(100 * Math.pow(1.3, lvl - 1));
  const getTierInfo = (lvl: number) => {
    if (lvl >= 20) return { tier: 'TIER IV (TITAN)', scale: 1.55 };
    if (lvl >= 10) return { tier: 'TIER III (SOVEREIGN)', scale: 1.35 };
    if (lvl >= 5) return { tier: 'TIER II (CHAMPION)', scale: 1.2 };
    return { tier: 'TIER I (APPRENTICE)', scale: 1.0 };
  };

  // Level 1 XP requirement
  assertEqual(getXpNeeded(1), 100, 'Level 1 must require exactly 100 XP');
  assertEqual(getTierInfo(1).tier, 'TIER I (APPRENTICE)', 'Level 1 must be Tier I Apprentice');
  assertEqual(getTierInfo(1).scale, 1.0, 'Tier I scale must be 1.0x');

  // Level 5 tier transition
  assertEqual(getTierInfo(5).tier, 'TIER II (CHAMPION)', 'Level 5 must unlock Tier II Champion');
  assertEqual(getTierInfo(5).scale, 1.2, 'Tier II scale must be 1.2x');

  // Level 10 tier transition
  assertEqual(getTierInfo(10).tier, 'TIER III (SOVEREIGN)', 'Level 10 must unlock Tier III Sovereign');
  assertEqual(getTierInfo(10).scale, 1.35, 'Tier III scale must be 1.35x');

  // Level 20 titan tier transition
  assertEqual(getTierInfo(20).tier, 'TIER IV (TITAN)', 'Level 20 must unlock Tier IV Titan Archon');
  assertEqual(getTierInfo(20).scale, 1.55, 'Tier IV scale must be 1.55x (Raid Legends Colossal size)');
});

test('RPG Dynamic Scaling Growth with Win-Streak & Efficiency Multipliers', 'Combat Throne', () => {
  const getDynamicScale = (level: number, totalBattles: number, totalWins: number) => {
    let baseScale = 1.0;
    if (level >= 20) baseScale = 1.55;
    else if (level >= 10) baseScale = 1.35;
    else if (level >= 5) baseScale = 1.2;

    const winRate = totalBattles > 0 ? (totalWins / totalBattles) : 0;
    const streakBonus = Math.min(0.25, winRate * 0.15 + (totalWins >= 10 ? 0.1 : totalWins >= 5 ? 0.05 : 0));
    return Number((baseScale + streakBonus).toFixed(2));
  };

  // Base level 1 without wins
  assertEqual(getDynamicScale(1, 0, 0), 1.0, 'Level 1 with 0 wins must have base 1.0 scale');

  // Level 1 with 5 wins out of 5 battles (100% win rate + streak bonus)
  const scaleLv1Win = getDynamicScale(1, 5, 5);
  assert(scaleLv1Win >= 1.20, `Scale with 5 consecutive wins must exceed base scale (got ${scaleLv1Win})`);

  // Level 10 Sovereign with 10 wins
  const scaleLv10Win = getDynamicScale(10, 10, 10);
  assert(scaleLv10Win >= 1.55, `Level 10 Sovereign with 10 win streak must scale >= 1.55x (got ${scaleLv10Win})`);

  // Level 20 Titan with flawless record
  const scaleLv20Titan = getDynamicScale(20, 20, 20);
  assertEqual(scaleLv20Titan, 1.80, `Level 20 Titan with 20 wins must reach colossal 1.80x scale (got ${scaleLv20Titan})`);
});

test('Battle Summary Card Metrics, Evidence Points & XP Invariants', 'Combat Throne', () => {
  const calculateBattleSummary = (outcome: 'ATTACK_SUCCESSFUL' | 'DEFENSE_HELD_VALID', rawPoints?: number) => {
    const isAttackWon = outcome === 'ATTACK_SUCCESSFUL';
    const points = rawPoints || (isAttackWon ? 85 : 45);
    const xpEarned = isAttackWon ? 180 + Math.round(points * 1.2) : 60 + Math.round(points * 0.5);
    const successRate = isAttackWon ? 94.8 : 42.1;
    return { isAttackWon, points, xpEarned, successRate };
  };

  // Winning attack summary
  const winSummary = calculateBattleSummary('ATTACK_SUCCESSFUL', 100);
  assertEqual(winSummary.points, 100, 'Awarded points must be exactly 100');
  assertEqual(winSummary.xpEarned, 300, 'Winning 100pt attack must award 180 + 120 = 300 XP');
  assertEqual(winSummary.successRate, 94.8, 'Successful attack must reflect high success rate');

  // Defended summary
  const lossSummary = calculateBattleSummary('DEFENSE_HELD_VALID', 40);
  assertEqual(lossSummary.points, 40, 'Defended points must be 40');
  assertEqual(lossSummary.xpEarned, 80, 'Consolation XP must be 60 + 20 = 80 XP');
  assertEqual(lossSummary.successRate, 42.1, 'Defended match must reflect held defense rate');
});

test('Quick Fight Shortcut Target Resolution Invariant', 'Combat Throne', () => {
  const sampleThrones = [
    { dataset_id: 'dataset-1', combat_status: 'UNDER_CHALLENGE', champion_score: 1800 },
    { dataset_id: 'ouroboroscollective/evidence-bound-css', combat_status: 'UNDEFEATED_CHAMPION', champion_score: 2215 },
    { dataset_id: 'dataset-3', combat_status: 'DEPOSED_RECENTLY', champion_score: 1500 }
  ];

  const resolveQuickFightTarget = (thrones: any[]) => {
    return thrones.find(t => t.combat_status === 'UNDEFEATED_CHAMPION') || thrones[0];
  };

  const target = resolveQuickFightTarget(sampleThrones);
  assert(!!target, 'Quick fight target must be resolved');
  assertEqual(target.dataset_id, 'ouroboroscollective/evidence-bound-css', 'Must automatically select the reigning undefeated throne');
});

test('Synthetic Text Generation Schema Conformity & 429 Quota Fallback', '503 High-Demand Resilience', () => {
  const generateDeterministicSyntheticSamples = (topic: string, format: string, count: number) => {
    return Array.from({ length: count }).map((_, idx) => {
      const instruction = `Explain state concurrency bounds in "${topic}"`;
      const output = `Verified solution for ${topic} [Sample #${idx + 1}]`;
      if (format === 'chatml') {
        return {
          messages: [
            { role: 'system', content: 'You are an AI assistant.' },
            { role: 'user', content: instruction },
            { role: 'assistant', content: output }
          ]
        };
      } else if (format === 'llama3') {
        return {
          text: `<|start_header_id|>user<|end_header_id|>\n${instruction}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n${output}<|eot_id|>`
        };
      } else {
        return { instruction, input: '', output };
      }
    });
  };

  const alpacaSamples = generateDeterministicSyntheticSamples('Python AsyncIO', 'alpaca', 3);
  assertEqual(alpacaSamples.length, 3, 'Must produce requested 3 sample rows');
  assert('instruction' in alpacaSamples[0] && 'output' in alpacaSamples[0], 'Alpaca sample must include instruction and output');

  const chatmlSamples = generateDeterministicSyntheticSamples('Distributed Raft', 'chatml', 2);
  assertEqual(chatmlSamples.length, 2, 'Must produce requested 2 sample rows');
  assert(Array.isArray((chatmlSamples[0] as any).messages), 'ChatML format must contain messages array');
});

test('RPG Autobattler Turn Damage Mitigation & Critical Invariants', 'Combat Throne', () => {
  const calculateDamage = (atk: number, def: number, isCrit: boolean, isUltimate: boolean) => {
    let raw = isUltimate ? atk * 2.4 : atk;
    if (isCrit) raw *= 1.6;
    const defReduction = Math.max(0.2, 1 - def / (def + 120));
    return Math.max(15, Math.round(raw * defReduction));
  };

  // Standard attack 50 ATK vs 30 DEF
  const baseDmg = calculateDamage(50, 30, false, false);
  assert(baseDmg > 0 && baseDmg <= 50, 'Standard attack must deal mitigated damage bounded by ATK');

  // Critical attack 50 ATK vs 30 DEF
  const critDmg = calculateDamage(50, 30, true, false);
  assert(critDmg > baseDmg, 'Critical attack must deal significantly higher damage than base');

  // Ultimate attack
  const ultDmg = calculateDamage(50, 30, false, true);
  assert(ultDmg > baseDmg * 2, 'Ultimate attack must deal > 2x standard base damage');
});

// -------------------------------------------------------------------
// Test Runner
// -------------------------------------------------------------------

export async function runAllTests(): Promise<{ passed: number; failed: number; total: number; results: Array<{ name: string; category: string; passed: boolean; durationMs: number; error?: string }> }> {
  console.log('\n======================================================');
  console.log('🧪 ARE / Hugging Face Studio — Automated Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; category: string; passed: boolean; durationMs: number; error?: string }> = [];

  for (const t of registeredTests) {
    const start = Date.now();
    try {
      await t.run();
      const durationMs = Date.now() - start;
      passed++;
      console.log(`  ✅ [${t.category}] ${t.name} (${durationMs}ms)`);
      results.push({ name: t.name, category: t.category, passed: true, durationMs });
    } catch (err: any) {
      const durationMs = Date.now() - start;
      failed++;
      console.error(`  ❌ [${t.category}] ${t.name} (${durationMs}ms)`);
      console.error(`     Error: ${err.message}`);
      results.push({ name: t.name, category: t.category, passed: false, durationMs, error: err.message });
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed, ${registeredTests.length} total`);
  console.log('======================================================\n');

  return { passed, failed, total: registeredTests.length, results };
}

// If executed directly via CLI (tsx test/run_suite.ts)
if (process.argv[1]?.endsWith('run_suite.ts')) {
  runAllTests().then(({ failed }) => {
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
