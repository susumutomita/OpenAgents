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

describe('executeFirstSwap - mainnet 始発でも switch を試み、reject されたら止める', () => {
  it('mainnet 上で wallet が switch を拒否すると writeContract に到達せず chain mismatch で止まる', async () => {
    const switchAttempts: Array<{ id: number }> = [];
    const walletClient = {
      account: {
        address: '0x000000000000000000000000000000000000dEaD',
      },
      getChainId: async () => 1,
      switchChain: async (args: { id: number }) => {
        switchAttempts.push(args);
        // ユーザーが MetaMask の switch ダイアログで Reject を押した相当
        throw new Error('user rejected the request');
      },
      writeContract: async () => {
        throw new Error(
          'writeContract must not be called when chain switch was rejected'
        );
      },
    } as unknown as WalletClient;

    await expect(executeFirstSwap(walletClient)).rejects.toThrow(
      /chain mismatch.*Sepolia/i
    );
    // user reject 経路でも switch は必ず 1 回試される (mainnet 始発の人を救う唯一の経路)
    expect(switchAttempts).toEqual([{ id: sepolia.id }]);
  });

  it('mainnet 始発でも switch が成功すれば writeContract まで届く', async () => {
    const switchAttempts: Array<{ id: number }> = [];
    let currentChainId = 1;
    let writeContractCalls = 0;
    const walletClient = {
      account: {
        address: '0x000000000000000000000000000000000000dEaD',
      },
      getChainId: async () => currentChainId,
      switchChain: async (args: { id: number }) => {
        switchAttempts.push(args);
        currentChainId = args.id;
      },
      writeContract: async () => {
        writeContractCalls += 1;
        // 実際に tx を送るところまでは行かないので、ここで意図的に止める
        throw new Error('mock: tx send not implemented in test');
      },
    } as unknown as WalletClient;

    await expect(executeFirstSwap(walletClient)).rejects.toThrow(
      'mock: tx send not implemented in test'
    );
    expect(switchAttempts).toEqual([{ id: sepolia.id }]);
    expect(writeContractCalls).toBe(1);
    expect(currentChainId).toBe(sepolia.id);
  });
});
