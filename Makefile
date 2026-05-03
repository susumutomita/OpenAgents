.PHONY: install
install:
	bun install

.PHONY: install_ci
install_ci:
	bun install --frozen-lockfile $(EXTRA_INSTALL_FLAGS)

.PHONY: build
build:
	bun run build

.PHONY: clean
clean:
	bun run clean

.PHONY: test
test:
	bun run test

.PHONY: test_coverage
test_coverage:
	bun run test:coverage

.PHONY: test_watch
test_watch:
	bun run --filter '*' test --watch

.PHONY: lint
lint:
	bun run lint

.PHONY: lint_fix
lint_fix:
	bun run lint:fix

.PHONY: lint_text
lint_text:
	bun run lint:text

.PHONY: typecheck
typecheck:
	bun run typecheck

.PHONY: format
format:
	bun run format

.PHONY: format_check
format_check:
	bun run format:check

.PHONY: architecture_harness
architecture_harness:
	bun scripts/architecture-harness.ts --staged --fail-on=error

# Pitch deck (Marp).
#
# locally-pinned @marp-team/marp-cli を使う (`bun marp` = node_modules/.bin/marp)。
# bunx は使わない (lockfile の外で都度フェッチするためサプライチェーンリスク)。
# PDF 生成は puppeteer + Chromium に依存する。初回は Chromium をダウンロード。
.PHONY: pitch
pitch:
	bun run pitch:html

.PHONY: pitch_pdf
pitch_pdf:
	bun run pitch:pdf

.PHONY: before-commit
before-commit: architecture_harness lint_text lint typecheck test build

.PHONY: dev
dev:
	bun run dev

# Multi-chain contract deploy (Foundry).
#
# Signing: this Makefile NEVER takes a raw private key. Pick one mode:
#
#   0) Disposable deployer wallet (recommended for testnet hackathons):
#        make deploy_setup
#        # → generates a fresh wallet, imports it into the encrypted keystore
#        # → fund the printed address with testnet ETH, then:
#        make deploy_galileo ACCOUNT=deployer SENDER=0xThatAddress
#
#   1) Encrypted keystore (general):
#        cast wallet import deployer --interactive          # one-time
#        make deploy NETWORK=sepolia ACCOUNT=deployer SENDER=0xYourAddress
#
#   2) Ledger hardware wallet:
#        make deploy NETWORK=sepolia LEDGER=1 SENDER=0xYourAddress
#
#   3) Interactive prompt (key kept in memory, never on disk):
#        make deploy NETWORK=sepolia INTERACTIVE=1
#
# RPC URL is sourced from foundry.toml [rpc_endpoints] aliases. Sepolia 系は
# `${SEPOLIA_RPC_URL}` 等を要求し、Galileo は `${GALILEO_RPC_URL:-https://evmrpc-testnet.0g.ai}`
# が public RPC を fallback として渡す。

# Disposable deployer wallet workflow.
#
# 普段使いの wallet の private key を絶対に import しないこと。
# このターゲットは新規 wallet を生成し、Foundry の暗号化 keystore に直接
# import する。生成された秘密鍵は標準出力に 1 度だけ表示されるので、
# 心配ならパスワードマネージャーに保存してもよい (testnet 専用なので
# keystore + パスワードだけ覚えていれば backup は不要)。
#
# 流れ:
#   1) `make deploy_setup`        — 鍵生成 + keystore に import
#   2) printed アドレスに testnet ETH を送る (faucet または別 wallet から)
#   3) `make deploy_galileo ACCOUNT=deployer SENDER=0x...` で deploy
.PHONY: deploy_setup
deploy_setup:
	@echo "▶ Generating a disposable deployer wallet (testnet only)."
	@echo "▶ NEVER import your daily-driver private key into this keystore."
	@echo "▶ The private key below is shown ONCE. Copy it to a password manager"
	@echo "  if you want a backup, otherwise the keystore + password is enough."
	@echo ""
	cast wallet new
	@echo ""
	@echo "▶ Importing the generated key into the Foundry encrypted keystore."
	@echo "▶ At the next prompts, paste the private key above and choose a"
	@echo "  password to encrypt the keystore."
	@echo ""
	cast wallet import deployer --interactive
	@echo ""
	@echo "▶ Encrypted keystore saved at: $$HOME/.foundry/keystores/deployer"
	@echo "▶ Next steps:"
	@echo "    1. Send testnet ETH to the wallet address printed above."
	@echo "       - 0G Galileo faucet: https://faucet.0g.ai/  (X login required)"
	@echo "       - Sepolia faucet:    https://sepoliafaucet.com/"
	@echo "    2. make deploy_galileo ACCOUNT=deployer SENDER=0x<thatAddress>"
	@echo "    3. Set VITE_INFT_ADDRESS=<deployed contract address> in Vercel"
	@echo "       and redeploy the frontend."

