import type { Capsule } from './types';

export const SLOT_CAPSULES = [
  'speed',
  'missile',
  'double',
  'laser',
  'option',
  'shield',
] as const;

export const MOAI_IDS = ['aegis', 'razor', 'oracle', 'comet', 'hive'] as const;

export const TOOLS = [
  'axl-messaging',
  'market-scanner',
  'uniswap-router',
  'circuit-breaker',
  'peer-orchestrator',
] as const;

export const MOAI_SPECIALTIES = {
  aegis: 'shield',
  razor: 'laser',
  oracle: 'missile',
  comet: 'speed',
  hive: 'option',
} as const;

export const TRADEOFF_LABELS = [
  'Slow & Safe / Fast & Risky',
  'Specialist / Generalist',
  'Solo / Cooperative',
  'Conservative / Conviction',
  'Low Leverage / High Leverage',
  'Long Horizon / Short Horizon',
] as const;

export function capsuleAtBarPosition(position: number): Capsule {
  const capsule =
    SLOT_CAPSULES[
      ((position % SLOT_CAPSULES.length) + SLOT_CAPSULES.length) %
        SLOT_CAPSULES.length
    ];

  if (!capsule) {
    throw new Error(`Invalid bar position: ${position}`);
  }

  return capsule;
}
