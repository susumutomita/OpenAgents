import type { PlayLog, StoredAgentBirth } from '@openagents/shared/browser';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function forgeAgent(playerName: string, playLog: PlayLog) {
  const response = await fetch(`${API_BASE_URL}/api/birth`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      playerName,
      playLog,
    }),
  });

  if (!response.ok) {
    throw new Error('Birth request failed.');
  }

  return (await response.json()) as StoredAgentBirth;
}
