import { defineChain } from 'viem';
import { sepolia } from 'viem/chains';

/// 0G Galileo testnet (chainId 16601). Public RPC at evmrpc-testnet.0g.ai.
/// Block explorer: https://chainscan-galileo.0g.ai
export const galileo = defineChain({
  id: 16601,
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
