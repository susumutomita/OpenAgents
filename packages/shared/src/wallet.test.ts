import { describe, expect, it } from 'bun:test';
import { createAgentBirthDraft } from './forge';
import type { PlayLog } from './types';
import { deriveWalletFromPlayLog, shortAddress } from './wallet';

const basePlayLog: PlayLog = {
  sessionId: 'session-seed',
  durationMs: 48000,
  finalScore: 3600,
  events: [
    { kind: 'capsule', t: 1000, capsule: 'laser' },
    { kind: 'barAdvance', t: 1001, position: 3 },
    { kind: 'commit', t: 1400, position: 3, capsule: 'laser' },
    { kind: 'moaiKill', t: 2200, moaiId: 'razor' },
  ],
};

describe('プレイログからウォレットを導出する', () => {
  it('同じプレイログなら同じ wallet を返す', async () => {
    const a = await deriveWalletFromPlayLog(basePlayLog);
    const b = await deriveWalletFromPlayLog(basePlayLog);
    expect(a).toEqual(b);
  });

  it('プレイヤー名から ENS 名と tokenId を組み立てる', async () => {
    const draft = await createAgentBirthDraft('Kotetsu Pilot', basePlayLog);

    expect(draft.agent.ensName).toStartWith('kotetsu-pilot-');
    expect(Number(draft.agent.tokenId)).toBeGreaterThan(0);
  });
});

describe('ウォレットアドレスを表示用に短縮する', () => {
  it('40 文字 hex アドレスを 0xABCDEF…WXYZ 形式に省略する', () => {
    const full = '0x1234567890abcdef1234567890abcdef12345678';
    expect(shortAddress(full)).toBe('0x1234…5678');
  });

  it('12 文字以下の文字列はそのまま返す (省略する意味がないため)', () => {
    expect(shortAddress('0xabcd')).toBe('0xabcd');
    expect(shortAddress('0x1234567890')).toBe('0x1234567890');
  });

  it('13 文字以上から省略を始める (境界値)', () => {
    expect(shortAddress('0x123456789012')).toBe('0x1234…9012');
  });

  it('空文字列はそのまま返す', () => {
    expect(shortAddress('')).toBe('');
  });
});
