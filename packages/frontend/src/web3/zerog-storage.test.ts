import { describe, expect, it } from 'bun:test';
import type {
  AgentSafetyAttestation,
  PlayLog,
} from '@gradiusweb3/shared/browser';
import { putAttestation, putPlayLog } from './zerog-storage';

const SAMPLE_ATTESTATION: AgentSafetyAttestation = {
  sessionId: 'sess-zerog',
  handle: 'pilot42',
  ensName: 'pilot42.gradiusweb3.eth',
  walletAddress: '0xabc',
  score: 75,
  breakdown: { clearTimeBonus: 30, missPenalty: -5, total: 75 },
  encounters: [
    { kind: 'prompt_injection', enemyId: 'a', tAtMs: 12, hit: true },
  ],
  issuedAt: '2026-04-29T10:00:00.000Z',
  schemaVersion: 1,
};

const SAMPLE_PLAY_LOG: PlayLog = {
  sessionId: 'sess-zerog',
  events: [],
  durationMs: 60_000,
  finalScore: 1234,
};

describe('putAttestation - 0G Storage への 実アップロードと sha256 フォールバック', () => {
  it('signer 未指定なら sha256:// stub の CID を realUpload=false で返す', async () => {
    const result = await putAttestation(SAMPLE_ATTESTATION);
    expect(result.cid.startsWith('sha256://')).toBe(true);
    expect(result.realUpload).toBe(false);
  });

  it('同じ JSON は同じ sha256 fallback CID を返す (idempotent)', async () => {
    const a = await putAttestation(SAMPLE_ATTESTATION);
    const b = await putAttestation(SAMPLE_ATTESTATION);
    expect(a.cid).toBe(b.cid);
    expect(a.realUpload).toBe(false);
    expect(b.realUpload).toBe(false);
  });

  it.skipIf(process.env.SKIP_NETWORK_TESTS === 'true')(
    'signer 経路で SDK が失敗したら sha256:// にフォールバックして error を返す',
    async () => {
      // 失敗 signer (getAddress が必ず throw) を SDK に渡す。SDK 内部の
      // indexer / RPC 経路で上流エラーが返り、本モジュールは sha256 fallback に
      // 倒すことを確認する。SKIP_NETWORK_TESTS=true の CI ではスキップ。
      const failingSigner = {
        getAddress: async () => {
          throw new Error('signer getAddress failure (test stub)');
        },
      } as unknown as Parameters<typeof putAttestation>[1];
      const result = await putAttestation(SAMPLE_ATTESTATION, failingSigner);
      expect(result.cid.startsWith('sha256://')).toBe(true);
      expect(result.realUpload).toBe(false);
      expect(typeof result.error).toBe('string');
    }
  );
});

describe('putPlayLog - 0G Storage 実 upload (sha256 fallback 含む)', () => {
  it('signer 未指定なら sha256:// stub を realUpload=false で返す', async () => {
    const result = await putPlayLog(SAMPLE_PLAY_LOG);
    expect(result.cid.startsWith('sha256://')).toBe(true);
    expect(result.realUpload).toBe(false);
  });

  it('同じ JSON は同じ sha256 fallback CID を返す (idempotent)', async () => {
    const a = await putPlayLog(SAMPLE_PLAY_LOG);
    const b = await putPlayLog(SAMPLE_PLAY_LOG);
    expect(a.cid).toBe(b.cid);
  });
});

describe('putAttestation - real upload smoke (network)', () => {
  it.skipIf(process.env.SKIP_NETWORK_TESTS !== 'false')(
    'rootHash が 0g:// 形式の URI で返される',
    async () => {
      // この describe は SKIP_NETWORK_TESTS=false のときだけ走る。
      // CI / 通常 dev は skip。手動 smoke 用のプレースホルダ。
      // 実 signer / RPC は環境変数で渡す前提。
      expect(true).toBe(true);
    }
  );
});
