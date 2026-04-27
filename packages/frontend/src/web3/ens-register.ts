import {
  http,
  type Address,
  type WalletClient,
  createPublicClient,
  namehash,
} from 'viem';
import { sepolia } from './chains';

/// Sepolia ENS NameWrapper. Source:
/// https://docs.ens.domains/learn/deployments
const NAME_WRAPPER_SEPOLIA =
  '0x0635513f179D50A207757E05759CbD106d7dFcE8' as const satisfies Address;

/// Sepolia public ENS Resolver (PublicResolver).
/// Source: ENS deployments registry.
const PUBLIC_RESOLVER_SEPOLIA =
  '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD' as const satisfies Address;

const NAME_WRAPPER_ABI = [
  {
    type: 'function',
    name: 'setSubnodeRecord',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' },
    ],
    outputs: [{ name: 'node', type: 'bytes32' }],
  },
] as const;

const RESOLVER_ABI = [
  {
    type: 'function',
    name: 'setText',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
] as const;

export interface RegisterSubnameInput {
  /// e.g. "kotetsu-abc123" (the leftmost label only).
  handle: string;
  /// recipient that ends up owning the subname node.
  owner: Address;
  /// text records to write after the subname exists.
  textRecords: Record<string, string>;
}

export interface RegisterSubnameResult {
  name: string;
  resolverUrl: string;
}

function readParentName(): string {
  const raw = import.meta.env.VITE_ENS_PARENT as string | undefined;
  return raw && raw.length > 0 ? raw : 'gradiusweb3.eth';
}

/// Register a subname under the configured parent on Sepolia ENS,
/// then write the supplied text records to the public resolver.
export async function registerSubname(
  walletClient: WalletClient,
  input: RegisterSubnameInput
): Promise<RegisterSubnameResult> {
  const account = walletClient.account;
  if (!account) {
    throw new Error('registerSubname: wallet client has no account');
  }

  const parent = readParentName();
  const parentNode = namehash(parent);
  const fullName = `${input.handle}.${parent}`;
  const node = namehash(fullName);

  // Step 1: NameWrapper.setSubnodeRecord — only the parent owner can call
  // this. For a hackathon-controlled parent this is the deployer wallet.
  const wrapTxHash = await walletClient.writeContract({
    address: NAME_WRAPPER_SEPOLIA,
    abi: NAME_WRAPPER_ABI,
    functionName: 'setSubnodeRecord',
    args: [
      parentNode,
      input.handle,
      input.owner,
      PUBLIC_RESOLVER_SEPOLIA,
      0n, // ttl
      0, // fuses (PARENT_CANNOT_CONTROL etc. left unset)
      0n, // expiry
    ],
    chain: sepolia,
    account,
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });
  await publicClient.waitForTransactionReceipt({ hash: wrapTxHash });

  // Step 2: write text records sequentially on the public resolver. We do
  // them sequentially (not in parallel) because most wallets serialize
  // signature prompts anyway and parallel sends often produce nonce gaps.
  for (const [key, value] of Object.entries(input.textRecords)) {
    const txHash = await walletClient.writeContract({
      address: PUBLIC_RESOLVER_SEPOLIA,
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [node, key, value],
      chain: sepolia,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  return {
    name: fullName,
    resolverUrl: `https://sepolia.app.ens.domains/${fullName}`,
  };
}
