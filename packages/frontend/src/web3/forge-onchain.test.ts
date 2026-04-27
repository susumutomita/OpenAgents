import { describe, expect, it } from 'bun:test';
import { aggregateProof } from './forge-onchain';
import type { EnsProof, MintProof, StorageProof } from './types';

const SAMPLE_STORAGE: StorageProof = { cid: 'sha256-deadbeef' };
const SAMPLE_MINT: MintProof = {
  txHash: '0xabc',
  tokenId: '12345',
  explorerUrl: 'https://chainscan-galileo.0g.ai/tx/0xabc',
};
const SAMPLE_ENS: EnsProof = {
  name: 'kotetsu-abc.gradiusweb3.eth',
  resolverUrl: 'https://sepolia.app.ens.domains/kotetsu-abc.gradiusweb3.eth',
};

describe('aggregateProof - オンチェーン pipeline 結果集約', () => {
  it('全ステップ成功時に 4 つのスロットを success にする', () => {
    const proof = aggregateProof(
      {
        status: 'fulfilled',
        value: { storage: SAMPLE_STORAGE, mint: SAMPLE_MINT },
      },
      { status: 'fulfilled', value: SAMPLE_ENS }
    );
    expect(proof.storage).toEqual({ status: 'success', data: SAMPLE_STORAGE });
    expect(proof.mint).toEqual({ status: 'success', data: SAMPLE_MINT });
    expect(proof.ens).toEqual({ status: 'success', data: SAMPLE_ENS });
    expect(proof.swap).toEqual({ status: 'idle' });
  });

  it('storage→mint チェーン失敗時は両方を failed にして ENS は独立評価する', () => {
    const proof = aggregateProof(
      { status: 'rejected', reason: new Error('rpc timeout') },
      { status: 'fulfilled', value: SAMPLE_ENS }
    );
    expect(proof.storage.status).toBe('failed');
    expect(proof.storage.error).toBe('rpc timeout');
    expect(proof.mint.status).toBe('failed');
    expect(proof.mint.error).toBe('rpc timeout');
    expect(proof.ens).toEqual({ status: 'success', data: SAMPLE_ENS });
  });

  it('ENS 失敗時も他のステップを成功扱いに保つ', () => {
    const proof = aggregateProof(
      {
        status: 'fulfilled',
        value: { storage: SAMPLE_STORAGE, mint: SAMPLE_MINT },
      },
      { status: 'rejected', reason: new Error('user rejected signature') }
    );
    expect(proof.mint.status).toBe('success');
    expect(proof.storage.status).toBe('success');
    expect(proof.ens.status).toBe('failed');
    expect(proof.ens.error).toBe('user rejected signature');
  });

  it('Error 以外の reason も文字列化してエラー欄に格納する', () => {
    const proof = aggregateProof(
      { status: 'rejected', reason: 'plain string failure' },
      { status: 'rejected', reason: 42 }
    );
    expect(proof.mint.error).toBe('plain string failure');
    expect(proof.storage.error).toBe('plain string failure');
    expect(proof.ens.error).toBe('unknown error');
  });

  it('swap スロットは初期状態が idle のまま (orchestrator では更新しない)', () => {
    const proof = aggregateProof(
      {
        status: 'fulfilled',
        value: { storage: SAMPLE_STORAGE, mint: SAMPLE_MINT },
      },
      { status: 'fulfilled', value: SAMPLE_ENS }
    );
    expect(proof.swap.status).toBe('idle');
    expect(proof.swap.data).toBeUndefined();
  });
});
