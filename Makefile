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

.PHONY: before-commit
before-commit: architecture_harness lint_text lint typecheck test build

.PHONY: dev
dev:
	bun run dev

# Multi-chain contract deploy (Foundry).
#
# Signing: this Makefile NEVER takes a raw private key. Pick one mode:
#
#   1) Encrypted keystore (recommended):
#        cast wallet import deployer --interactive          # one-time
#        make deploy NETWORK=sepolia ACCOUNT=deployer SENDER=0xYourAddress
#
#   2) Ledger hardware wallet:
#        make deploy NETWORK=sepolia LEDGER=1 SENDER=0xYourAddress
#
#   3) Interactive prompt (key kept in memory, never on disk):
#        make deploy NETWORK=sepolia INTERACTIVE=1
#
# RPC URL is sourced from <NETWORK>_RPC_URL env var (e.g. SEPOLIA_RPC_URL).

NETWORK_UPPER = $(shell echo $(NETWORK) | tr a-z A-Z)
SIGNER_FLAGS = $(if $(LEDGER),--ledger,$(if $(TREZOR),--trezor,$(if $(INTERACTIVE),--interactive,$(if $(ACCOUNT),--account $(ACCOUNT),$(error No signer specified — pass ACCOUNT=name OR LEDGER=1 OR TREZOR=1 OR INTERACTIVE=1)))))
SENDER_FLAG = $(if $(SENDER),--sender $(SENDER),)

.PHONY: deploy
deploy:
	cd contracts && forge script script/Deploy.s.sol:Deploy \
		--rpc-url $${$(NETWORK_UPPER)_RPC_URL:?missing $(NETWORK_UPPER)_RPC_URL} \
		--broadcast \
		--verify \
		--chain $(NETWORK) \
		$(SIGNER_FLAGS) $(SENDER_FLAG)

.PHONY: deploy_all
deploy_all:
	@for network in sepolia base_sepolia op_sepolia arbitrum_sepolia; do \
		echo "▶ deploying to $$network"; \
		$(MAKE) deploy NETWORK=$$network || exit 1; \
	done