# 既存 keystore 'deployer' のアドレスを表示する。再起動して deployer の
# アドレスを忘れたとき用。`make deploy_address` を打てば cast が表示する。
.PHONY: deploy_address
deploy_address:
	@cast wallet address --account deployer

NETWORK_UPPER = $(shell echo $(NETWORK) | tr a-z A-Z)
SIGNER_FLAGS = $(if $(LEDGER),--ledger,$(if $(TREZOR),--trezor,$(if $(INTERACTIVE),--interactive,$(if $(ACCOUNT),--account $(ACCOUNT),$(error No signer specified — pass ACCOUNT=name OR LEDGER=1 OR TREZOR=1 OR INTERACTIVE=1)))))
SENDER_FLAG = $(if $(SENDER),--sender $(SENDER),)

# 0G Galileo (16602) は Etherscan 互換 API を持たないので --verify を付けると
# forge が verify ステップで必ず失敗する。Galileo のときは verify を外し、
# それ以外 (Sepolia 系) は付ける。
VERIFY_FLAG = $(if $(filter galileo,$(NETWORK)),,--verify)

# `--chain galileo` は Foundry の組み込み chain alias 表に無くて警告になる。
# Galileo のときは --chain を省いて RPC からの自動検出に任せる
# (forge script は eth_chainId をそのまま使うので tx 署名は正しく動く)。
CHAIN_FLAG = $(if $(filter galileo,$(NETWORK)),,--chain $(NETWORK))

.PHONY: deploy
deploy:
	cd contracts && forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(NETWORK) \
		--broadcast \
		$(VERIFY_FLAG) \
		$(CHAIN_FLAG) \
		$(SIGNER_FLAGS) $(SENDER_FLAG)

# Per-chain shortcuts so judges can copy-paste a single line per chain.
# 例: `make deploy_galileo ACCOUNT=deployer SENDER=0x...`
# `--chain galileo` を Foundry の rpc_endpoints キーと合わせる。
.PHONY: deploy_sepolia
deploy_sepolia:
	$(MAKE) deploy NETWORK=sepolia

.PHONY: deploy_base_sepolia
deploy_base_sepolia:
	$(MAKE) deploy NETWORK=base_sepolia

.PHONY: deploy_op_sepolia
deploy_op_sepolia:
	$(MAKE) deploy NETWORK=op_sepolia

.PHONY: deploy_arbitrum_sepolia
deploy_arbitrum_sepolia:
	$(MAKE) deploy NETWORK=arbitrum_sepolia

.PHONY: deploy_galileo
deploy_galileo:
	$(MAKE) deploy NETWORK=galileo

.PHONY: deploy_all
deploy_all:
	@for network in sepolia base_sepolia op_sepolia arbitrum_sepolia galileo; do \
		echo "▶ deploying to $$network"; \
		$(MAKE) deploy NETWORK=$$network || exit 1; \
	done
