import {
  MOAI_IDS,
  type PlayLog,
  SLOT_CAPSULES,
  createAgentBirthDraft,
} from '@openagents/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { FileBirthRepository, resolveBirthLogPath } from './repository';

interface BirthRequestBody {
  playerName: string;
  playLog: PlayLog;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlayLog(value: unknown): value is PlayLog {
  if (!isObject(value)) {
    return false;
  }

  if (
    typeof value.sessionId !== 'string' ||
    typeof value.durationMs !== 'number' ||
    typeof value.finalScore !== 'number' ||
    !Array.isArray(value.events)
  ) {
    return false;
  }

  return value.events.every((event) => {
    if (
      !isObject(event) ||
      typeof event.kind !== 'string' ||
      typeof event.t !== 'number'
    ) {
      return false;
    }

    switch (event.kind) {
      case 'shoot':
      case 'pass':
        return (
          typeof event.enemyId === 'string' &&
          typeof event.tradeoffLabel === 'string'
        );
      case 'capsule':
        return (
          typeof event.capsule === 'string' &&
          SLOT_CAPSULES.includes(
            event.capsule as (typeof SLOT_CAPSULES)[number]
          )
        );
      case 'barAdvance':
        return typeof event.position === 'number';
      case 'commit':
        return (
          typeof event.position === 'number' &&
          typeof event.capsule === 'string' &&
          SLOT_CAPSULES.includes(
            event.capsule as (typeof SLOT_CAPSULES)[number]
          )
        );
      case 'moaiKill':
        return (
          typeof event.moaiId === 'string' &&
          MOAI_IDS.includes(event.moaiId as (typeof MOAI_IDS)[number])
        );
      case 'hit':
        return typeof event.damage === 'number';
      default:
        return false;
    }
  });
}

function parseBirthRequestBody(value: unknown): BirthRequestBody | null {
  if (
    !isObject(value) ||
    typeof value.playerName !== 'string' ||
    !isPlayLog(value.playLog)
  ) {
    return null;
  }

  return {
    playerName: value.playerName.trim() || 'Pilot',
    playLog: value.playLog,
  };
}

export function createApp(
  repository = new FileBirthRepository(resolveBirthLogPath())
) {
  const app = new Hono();
  app.use('*', cors());

  app.get('/health', (context) => context.json({ status: 'ok' }));

  app.post('/api/birth', async (context) => {
    const parsed = parseBirthRequestBody(
      await context.req.json().catch(() => null)
    );

    if (!parsed) {
      return context.json({ error: 'Invalid birth payload.' }, 400);
    }

    const storedBirth =
      (await repository.findBySessionId(parsed.playLog.sessionId)) ??
      (await repository.save({
        ...createAgentBirthDraft(parsed.playerName, parsed.playLog),
        createdAt: new Date().toISOString(),
      }));

    return context.json(storedBirth, 201);
  });

  app.get('/api/agents/:sessionId', async (context) => {
    const record = await repository.findBySessionId(
      context.req.param('sessionId')
    );

    if (!record) {
      return context.json({ error: 'Agent not found.' }, 404);
    }

    return context.json(record);
  });

  app.get('/api/agents/:sessionId/feed', async (context) => {
    const record = await repository.findBySessionId(
      context.req.param('sessionId')
    );

    if (!record) {
      return context.json({ error: 'Agent not found.' }, 404);
    }

    return streamSSE(context, async (stream) => {
      for (const item of record.feed) {
        await stream.writeSSE({
          id: item.id,
          event: item.category,
          data: JSON.stringify(item),
        });
      }
    });
  });

  return app;
}
