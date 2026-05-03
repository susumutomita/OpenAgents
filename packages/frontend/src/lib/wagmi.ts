import { http, createConfig } from 'wagmi';
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  sepolia,
} from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { galileo } from '../web3/chains';

export const config = createConfig({
  chains: [sepolia, baseSepolia, optimismSepolia, arbitrumSepolia, galileo],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: 'Gr@diusWeb3',
    }),
  ],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [galileo.id]: http(),
  },
  ssr: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
