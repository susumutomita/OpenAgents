import { useEffect, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { PRIMARY_TESTNET, SUPPORTED_TESTNETS } from '../web3/chains';

const SUPPORTED_IDS: ReadonlySet<number> = new Set(
  SUPPORTED_TESTNETS.map((c) => c.id)
);

const SUPPORTED_LABEL = SUPPORTED_TESTNETS.map((c) => c.name).join(' / ');

/// Wallet が mainnet 等 testnet allowlist 外の chain にいるときに、
/// `wallet_switchEthereumChain` で Sepolia に強制スイッチを試みる。
/// auto switch を 1 回試みた chainId は記録しておき、ユーザーが拒否した
/// 場合に無限プロンプトループにならないようにする。
///
/// 表示は controlled banner で、ユーザーが拒否したまま mainnet に居続けた
/// 場合でも「testnet 専用」が常時見えるようにする。
export function TestnetGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [lastAttempted, setLastAttempted] = useState<number | null>(null);

  const onUnsupported =
    isConnected && chainId !== undefined && !SUPPORTED_IDS.has(chainId);

  useEffect(() => {
    if (!onUnsupported || chainId === undefined) return;
    if (lastAttempted === chainId) return;
    setLastAttempted(chainId);
    void switchChain({ chainId: PRIMARY_TESTNET.id });
  }, [onUnsupported, chainId, lastAttempted, switchChain]);

  if (!onUnsupported) return null;

  return (
    <div role="alert" style={STYLES.banner}>
      <span style={STYLES.tag}>TESTNET ONLY</span>
      <span style={STYLES.body}>
        Gr@diusWeb3 は {SUPPORTED_LABEL} 専用です。現在 wallet は chain{' '}
        {chainId} にいます。{PRIMARY_TESTNET.name} への切り替えを wallet で
        承認してください。
      </span>
      <button
        type="button"
        style={STYLES.button}
        onClick={() => void switchChain({ chainId: PRIMARY_TESTNET.id })}
      >
        Switch to {PRIMARY_TESTNET.name}
      </button>
    </div>
  );
}

const STYLES = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    background: '#2b1605',
    borderBottom: '1px solid #ffb84d',
    color: '#ffb84d',
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    fontFamily: 'inherit',
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
  },
  tag: {
    fontWeight: 700,
    border: '1px solid #ffb84d',
    padding: '2px 8px',
    letterSpacing: '0.18em',
  },
  body: {
    flex: 1,
    lineHeight: 1.5,
  },
  button: {
    background: 'transparent',
    color: '#ffb84d',
    border: '1px solid #ffb84d',
    padding: '6px 12px',
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
} as const;
