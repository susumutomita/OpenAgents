import { http, createConfig } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { galileo, sepolia } from '../web3/chains';

/// Gr@diusWeb3 は testnet 専用。chains には ENS/Uniswap 用の Sepolia と
/// iNFT mint 用の 0G Galileo のみを置き、mainnet を含めない。これに
/// 載っていない chain (mainnet 等) に wallet がいるときは TestnetGuard が
/// Sepolia への switch を要求する。
export const config = createConfig({
  chains: [sepolia, galileo],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: 'Gr@diusWeb3',
    }),
  ],
  transports: {
    [sepolia.id]: http(),
    [galileo.id]: http(),
  },
  ssr: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
