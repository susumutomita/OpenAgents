.PHONY: install
install:
	bun install

.PHONY: install_ci
install_ci:
	bun install --frozen-lockfile

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
# Set PRIVATE_KEY plus the matching *_RPC_URL for each network you target.
# Example: make deploy NETWORK=sepolia
.PHONY: deploy
deploy:
	cd contracts && forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(or $(RPC_URL),$$($(shell echo $(NETWORK) | tr a-z A-Z)_RPC_URL)) \
		--broadcast \
		--verify \
		--chain $(NETWORK)

.PHONY: deploy_all
deploy_all:
	@for network in sepolia base_sepolia op_sepolia arbitrum_sepolia; do \
		echo "▶ deploying to $$network"; \
		$(MAKE) deploy NETWORK=$$network || exit 1; \
	done
