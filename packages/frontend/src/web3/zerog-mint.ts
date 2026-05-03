import {
  http,
  type Address,
  type Hex,
  type WalletClient,
  createPublicClient,
  encodePacked,
  keccak256,
} from 'viem';
import { galileo } from './chains';
import { ensureChain, waitForReceiptWithGrace } from './utils';

const INFT_ABI = [
  {
    type: 'function',
    name: 'forge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ensName', type: 'string' },
      { name: 'playLogHash', type: 'bytes32' },
      { name: 'policyBlob', type: 'bytes' },
      { name: 'archetype', type: 'string' },
      { name: 'combatPower', type: 'uint64' },
      { name: 'storageCID', type: 'string' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
] as const;

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const satisfies Address;

export interface MintINftOptions {
  ensName: string;
  playLogHash: Hex;
  policyBlob: Hex;
  archetype: string;
  combatPower: bigint;
  storageCID: string;
}

export interface MintINftResult {
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

function readContractAddress(): Address {
  const raw = import.meta.env.VITE_INFT_ADDRESS as string | undefined;
  if (!raw || raw === '' || raw === ZERO_ADDRESS) {
    console.warn(
      '[zerog-mint] VITE_INFT_ADDRESS is unset; using zero address. Mint will revert.'
    );
    return ZERO_ADDRESS;
  }
  return raw as Address;
}

/// Mint an iNFT on 0G Galileo using the connected wallet.
/// Reads contract address from VITE_INFT_ADDRESS at runtime.
export async function mintINft(
  walletClient: WalletClient,
  opts: MintINftOptions
): Promise<MintINftResult> {
  const account = walletClient.account;
  if (!account) {
    throw new Error('mintINft: wallet client has no account');
  }
  const address = readContractAddress();
  if (address === ZERO_ADDRESS) {
    throw new Error(
      'mintINft: VITE_INFT_ADDRESS is not configured. Deploy AgentForgeINFT to 0G Galileo and set the env var.'
    );
  }

  await ensureChain(walletClient, galileo);

  const txHash = await walletClient.writeContract({
    address,
    abi: INFT_ABI,
    functionName: 'forge',
    args: [
      opts.ensName,
      opts.playLogHash,
      opts.policyBlob,
      opts.archetype,
      opts.combatPower,
      opts.storageCID,
    ],
    chain: galileo,
    account,
  });

  const publicClient = createPublicClient({
    chain: galileo,
    transport: http(),
  });
  await waitForReceiptWithGrace(publicClient, txHash);

  const tokenIdHex = keccak256(
    encodePacked(['address', 'bytes32'], [account.address, opts.playLogHash])
  );
  const tokenId = BigInt(tokenIdHex).toString(10);

  const explorerUrl = `${galileo.blockExplorers.default.url}/tx/${txHash}`;

  return { txHash, tokenId, explorerUrl };
}
