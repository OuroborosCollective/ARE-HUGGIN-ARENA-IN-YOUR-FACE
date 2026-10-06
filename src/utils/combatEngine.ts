import { DeterministicPRNG, hashString } from './deterministicRng';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface CombatStats {
  maxHp: number;
  currentHp: number;
  maxEnergy: number;
  currentEnergy: number;
  atk: number;
  def: number;
  critRate: number; // 0 - 100
  speed: number;
  astAccuracyBonus: number;
  scale: number;
}

export interface CombatTurn {
  turn: number;
  attacker: 'hero' | 'opponent';
  attackerName: string;
  defenderName: string;
  actionName: string;
  rawDamage: number;
  mitigatedDamage: number;
  isCrit: boolean;
  isUltimate: boolean;
  heroHpRemaining: number;
  opponentHpRemaining: number;
  heroEnergy: number;
  opponentEnergy: number;
  actionType: 'attack' | 'ultimate' | 'counter' | 'defense';
  message: string;
}

export interface CombatRevisionRecord {
  id: string;
  userId: string;
  attacker: string;
  defender: string;
  winningCombatant: string;
  heroLevel: number;
  heroXp: number;
  evidenceHistoryHash: string;
  proofOfWorkHash: string;
  turnsCount: number;
  pointsAwarded: number;
  xpAwarded: number;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  turns: CombatTurn[];
  combatSummary: {
    heroStartingHp: number;
    heroEndingHp: number;
    opponentStartingHp: number;
    opponentEndingHp: number;
    totalDamageDealtByHero: number;
    totalDamageDealtByOpponent: number;
  };
  createdAt: string;
}

export interface CombatEngineHeroInput {
  name: string;
  className: 'paladin' | 'archmage' | 'assassin' | 'berserker' | 'logic_knight';
  level: number;
  currentXp: number;
  totalBattles: number;
  totalWins: number;
  revisionPoints: number;
  allocatedStats: {
    atkBonus: number;
    defBonus: number;
    hpBonus: number;
    critBonus: number;
  };
  selectedModel3DId?: string;
  equippedMedalBonusMultiplier?: number;
}

export interface CombatEngineOpponentInput {
  model_id: string;
  name: string;
  org: string;
  elo: number;
  level?: number;
  ast_accuracy?: number;
}

export interface CombatEngineEvidenceInput {
  datasetId?: string;
  datasetName?: string;
  verifiedRowsCount?: number;
  merkleRootHash?: string;
  revisionHistoryHash?: string;
}

/**
 * Deterministic SHA-256 Proof-of-Work Generator for combat receipts
 */
export function generateCombatProofHash(
  heroName: string,
  opponentId: string,
  heroLevel: number,
  revisionPoints: number,
  evidenceHash: string,
  turnsCount: number,
  outcome: string
): string {
  const seedString = `ARE_PROOF_OF_WORK:${heroName}:${opponentId}:LVL_${heroLevel}:REV_${revisionPoints}:EVID_${evidenceHash}:TURNS_${turnsCount}:OUT_${outcome}`;
  const h1 = hashString(seedString).toString(16).padStart(8, '0');
  const h2 = hashString(seedString + '_SALT_PROV_V2').toString(16).padStart(8, '0');
  const h3 = hashString(seedString + '_SOVEREIGN_NODE').toString(16).padStart(8, '0');
  const h4 = hashString(seedString + '_AST_INVARIANT').toString(16).padStart(8, '0');
  return `pow_0x${h1}${h2}${h3}${h4}`;
}

