// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AgentForgeINFT} from "../src/AgentForgeINFT.sol";

/// @notice Deploy AgentForgeINFT to the active chain.
///
/// Subname registration is delegated to real ENS (Sepolia NameWrapper) from
/// the frontend, so this script only deploys the iNFT contract.
///
/// IMPORTANT: This script never reads a private key from the environment. The
/// signer is supplied by Foundry's CLI via one of:
///   forge script ... --account <name>       (encrypted keystore)
///   forge script ... --ledger                (Ledger hardware wallet)
///   forge script ... --trezor                (Trezor hardware wallet)
///   forge script ... --interactive           (paste key once, in memory)
///
/// One-time setup for keystore-backed signing:
///   cast wallet import deployer --interactive
///   make deploy NETWORK=sepolia ACCOUNT=deployer SENDER=0x...
///
/// Galileo (0G testnet) deploy example:
///   make deploy NETWORK=galileo ACCOUNT=deployer SENDER=0x...
/// or directly:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url $GALILEO_RPC_URL --broadcast --account deployer --sender 0x...
contract Deploy is Script {
    function run() external returns (address inftAddress) {
        vm.startBroadcast();

        AgentForgeINFT inft = new AgentForgeINFT();

        vm.stopBroadcast();

        inftAddress = address(inft);
    }
}
