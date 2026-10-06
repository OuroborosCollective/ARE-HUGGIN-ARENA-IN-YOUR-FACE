// Deterministic Seeded PRNG and hashing for verified combat
export function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export class DeterministicPRNG {
  private state: number;

  constructor(seed: number | string) {
    if (typeof seed === 'string') {
      this.state = hashString(seed);
    } else {
      this.state = seed >>> 0;
    }
    if (this.state === 0) this.state = 0x12345678;
  }

  // Linear congruential generator with Numerical Recipes constants
  public next(): number {
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  // Integer in range [min, max] inclusive
  public nextInt(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  // Boolean check with percentage probability (0 - 100)
  public check(chancePct: number): boolean {
    return this.next() * 100 < chancePct;
  }
}
