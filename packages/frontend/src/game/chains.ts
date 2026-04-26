export interface ChainProfile {
  name: string;
  color: string;
  bulletVx: number;
  fireCadence: number;
  gasPerShot: number;
  lagChance: number;
  enemyVx: number;
  desc: string;
}

export const CHAINS: Record<'ETH' | 'SOL' | 'ARB', ChainProfile> = {
  ETH: {
    name: 'ETHEREUM',
    color: '#627eea',
    bulletVx: 2.4,
    fireCadence: 14,
    gasPerShot: 0.04,
    lagChance: 0,
    enemyVx: 0.7,
    desc: 'Slow · expensive · safe',
  },
  SOL: {
    name: 'SOLANA',
    color: '#14f195',
    bulletVx: 8,
    fireCadence: 3,
    gasPerShot: 0.002,
    lagChance: 0.06,
    enemyVx: 1.6,
    desc: 'Fast · cheap · unstable',
  },
  ARB: {
    name: 'ARBITRUM',
    color: '#28a0f0',
    bulletVx: 5,
    fireCadence: 6,
    gasPerShot: 0.008,
    lagChance: 0.01,
    enemyVx: 1,
    desc: 'Balanced · L2 rollup',
  },
};

export type ChainId = keyof typeof CHAINS;
