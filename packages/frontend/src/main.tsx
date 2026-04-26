import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { App } from './App';
import './index.css';
import { config } from './lib/wagmi';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found.');
}

const queryClient = new QueryClient();

createRoot(container).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
