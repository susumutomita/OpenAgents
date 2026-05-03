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
      { status: 'fulfilled', value: SAMPLE_STORAGE },
      { status: 'fulfilled', value: SAMPLE_MINT },
      { status: 'fulfilled', value: SAMPLE_ENS }
    );
    expect(proof.storage).toEqual({ status: 'success', data: SAMPLE_STORAGE });
    expect(proof.mint).toEqual({ status: 'success', data: SAMPLE_MINT });
    expect(proof.ens).toEqual({ status: 'success', data: SAMPLE_ENS });
    expect(proof.swap).toEqual({ status: 'idle' });
  });

  it('storage 成功 / mint 失敗 を独立してレポートする (混線させない)', () => {
    const proof = aggregateProof(
      { status: 'fulfilled', value: SAMPLE_STORAGE },
      { status: 'rejected', reason: new Error('VITE_INFT_ADDRESS unset') },
      { status: 'fulfilled', value: SAMPLE_ENS }
    );
    expect(proof.storage).toEqual({ status: 'success', data: SAMPLE_STORAGE });
    expect(proof.mint.status).toBe('failed');
    expect(proof.mint.error).toBe('VITE_INFT_ADDRESS unset');
    expect(proof.ens).toEqual({ status: 'success', data: SAMPLE_ENS });
  });

  it('storage 失敗時に mint も失敗扱い (orchestrator 側で skip 理由を入れる)', () => {
    const proof = aggregateProof(
      { status: 'rejected', reason: new Error('rpc timeout') },
      {
        status: 'rejected',
        reason: new Error('skipped: storage upload failed'),
      },
      { status: 'fulfilled', value: SAMPLE_ENS }
    );
    expect(proof.storage.status).toBe('failed');
    expect(proof.storage.error).toBe('rpc timeout');
    expect(proof.mint.status).toBe('failed');
    expect(proof.mint.error).toBe('skipped: storage upload failed');
    expect(proof.ens).toEqual({ status: 'success', data: SAMPLE_ENS });
  });

  it('ENS 失敗時も他のステップを成功扱いに保つ', () => {
    const proof = aggregateProof(
      { status: 'fulfilled', value: SAMPLE_STORAGE },
      { status: 'fulfilled', value: SAMPLE_MINT },
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
      { status: 'rejected', reason: 'mint plain string' },
      { status: 'rejected', reason: 42 }
    );
    expect(proof.storage.error).toBe('plain string failure');
    expect(proof.mint.error).toBe('mint plain string');
    expect(proof.ens.error).toBe('unknown error');
  });

  it('swap スロットは初期状態が idle のまま (orchestrator では更新しない)', () => {
    const proof = aggregateProof(
      { status: 'fulfilled', value: SAMPLE_STORAGE },
      { status: 'fulfilled', value: SAMPLE_MINT },
      { status: 'fulfilled', value: SAMPLE_ENS }
    );
    expect(proof.swap.status).toBe('idle');
    expect(proof.swap.data).toBeUndefined();
  });
});
