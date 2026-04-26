// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AgentForgeINFT} from "../src/AgentForgeINFT.sol";
import {AgentForgeSubnameRegistry} from "../src/AgentForgeSubnameRegistry.sol";

/// @notice Deploy AgentForgeINFT and AgentForgeSubnameRegistry to the active chain.
/// Set RPC and PRIVATE_KEY via env vars and call:
///   forge script script/Deploy.s.sol:Deploy --rpc-url $RPC --broadcast
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

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
