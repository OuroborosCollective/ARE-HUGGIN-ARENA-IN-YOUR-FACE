import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { CharacterModel3DInfo } from '../components/ArenaViewport';
import { CombatEngine, CombatRevisionRecord } from './combatEngine';

export interface QueuedFighterInfo {
  id: string;
  name: string;
  characterClass: 'paladin' | 'archmage' | 'assassin' | 'berserker' | 'logic_knight';
  level: number;
  modelUrl?: string;
  scale?: number;
  description?: string;
  evidenceAffinity?: string;
}

export interface MatchQueueItem {
  id: string;
  userId: string;
  fighter1: QueuedFighterInfo;
  fighter2: QueuedFighterInfo;
  status: 'Pending' | 'Simulating' | 'Finalized';
  winnerName?: string;
  proofOfWorkHash?: string;
  turnsCount?: number;
  resultSummary?: string;
  createdAt: string;
  finalizedAt?: string;
  revisionRecord?: CombatRevisionRecord;
}

const LOCAL_QUEUE_KEY = 'are_deterministic_match_queue_v1';

export class MatchQueueService {
  /**
   * Queue a new deterministic match between two unlocked fighters
   */
  public static async queueMatch(
    user: User | null,
    fighter1: QueuedFighterInfo,
    fighter2: QueuedFighterInfo
  ): Promise<MatchQueueItem> {
    const queueId = `mq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newItem: MatchQueueItem = {
      id: queueId,
      userId: user?.uid || 'guest_user',
      fighter1,
      fighter2,
      status: 'Pending',
      createdAt: now
    };

    // Save locally
    try {
      const existingRaw = localStorage.getItem(LOCAL_QUEUE_KEY);
      const existing: MatchQueueItem[] = existingRaw ? JSON.parse(existingRaw) : [];
      existing.unshift(newItem);
      localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      console.warn('Local queue save error:', e);
    }

    // Save to Firestore in real-time if signed in
    if (user) {
      const path = `users/${user.uid}/match_queue/${queueId}`;
      const docRef = doc(db, 'users', user.uid, 'match_queue', queueId);
      try {
        await setDoc(docRef, newItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    return newItem;
  }

  /**
   * Execute deterministic simulation on a queued match and update status to Finalized
   */
  public static async executeSimulation(
    user: User | null,
    item: MatchQueueItem
  ): Promise<MatchQueueItem> {
    // 1. Run deterministic combat via CombatEngine
    const heroInput = {
      name: item.fighter1.name,
      className: item.fighter1.characterClass,
      level: item.fighter1.level || 1,
      currentXp: 100,
      totalBattles: 5,
      totalWins: 3,
      revisionPoints: 120,
      allocatedStats: { atkBonus: 2, defBonus: 2, hpBonus: 2, critBonus: 2 }
    };

    const oppInput = {
      model_id: item.fighter2.id,
      name: item.fighter2.name,
      org: 'Logic Arena Registry',
      elo: 2000 + (item.fighter2.level || 1) * 20,
      level: item.fighter2.level || 1
    };

    const combatResult = CombatEngine.runFullCombat(heroInput, oppInput, {
      merkleRootHash: `0x_queue_${item.id}_${item.fighter1.id}_vs_${item.fighter2.id}`
    });

    const isFighter1Winner = combatResult.outcome === 'VICTORY';
    const winnerName = isFighter1Winner ? item.fighter1.name : item.fighter2.name;

    const finalizedItem: MatchQueueItem = {
      ...item,
      status: 'Finalized',
      winnerName,
      proofOfWorkHash: combatResult.proofOfWorkHash,
      turnsCount: combatResult.turnsCount,
      resultSummary: `${winnerName} won in ${combatResult.turnsCount} turns! POW: ${combatResult.proofOfWorkHash.slice(0, 16)}`,
      finalizedAt: new Date().toISOString(),
      revisionRecord: combatResult
    };

    // Update locally
    try {
      const existingRaw = localStorage.getItem(LOCAL_QUEUE_KEY);
      if (existingRaw) {
        const existing: MatchQueueItem[] = JSON.parse(existingRaw);
        const idx = existing.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          existing[idx] = finalizedItem;
          localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(existing));
        }
      }
    } catch (e) {
      console.warn('Local update error:', e);
    }

    // Update in Firestore
    if (user) {
      const path = `users/${user.uid}/match_queue/${item.id}`;
      const docRef = doc(db, 'users', user.uid, 'match_queue', item.id);
      try {
        await setDoc(docRef, finalizedItem, { merge: true });
        // Also save the combat revision
        await CombatEngine.saveCombatRevisionToFirestore(combatResult, user);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    return finalizedItem;
  }

  /**
   * Delete a match from the queue
   */
  public static async deleteQueueItem(user: User | null, id: string): Promise<void> {
    try {
      const existingRaw = localStorage.getItem(LOCAL_QUEUE_KEY);
      if (existingRaw) {
        const existing: MatchQueueItem[] = JSON.parse(existingRaw);
        const filtered = existing.filter(i => i.id !== id);
        localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Local delete error:', e);
    }

    if (user) {
      const path = `users/${user.uid}/match_queue/${id}`;
      const docRef = doc(db, 'users', user.uid, 'match_queue', id);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  }
}
