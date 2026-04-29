import type {
  AgentSafetyAttestation,
  PlayLog,
} from '@gradiusweb3/shared/browser';

async function sha256ShortHex(json: string): Promise<string> {
  const data = new TextEncoder().encode(json);
  const digestBuffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 32);
}

/// Put a play log JSON onto 0G Storage and return the CID.
///
/// TODO: replace with real @0glabs/0g-ts-sdk integration. The SDK requires
/// a signer + indexer endpoint and a browser bundle that has not yet been
/// wired into Vite. For the hackathon demo we compute a deterministic
/// SHA-256 fingerprint so the CID is stable per play log; the real SDK call
/// will substitute here without changing the surrounding pipeline.
export async function putPlayLog(playLog: PlayLog): Promise<{ cid: string }> {
  const short = await sha256ShortHex(JSON.stringify(playLog));
  return { cid: `sha256-${short}` };
}

/// Put an AgentSafetyAttestation JSON onto 0G Storage and return the CID.
/// CID は `{scheme}://{value}` 形式に固定する。stub の間は `sha256://`、
/// 実 SDK 統合後は `0g://` プレフィックスに切替。ENS text record で parser
/// が scheme 判定できるようにすることで credential の検証経路を明示する。
export async function putAttestation(
  attestation: AgentSafetyAttestation
): Promise<{ cid: string }> {
  const short = await sha256ShortHex(JSON.stringify(attestation));
  return { cid: `sha256://${short}` };
}
