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
import { errorMessage } from './utils';
import { mintINft } from './zerog-mint';
import {
  type ZeroGSigner,
  buildZeroGSigner,
  putPlayLog,
} from './zerog-storage';

function toHexBytes(maybeHex: string): Hex {
  return (maybeHex.startsWith('0x') ? maybeHex : `0x${maybeHex}`) as Hex;
}

/// Pure aggregator: takes the resolved/rejected branches of the on-chain
/// pipeline and produces an OnChainProof. Exported for unit testing the
/// success/fail aggregation independently of the SDK calls.
///
/// storage と mint は chain として依存しているが、画面上は独立した行として
/// 表示するので失敗 reason も別々に渡す。例えば storage put が成功して mint
/// が VITE_INFT_ADDRESS 未設定で落ちた場合、storage 行は success、mint 行
/// は failed として正確にレポートする (それまでは両方 mint の error message
/// で塗りつぶされていた)。
export function aggregateProof(
  storageSettled: PromiseSettledResult<StorageProof>,
  mintSettled: PromiseSettledResult<MintProof>,
  ensSettled: PromiseSettledResult<EnsProof>
): OnChainProof {
  return {
    ...idleProof,
    storage:
      storageSettled.status === 'fulfilled'
        ? { status: 'success', data: storageSettled.value }
        : { status: 'failed', error: errorMessage(storageSettled.reason) },
    mint:
      mintSettled.status === 'fulfilled'
        ? { status: 'success', data: mintSettled.value }
        : { status: 'failed', error: errorMessage(mintSettled.reason) },
    ens:
      ensSettled.status === 'fulfilled'
        ? { status: 'success', data: ensSettled.value }
        : { status: 'failed', error: errorMessage(ensSettled.reason) },
  };
}

/// Run the on-chain forge pipeline: storage put → mint (mint depends on
/// the CID, so it's chained sequentially) and ENS subname registration in
/// parallel. Each row is reported independently so a single failure (e.g.
/// mint reverting because the contract isn't deployed yet) doesn't mask
/// upstream successes.
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

  const storageThenMint = (async (): Promise<{
    storageSettled: PromiseSettledResult<StorageProof>;
    mintSettled: PromiseSettledResult<MintProof>;
  }> => {
    // 0G Storage に playLog を real put。signer 構築に失敗したら sha256 fallback。
    let signer: ZeroGSigner | undefined;
    try {
      signer = await buildZeroGSigner(walletClient);
    } catch {
      signer = undefined;
    }
    let storage: StorageProof;
    try {
      storage = await putPlayLog(draft.playLog, signer);
    } catch (storageError) {
      return {
        storageSettled: { status: 'rejected', reason: storageError },
        mintSettled: {
          status: 'rejected',
          reason: new Error('skipped: storage upload failed'),
        },
      };
    }
    try {
      const mint = await mintINft(walletClient, {
        ensName: draft.agent.ensName,
        playLogHash,
        policyBlob: '0x' as Hex,
        archetype: draft.agent.archetype,
        combatPower: BigInt(draft.agent.profile.combatPower),
        storageCID: storage.cid,
      });
      return {
        storageSettled: { status: 'fulfilled', value: storage },
        mintSettled: { status: 'fulfilled', value: mint },
      };
    } catch (mintError) {
      return {
        storageSettled: { status: 'fulfilled', value: storage },
        mintSettled: { status: 'rejected', reason: mintError },
      };
    }
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

  const [{ storageSettled, mintSettled }, ensSettled] = await Promise.all([
    storageThenMint,
    ensPromise.then(
      (value): PromiseSettledResult<EnsProof> => ({
        status: 'fulfilled',
        value,
      }),
      (reason): PromiseSettledResult<EnsProof> => ({
        status: 'rejected',
        reason,
      })
    ),
  ]);

  return aggregateProof(storageSettled, mintSettled, ensSettled);
}
