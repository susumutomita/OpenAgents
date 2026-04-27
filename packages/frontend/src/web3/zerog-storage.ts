import type { PlayLog } from '@gradiusweb3/shared/browser';

/// Put a play log JSON onto 0G Storage and return the CID.
///
/// TODO: replace with real @0glabs/0g-ts-sdk integration. The SDK requires
/// a signer + indexer endpoint and a browser bundle that has not yet been
/// wired into Vite. For the hackathon demo we compute a deterministic
/// SHA-256 fingerprint so the CID is stable per play log; the real SDK call
/// will substitute here without changing the surrounding pipeline.
export async function putPlayLog(playLog: PlayLog): Promise<{ cid: string }> {
  const json = JSON.stringify(playLog);
  const data = new TextEncoder().encode(json);
  const digestBuffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { cid: `sha256-${hex.slice(0, 32)}` };
}
