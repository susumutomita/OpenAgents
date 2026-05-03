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

/// アプリが許容するすべての testnet。mainnet を絶対に触らせないための allowlist。
/// ENS / Uniswap は Sepolia、iNFT mint は 0G Galileo。それ以外は wallet 接続
/// 時点で Sepolia へ強制スイッチするので、ここに含めない。
export const SUPPORTED_TESTNETS = [sepolia, galileo] as const;

/// 接続直後 / 不明 chain にいたときの誘導先。ENS と Uniswap が Sepolia なので
/// primary を Sepolia に置く。0G mint は ensureChain が galileo に切り替える。
export const PRIMARY_TESTNET = sepolia;

export { sepolia };