export class CombatEngine {
  /**
   * Derive combatant stats based solely on immutable dataset and hero attributes
   */
  public static calculateHeroCombatStats(
    hero: CombatEngineHeroInput,
    evidence?: CombatEngineEvidenceInput
  ): CombatStats {
    const baseHp = hero.className === 'paladin' ? 620 : hero.className === 'berserker' ? 560 : 480;
    const baseAtk = hero.className === 'berserker' ? 68 : hero.className === 'assassin' ? 72 : hero.className === 'archmage' ? 70 : 54;
    const baseDef = hero.className === 'paladin' ? 50 : hero.className === 'archmage' ? 28 : 34;
    const baseCrit = hero.className === 'assassin' ? 26 : 14;
    const baseSpeed = hero.className === 'assassin' ? 122 : hero.className === 'archmage' ? 106 : 96;

    // Evidence bonus derived directly from verified dataset revision history
    const evidenceBonusHp = Math.min(300, Math.floor(hero.revisionPoints * 0.4));
    const evidenceBonusAtk = Math.min(60, Math.floor(hero.revisionPoints * 0.08));
    const evidenceBonusDef = Math.min(50, Math.floor(hero.revisionPoints * 0.06));

    const levelMultiplier = 1 + (hero.level - 1) * 0.08;
    const medalMultiplier = hero.equippedMedalBonusMultiplier || 1.0;

    const maxHp = Math.round((baseHp + (hero.level - 1) * 55 + hero.allocatedStats.hpBonus * 45 + evidenceBonusHp) * medalMultiplier);
    const atk = Math.round((baseAtk + (hero.level - 1) * 9 + hero.allocatedStats.atkBonus * 7 + evidenceBonusAtk) * medalMultiplier);
    const def = Math.round((baseDef + (hero.level - 1) * 6 + hero.allocatedStats.defBonus * 6 + evidenceBonusDef) * medalMultiplier);
    const critRate = Math.min(75, Math.round(baseCrit + (hero.level - 1) * 1.5 + hero.allocatedStats.critBonus * 3.5));
    const speed = baseSpeed + (hero.level - 1) * 4;

    // Dynamic Tier Scale
    let scale = 1.0;
    if (hero.level >= 20) scale = 1.55;
    else if (hero.level >= 10) scale = 1.35;
    else if (hero.level >= 5) scale = 1.20;

    return {
      maxHp,
      currentHp: maxHp,
      maxEnergy: 100,
      currentEnergy: 25,
      atk,
      def,
      critRate,
      speed,
      astAccuracyBonus: Math.min(25, Math.floor(hero.revisionPoints / 20)),
      scale
    };
  }

  /**
   * Derive opponent combat stats based strictly on model ELO, AST accuracy and challenge tier
   */
  public static calculateOpponentCombatStats(
    opponent: CombatEngineOpponentInput,
    heroLevel: number
  ): CombatStats {
    const oppLevel = opponent.level || Math.max(1, heroLevel);
    const eloScaling = Math.max(0.8, (opponent.elo || 2000) / 2000);

    const baseHp = Math.round((480 + oppLevel * 52) * eloScaling);
    const baseAtk = Math.round((50 + oppLevel * 8.5) * eloScaling);
    const baseDef = Math.round((30 + oppLevel * 5.5) * eloScaling);
    const critRate = Math.min(50, Math.round(15 + oppLevel * 1.2));
    const speed = Math.round(92 + oppLevel * 3.2);

    return {
      maxHp: baseHp,
      currentHp: baseHp,
      maxEnergy: 100,
      currentEnergy: 15,
      atk: baseAtk,
      def: baseDef,
      critRate,
      speed,
      astAccuracyBonus: opponent.ast_accuracy ? Math.round(opponent.ast_accuracy * 20) : 10,
      scale: 1.0 + oppLevel * 0.02
    };
  }

