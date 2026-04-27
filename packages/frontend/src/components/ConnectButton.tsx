import { shortAddress } from '@gradiusweb3/shared/browser';
import { useState } from 'react';
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';

export function ConnectButton() {
  const { address, isConnected, connector } = useAccount();
  const { connectors, connect, status } = useConnect();
  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();
  const chainId = useChainId();
  const [open, setOpen] = useState(false);

  if (!isConnected) {
    return (
      <div className="connect-wrap">
        <button
          type="button"
          className="connect-button"
          onClick={() => setOpen((v) => !v)}
        >
          ▶ CONNECT WALLET
        </button>
        {open ? (
          <div className="connect-dropdown" role="menu">
            {connectors.map((c) => (
              <button
                key={c.uid}
                type="button"
                className="connect-option"
                disabled={status === 'pending'}
                onClick={() => {
                  connect({ connector: c });
                  setOpen(false);
                }}
              >
                {c.name}
              </button>
            ))}
            {status === 'pending' ? (
              <div className="connect-status">Awaiting wallet…</div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const currentChain = chains.find((c) => c.id === chainId);

  return (
    <div className="connect-wrap">
      <button
        type="button"
        className="connect-button connected"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="connect-chain">
          {currentChain?.name ?? `chain ${chainId}`}
        </span>
        <span className="connect-addr">
          {address ? shortAddress(address) : ''}
        </span>
      </button>
      {open ? (
        <div className="connect-dropdown" role="menu">
          <div className="connect-meta">via {connector?.name ?? 'wallet'}</div>
          <div className="connect-section">SWITCH CHAIN</div>
          {chains.map((c) => (
            <button
              key={c.id}
              type="button"
              className={
                c.id === chainId ? 'connect-option active' : 'connect-option'
              }
              onClick={() => {
                switchChain({ chainId: c.id });
                setOpen(false);
              }}
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            className="connect-option danger"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
