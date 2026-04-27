import type { AgentBirthDraft } from '@gradiusweb3/shared/browser';
import type { Address, Hex, WalletClient } from 'viem';
import { registerSubname } from './ens-register';
import {
  type EnsProof,
  type MintProof,
  type OnChainProof,
  type StorageProof,
  idleProof,
} from './types';
import { mintINft } from './zerog-mint';
import { putPlayLog } from './zerog-storage';

function toHexBytes(maybeHex: string): Hex {
  return (maybeHex.startsWith('0x') ? maybeHex : `0x${maybeHex}`) as Hex;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === 'string' ? reason : 'unknown error';
}

/// Pure aggregator: takes the resolved/rejected branches of the on-chain
/// pipeline and produces an OnChainProof. Exported for unit testing the
/// success/fail aggregation independently of the SDK calls.
export function aggregateProof(
  storageMintSettled: PromiseSettledResult<{
    storage: StorageProof;
    mint: MintProof;
  }>,
  ensSettled: PromiseSettledResult<EnsProof>
): OnChainProof {
  return {
    ...idleProof,
    storage:
      storageMintSettled.status === 'fulfilled'
        ? { status: 'success', data: storageMintSettled.value.storage }
        : { status: 'failed', error: errorMessage(storageMintSettled.reason) },
    mint:
      storageMintSettled.status === 'fulfilled'
        ? { status: 'success', data: storageMintSettled.value.mint }
        : { status: 'failed', error: errorMessage(storageMintSettled.reason) },
    ens:
      ensSettled.status === 'fulfilled'
        ? { status: 'success', data: ensSettled.value }
        : { status: 'failed', error: errorMessage(ensSettled.reason) },
  };
}

/// Run the on-chain forge pipeline: storage put → mint (chained, since the
/// CID has to be embedded in the iNFT metadata) plus ENS subname registration
/// in parallel. Each independent branch is wrapped in Promise.allSettled so a
/// single failure never blocks the rest of the dashboard.
///
/// Pure orchestration: this function does not throw. It always resolves with
/// an OnChainProof where each step is either success or failed.
export async function runOnChainForge(
  walletClient: WalletClient,
  draft: AgentBirthDraft
): Promise<OnChainProof> {
  const account = walletClient.account;
  if (!account) {
    return {
      ...idleProof,
      mint: { status: 'failed', error: 'wallet not connected' },
      storage: { status: 'failed', error: 'wallet not connected' },
      ens: { status: 'failed', error: 'wallet not connected' },
    };
  }

  const owner = account.address as Address;
  const handle = draft.agent.ensName.split('.')[0] ?? 'pilot';

  const playLogHash = toHexBytes(draft.agent.birthHash);

  const storageThenMint = (async () => {
    const storage = await putPlayLog(draft.playLog);
    const mint = await mintINft(walletClient, {
      ensName: draft.agent.ensName,
      playLogHash,
      policyBlob: '0x' as Hex,
      archetype: draft.agent.archetype,
      combatPower: BigInt(draft.agent.profile.combatPower),
      storageCID: storage.cid,
    });
    return { storage, mint };
  })();

  const ensPromise = registerSubname(walletClient, {
    handle,
    owner,
    textRecords: {
      'combat-power': String(draft.agent.profile.combatPower),
      archetype: draft.agent.archetype,
      'design-hash': draft.agent.birthHash,
    },
  });

  const [storageMintSettled, ensSettled] = await Promise.allSettled([
    storageThenMint,
    ensPromise,
  ]);

  return aggregateProof(storageMintSettled, ensSettled);
}