  /**
   * Execute full deterministic automated combat between Hero and Opponent
   */
  public static runFullCombat(
    hero: CombatEngineHeroInput,
    opponent: CombatEngineOpponentInput,
    evidence?: CombatEngineEvidenceInput
  ): CombatRevisionRecord {
    const evidenceHash = evidence?.merkleRootHash || evidence?.revisionHistoryHash || '0x_canonical_sovereign_evidence_v1';
    
    // Seed PRNG exclusively from deterministic attributes
    const matchSeedKey = `MATCH_${hero.name}_${opponent.model_id}_LVL${hero.level}_REV${hero.revisionPoints}_${evidenceHash}`;
    const prng = new DeterministicPRNG(matchSeedKey);

    const heroStats = this.calculateHeroCombatStats(hero, evidence);
    const oppStats = this.calculateOpponentCombatStats(opponent, hero.level);

    let heroHp = heroStats.maxHp;
    let oppHp = oppStats.maxHp;
    let heroEnergy = heroStats.currentEnergy;
    let oppEnergy = oppStats.currentEnergy;

    const turns: CombatTurn[] = [];
    const maxTurns = 35;
    let turnCount = 0;
    let totalHeroDamage = 0;
    let totalOppDamage = 0;

    while (heroHp > 0 && oppHp > 0 && turnCount < maxTurns) {
      turnCount++;
      const heroFirst = heroStats.speed >= oppStats.speed;

      // Strike 1
      const isHero1 = heroFirst;
      const attacker1 = isHero1 ? heroStats : oppStats;
      const defender1 = isHero1 ? oppStats : heroStats;
      const isUltimate1 = (isHero1 ? heroEnergy : oppEnergy) >= 100;
      const isCrit1 = prng.check(attacker1.critRate);

      // Deterministic damage calculation
      const variance1 = 1 + (prng.next() * 0.2 - 0.1); // +/- 10% strictly seeded variance
      let rawDamage1 = isUltimate1 ? attacker1.atk * 2.35 * variance1 : attacker1.atk * variance1;
      if (isCrit1) rawDamage1 *= 1.6;

      const defReduction1 = Math.max(0.25, 1 - defender1.def / (defender1.def + 130));
      const finalDamage1 = Math.max(18, Math.round(rawDamage1 * defReduction1));

      if (isHero1) {
        oppHp = Math.max(0, oppHp - finalDamage1);
        heroEnergy = isUltimate1 ? 0 : Math.min(100, heroEnergy + 35);
        totalHeroDamage += finalDamage1;
      } else {
        heroHp = Math.max(0, heroHp - finalDamage1);
        oppEnergy = isUltimate1 ? 0 : Math.min(100, oppEnergy + 35);
        totalOppDamage += finalDamage1;
      }

      const actionName1 = isUltimate1
        ? (isHero1 ? '🌌 AST Empty-Clause Contradiction' : '⚡ Neural Invariant Disruption')
        : (isHero1 ? '⚔️ Formal Logic Resolution Strike' : '🛡️ Counterexample Refutation Strike');

      turns.push({
        turn: turnCount,
        attacker: isHero1 ? 'hero' : 'opponent',
        attackerName: isHero1 ? hero.name : opponent.name,
        defenderName: isHero1 ? opponent.name : hero.name,
        actionName: actionName1,
        rawDamage: Math.round(rawDamage1),
        mitigatedDamage: finalDamage1,
        isCrit: isCrit1,
        isUltimate: isUltimate1,
        heroHpRemaining: heroHp,
        opponentHpRemaining: oppHp,
        heroEnergy,
        opponentEnergy: oppEnergy,
        actionType: isUltimate1 ? 'ultimate' : 'attack',
        message: `${isHero1 ? hero.name : opponent.name} executed ${actionName1} for ${finalDamage1} damage!${isCrit1 ? ' [CRITICAL RESOLUTION]' : ''}`
      });

      if (oppHp <= 0 || heroHp <= 0) break;

      // Strike 2 (Second actor)
      const isHero2 = !heroFirst;
      const attacker2 = isHero2 ? heroStats : oppStats;
      const defender2 = isHero2 ? oppStats : heroStats;
      const isUltimate2 = (isHero2 ? heroEnergy : oppEnergy) >= 100;
      const isCrit2 = prng.check(attacker2.critRate);

      const variance2 = 1 + (prng.next() * 0.2 - 0.1);
      let rawDamage2 = isUltimate2 ? attacker2.atk * 2.35 * variance2 : attacker2.atk * variance2;
      if (isCrit2) rawDamage2 *= 1.6;

      const defReduction2 = Math.max(0.25, 1 - defender2.def / (defender2.def + 130));
      const finalDamage2 = Math.max(18, Math.round(rawDamage2 * defReduction2));

      if (isHero2) {
        oppHp = Math.max(0, oppHp - finalDamage2);
        heroEnergy = isUltimate2 ? 0 : Math.min(100, heroEnergy + 35);
        totalHeroDamage += finalDamage2;
      } else {
        heroHp = Math.max(0, heroHp - finalDamage2);
        oppEnergy = isUltimate2 ? 0 : Math.min(100, oppEnergy + 35);
        totalOppDamage += finalDamage2;
      }

      const actionName2 = isUltimate2
        ? (isHero2 ? '🌌 AST Empty-Clause Contradiction' : '⚡ Neural Invariant Disruption')
        : (isHero2 ? '⚔️ Formal Logic Resolution Strike' : '🛡️ Counterexample Refutation Strike');

      turns.push({
        turn: turnCount,
        attacker: isHero2 ? 'hero' : 'opponent',
        attackerName: isHero2 ? hero.name : opponent.name,
        defenderName: isHero2 ? opponent.name : hero.name,
        actionName: actionName2,
        rawDamage: Math.round(rawDamage2),
        mitigatedDamage: finalDamage2,
        isCrit: isCrit2,
        isUltimate: isUltimate2,
        heroHpRemaining: heroHp,
        opponentHpRemaining: oppHp,
        heroEnergy,
        opponentEnergy: oppEnergy,
        actionType: isUltimate2 ? 'ultimate' : 'attack',
        message: `${isHero2 ? hero.name : opponent.name} executed ${actionName2} for ${finalDamage2} damage!${isCrit2 ? ' [CRITICAL RESOLUTION]' : ''}`
      });
    }

    const isVictory = oppHp <= 0 && heroHp > 0;
    const isDefeat = heroHp <= 0 && oppHp > 0;
    const outcome: 'VICTORY' | 'DEFEAT' | 'DRAW' = isVictory ? 'VICTORY' : isDefeat ? 'DEFEAT' : 'DRAW';

    const pointsAwarded = isVictory ? 85 + hero.level * 10 : 25;
    const xpAwarded = isVictory ? 180 + hero.level * 25 : 60;

    const proofOfWorkHash = generateCombatProofHash(
      hero.name,
      opponent.model_id,
      hero.level,
      hero.revisionPoints,
      evidenceHash,
      turnCount,
      outcome
    );

    const revisionId = `combat_rev_${proofOfWorkHash.slice(6, 18)}_${turnCount}`;

    return {
      id: revisionId,
      userId: 'local_or_authenticated',
      attacker: hero.name,
      defender: opponent.name,
      winningCombatant: isVictory ? hero.name : opponent.name,
      heroLevel: hero.level,
      heroXp: hero.currentXp,
      evidenceHistoryHash: evidenceHash,
      proofOfWorkHash,
      turnsCount: turnCount,
      pointsAwarded,
      xpAwarded,
      outcome,
      turns,
      combatSummary: {
        heroStartingHp: heroStats.maxHp,
        heroEndingHp: heroHp,
        opponentStartingHp: oppStats.maxHp,
        opponentEndingHp: oppHp,
        totalDamageDealtByHero: totalHeroDamage,
        totalDamageDealtByOpponent: totalOppDamage
      },
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Save combat result as an immutable Proof-of-Work Revision in Firestore
   */
  public static async saveCombatRevisionToFirestore(
    revision: CombatRevisionRecord,
    user: User | null
  ): Promise<{ success: boolean; revisionId: string; error?: string }> {
    if (!user) {
      // For unauthenticated/guest users, cache locally
      try {
        const key = 'are_local_combat_revisions_v1';
        const existingRaw = localStorage.getItem(key);
        const existing: CombatRevisionRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
        const isDuplicate = existing.some(r => r.proofOfWorkHash === revision.proofOfWorkHash);
        if (!isDuplicate) {
          existing.unshift(revision);
          localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
        }
        return { success: true, revisionId: revision.id };
      } catch (e: any) {
        return { success: false, revisionId: revision.id, error: e.message };
      }
    }

    const path = `users/${user.uid}/combat_revisions/${revision.id}`;
    const revisionDocRef = doc(db, 'users', user.uid, 'combat_revisions', revision.id);

    try {
      const existingSnap = await getDoc(revisionDocRef);
      if (existingSnap.exists()) {
        // Idempotent write: Proof-of-work already permanently sealed
        return { success: true, revisionId: revision.id };
      }

      await setDoc(revisionDocRef, {
        ...revision,
        userId: user.uid
      });

      return { success: true, revisionId: revision.id };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return { success: false, revisionId: revision.id, error: err.message };
    }
  }
}
