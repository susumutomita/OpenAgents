import {
  http,
  type Address,
  type WalletClient,
  createPublicClient,
  parseEther,
} from 'viem';
import { sepolia } from './chains';

/// Uniswap v3 SwapRouter02 on Sepolia.
/// https://docs.uniswap.org/contracts/v3/reference/deployments
const SWAP_ROUTER_02 =
  '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as const satisfies Address;

/// Wrapped ETH on Sepolia (canonical).
const WETH_SEPOLIA =
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as const satisfies Address;

/// USDC test token on Sepolia. Note: Sepolia has multiple "USDC"
/// deployments; we use the Circle-issued faucet token.
/// https://faucet.circle.com (Sepolia ETH).
const USDC_SEPOLIA =
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const satisfies Address;

const POOL_FEE = 3000; // 0.3 %

const SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

export interface ExecuteFirstSwapResult {
  txHash: string;
  explorerUrl: string;
}

/// Execute the agent's first on-chain action: a 0.0001 ETH WETH→USDC swap
/// on Sepolia v3. Sends as `payable` so the router wraps native ETH; the
/// recipient is the connected wallet itself.
export async function executeFirstSwap(
  walletClient: WalletClient
): Promise<ExecuteFirstSwapResult> {
  const account = walletClient.account;
  if (!account) {
    throw new Error('executeFirstSwap: wallet client has no account');
  }

  const amountIn = parseEther('0.0001');

  const txHash = await walletClient.writeContract({
    address: SWAP_ROUTER_02,
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: WETH_SEPOLIA,
        tokenOut: USDC_SEPOLIA,
        fee: POOL_FEE,
        recipient: account.address,
        amountIn,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      },
    ],
    value: amountIn,
    chain: sepolia,
    account,
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
  };
}
