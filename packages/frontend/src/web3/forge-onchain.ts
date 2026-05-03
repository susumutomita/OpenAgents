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

/// Run the on-chain forge pipeline serially:
/// 1) 0G Galileo: storage upload → iNFT mint (same chain, no extra switch)
/// 2) Sepolia: ENS subname registration
///
/// 旧実装は storage+mint と ENS を `Promise.all` で並列実行していたが、
/// MetaMask は per-origin で `wallet_requestPermissions` (= switchChain) を
/// 1 つしか pending にできないので、Galileo と Sepolia の switch が同時に
/// 発火すると後発が `Requested resource not available. Request of type
/// 'wallet_requestPermissions' already pending` で reject されていた。
///
/// 並列実行は wallet 側がどのみち signature prompt を直列化するので、
/// user-facing のレイテンシは serial にしてもほぼ変わらない。serial にする
/// ことで chain switch が確実に 1 つずつ片付き、user reject も友好的な
/// エラーとして対応する step だけに表示できる。
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

  // ── Phase 1: 0G Galileo (storage upload → iNFT mint) ────────────────
  let storageSettled: PromiseSettledResult<StorageProof>;
  let mintSettled: PromiseSettledResult<MintProof>;
  let signer: ZeroGSigner | undefined;
  try {
    signer = await buildZeroGSigner(walletClient);
  } catch {
    signer = undefined;
  }
  let storage: StorageProof;
  try {
    storage = await putPlayLog(draft.playLog, signer);
    storageSettled = { status: 'fulfilled', value: storage };
  } catch (storageError) {
    storageSettled = { status: 'rejected', reason: storageError };
    mintSettled = {
      status: 'rejected',
      reason: new Error('skipped: storage upload failed'),
    };
    storage = { cid: '' };
  }
  if (storageSettled.status === 'fulfilled') {
    try {
      const mint = await mintINft(walletClient, {
        ensName: draft.agent.ensName,
        playLogHash,
        policyBlob: '0x' as Hex,
        archetype: draft.agent.archetype,
        combatPower: BigInt(draft.agent.profile.combatPower),
        storageCID: storage.cid,
      });
      mintSettled = { status: 'fulfilled', value: mint };
    } catch (mintError) {
      mintSettled = { status: 'rejected', reason: mintError };
    }
  } else {
    // mintSettled は上の catch ブロックで既に "skipped" を入れてある。
    // TS narrowing 用にここで noop。
    mintSettled ??= {
      status: 'rejected',
      reason: new Error('skipped: storage upload failed'),
    };
  }

  // ── Phase 2: Sepolia (ENS subname + text records) ───────────────────
  // Phase 1 が完全に終わった後に走らせる。これで chain switch が serial に
  // なって MetaMask の "request already pending" エラーが起きない。
  let ensSettled: PromiseSettledResult<EnsProof>;
  try {
    const ens = await registerSubname(walletClient, {
      handle,
      owner,
      textRecords: {
        'combat-power': String(draft.agent.profile.combatPower),
        archetype: draft.agent.archetype,
        'design-hash': draft.agent.birthHash,
      },
    });
    ensSettled = { status: 'fulfilled', value: ens };
  } catch (ensError) {
    ensSettled = { status: 'rejected', reason: ensError };
  }

  return aggregateProof(storageSettled, mintSettled, ensSettled);
}
