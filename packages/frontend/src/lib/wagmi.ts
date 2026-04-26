import { http, createConfig } from 'wagmi';
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  sepolia,
} from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia, baseSepolia, optimismSepolia, arbitrumSepolia],
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
  },
  ssr: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
