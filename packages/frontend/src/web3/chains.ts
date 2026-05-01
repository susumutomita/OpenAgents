import { defineChain } from 'viem';
import { sepolia } from 'viem/chains';

/// 0G Galileo testnet (chainId 16602). Public RPC at evmrpc-testnet.0g.ai.
/// Block explorer: https://chainscan-galileo.0g.ai
/// 直近の live RPC で `eth_chainId = 0x40da` (= 16602) を確認したため 16601 から更新。
export const galileo = defineChain({
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: {
      name: '0G Chainscan',
      url: 'https://chainscan-galileo.0g.ai',
    },
  },
  testnet: true,
});

export { sepolia };
