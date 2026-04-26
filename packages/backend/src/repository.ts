import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { StoredAgentBirth } from '@openagents/shared';

export function resolveBirthLogPath() {
  const repositoryRoot = path.resolve(import.meta.dir, '..', '..', '..');
  const configuredPath =
    process.env.OPENAGENTS_DATA_DIR ?? 'packages/backend/data';
  return path.resolve(repositoryRoot, configuredPath, 'births.jsonl');
}

export class FileBirthRepository {
  constructor(private readonly filePath: string) {}

  async list(): Promise<StoredAgentBirth[]> {
    try {
      const content = await readFile(this.filePath, 'utf8');
      return content
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as StoredAgentBirth);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return [];
      }
      throw error;
    }
  }

  async findBySessionId(sessionId: string) {
    const records = await this.list();
    return records.find((record) => record.sessionId === sessionId) ?? null;
  }

  async save(record: StoredAgentBirth) {
    const existing = await this.findBySessionId(record.sessionId);

    if (existing) {
      return existing;
    }

    await mkdir(path.dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(record)}\n`, 'utf8');
    return record;
  }
}
