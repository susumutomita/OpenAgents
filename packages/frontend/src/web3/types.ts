/// Status machine for an individual on-chain action.
export type TxStatus = 'idle' | 'pending' | 'success' | 'failed';

/// One step in the on-chain forge pipeline.
/// `data` is present when status === 'success'.
/// `error` is present when status === 'failed'.
export interface OnChainStep<T> {
  status: TxStatus;
  data?: T;
  error?: string;
}

export interface MintProof {
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

export interface StorageProof {
  cid: string;
}

export interface EnsProof {
  name: string;
  resolverUrl: string;
}

export interface SwapProof {
  txHash: string;
  explorerUrl: string;
}

export interface OnChainProof {
  mint: OnChainStep<MintProof>;
  storage: OnChainStep<StorageProof>;
  ens: OnChainStep<EnsProof>;
  swap: OnChainStep<SwapProof>;
}

export const idleProof: OnChainProof = {
  mint: { status: 'idle' },
  storage: { status: 'idle' },
  ens: { status: 'idle' },
  swap: { status: 'idle' },
};
