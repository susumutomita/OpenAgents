// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AgentForgeINFT} from "../src/AgentForgeINFT.sol";
import {AgentForgeSubnameRegistry} from "../src/AgentForgeSubnameRegistry.sol";

/// @notice Deploy AgentForgeINFT and AgentForgeSubnameRegistry to the active chain.
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
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        AgentForgeINFT inft = new AgentForgeINFT();
        AgentForgeSubnameRegistry registry = new AgentForgeSubnameRegistry();

        vm.stopBroadcast();

        // Surface deployed addresses for downstream tooling to scrape.
        // forge logs them automatically when the script returns.
        // solhint-disable-next-line no-console
        // (intentionally not using console.log to keep deps minimal)
        bytes memory _addr1 = abi.encodePacked(address(inft));
        bytes memory _addr2 = abi.encodePacked(address(registry));
        _addr1; // silence unused
        _addr2;
    }
}
