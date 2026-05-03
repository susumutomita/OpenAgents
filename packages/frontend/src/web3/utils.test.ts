import { describe, expect, it } from 'bun:test';
import type { WalletClient } from 'viem';
import { galileo, sepolia } from './chains';
import { executeFirstSwap } from './uniswap-swap';
import {
  assertSupportedTestnetChainId,
  describeSupportedTestnets,
  isSupportedTestnetChainId,
} from './utils';

describe('testnet guard - オンチェーン書き込みは testnet のみ許可する', () => {
  it('Sepolia と 0G Galileo だけを許可し、それ以外は拒否する', () => {
    expect(isSupportedTestnetChainId(sepolia.id)).toBe(true);
    expect(isSupportedTestnetChainId(galileo.id)).toBe(true);
    expect(isSupportedTestnetChainId(1)).toBe(false);
  });

  it('許可チェーン一覧を runbook と同じ順序で返す', () => {
    expect(describeSupportedTestnets()).toBe('Sepolia / 0G Galileo');
  });

  it('mainnet の chainId を受けると friendly なエラーで止める', () => {
    expect(() => assertSupportedTestnetChainId(1, 'connected wallet')).toThrow(
      'testnet only'
    );
  });
});

describe('executeFirstSwap - testnet 以外では write を開始しない', () => {
  it('mainnet 相当の chainId では swap 前に拒否する', async () => {
    const walletClient = {
      account: {
        address: '0x000000000000000000000000000000000000dEaD',
      },
      getChainId: async () => 1,
      switchChain: async () => {
        throw new Error('switchChain must not be called for mainnet');
      },
      writeContract: async () => {
        throw new Error('writeContract must not be called for mainnet');
      },
    } as unknown as WalletClient;

    await expect(executeFirstSwap(walletClient)).rejects.toThrow(
      'testnet only'
    );
  });
});
