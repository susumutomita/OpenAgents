import { beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { StoredAgentBirth } from '@openagents/shared';
import { createApp } from './app';
import { FileBirthRepository } from './repository';

let testDirectory = '';

beforeAll(async () => {
  testDirectory = await mkdtemp(path.join(tmpdir(), 'openagents-backend-'));
});

describe('backend API', () => {
  it('birth endpoint で forged agent を保存して返す', async () => {
    const repository = new FileBirthRepository(
      path.join(testDirectory, 'births.jsonl')
    );
    const app = createApp(repository);

    const response = await app.request('/api/birth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        playerName: 'Kotetsu',
        playLog: {
          sessionId: 'session-backend',
          durationMs: 45000,
          finalScore: 3900,
          events: [
            { kind: 'capsule', t: 1000, capsule: 'option' },
            { kind: 'barAdvance', t: 1001, position: 1 },
            { kind: 'commit', t: 1300, position: 4, capsule: 'option' },
            { kind: 'capsule', t: 1500, capsule: 'option' },
            { kind: 'barAdvance', t: 1501, position: 2 },
            { kind: 'commit', t: 1700, position: 4, capsule: 'option' },
            { kind: 'moaiKill', t: 2100, moaiId: 'hive' },
            {
              kind: 'pass',
              t: 2400,
              enemyId: 'enemy-2',
              tradeoffLabel: 'Solo / Cooperative',
            },
          ],
        },
      }),
    });

    const body = (await response.json()) as StoredAgentBirth;

    expect(response.status).toBe(201);
    expect(body.agent.ensName).toContain('.openagents.eth');
    expect(body.agent.policy.swarmEnabled).toBeTrue();
  });

  it('feed endpoint で SSE を返す', async () => {
    const repository = new FileBirthRepository(
      path.join(testDirectory, 'births-feed.jsonl')
    );
    const app = createApp(repository);

    await app.request('/api/birth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        playerName: 'Razor',
        playLog: {
          sessionId: 'session-feed',
          durationMs: 43000,
          finalScore: 5100,
          events: [
            { kind: 'capsule', t: 900, capsule: 'laser' },
            { kind: 'barAdvance', t: 901, position: 3 },
            { kind: 'commit', t: 1100, position: 3, capsule: 'laser' },
            { kind: 'moaiKill', t: 1700, moaiId: 'razor' },
          ],
        },
      }),
    });

    const response = await app.request('/api/agents/session-feed/feed');
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('event: birth');
    expect(text).toContain('Combat Power');
  });
});
