// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentForgeINFT} from "../src/AgentForgeINFT.sol";

/// @notice Test suite for the ERC-721-based AgentForgeINFT contract.
contract AgentForgeINFTTest is Test {
    AgentForgeINFT internal inft;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    string internal constant ENS_ALICE = "alice-abc123.gradiusweb3.eth";
    string internal constant ARCHETYPE = "Razor Sharpshooter";
    uint64 internal constant COMBAT_POWER = 12_345;
    string internal constant STORAGE_CID = "sha256-deadbeefdeadbeefdeadbeefdeadbeef";

    bytes32 internal constant PLAY_LOG_HASH_A = keccak256("play-log-a");
    bytes32 internal constant PLAY_LOG_HASH_B = keccak256("play-log-b");

    bytes internal constant POLICY_BLOB = hex"deadbeef";

    function setUp() public {
        inft = new AgentForgeINFT();
    }

    function _forgeAs(address sender, bytes32 hash, string memory ens) internal returns (uint256) {
        vm.prank(sender);
        return inft.forge(ens, hash, POLICY_BLOB, ARCHETYPE, COMBAT_POWER, STORAGE_CID);
    }

    /// @dev "同じ msg.sender + playLogHash からは同じ tokenId が導出される"
    function test_forge_sameSenderAndHash_yieldsSameTokenId() public {
        uint256 expected = uint256(keccak256(abi.encodePacked(alice, PLAY_LOG_HASH_A)));
        uint256 actual = _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);
        assertEq(actual, expected, "tokenId derives from (msg.sender, playLogHash)");
    }

    /// @dev "異なる playLogHash からは異なる tokenId が導出される"
    function test_forge_differentHash_differentTokenId() public {
        uint256 idA = _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);
        uint256 idB = _forgeAs(bob, PLAY_LOG_HASH_B, "bob-xyz.gradiusweb3.eth");
        assertTrue(idA != idB, "different play logs must mint different tokens");
    }

    /// @dev "別の wallet が同じ playLogHash で mint しても tokenId が衝突しない (griefing 防止)"
    function test_forge_sameHashDifferentSender_yieldsDifferentTokenId() public {
        uint256 idAlice = _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);
        uint256 idBob = _forgeAs(bob, PLAY_LOG_HASH_A, "bob-abc.gradiusweb3.eth");
        assertTrue(
            idAlice != idBob,
            "tokenId must be unique per (sender, hash) so a third party cannot front-run"
        );
        assertEq(inft.ownerOf(idAlice), alice);
        assertEq(inft.ownerOf(idBob), bob);
    }

    /// @dev "同じ msg.sender が同じ playLogHash を再 mint すると revert する"
    function test_forge_duplicateSameSender_reverts() public {
        _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);
        vm.expectRevert();
        _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);
    }

    /// @dev "tokenURI は data URI 形式でメタデータを返す"
    function test_tokenURI_returnsDataUriWithMetadata() public {
        uint256 tokenId = _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);

        string memory uri = inft.tokenURI(tokenId);
        bytes memory uriBytes = bytes(uri);

        bytes memory prefix = bytes("data:application/json;base64,");
        assertGt(uriBytes.length, prefix.length, "tokenURI must be longer than prefix");
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i], "tokenURI must start with data: prefix");
        }
    }

    /// @dev "mint 後の owner マッピングが msg.sender になる"
    function test_forge_setsOwnerToMsgSender() public {
        uint256 tokenId = _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);
        assertEq(inft.ownerOf(tokenId), alice, "owner must be msg.sender (no spoofing)");
    }

    /// @dev "metadata accessor が forge 時の値をそのまま保持する"
    function test_forge_storesMetadata() public {
        uint256 tokenId = _forgeAs(alice, PLAY_LOG_HASH_A, ENS_ALICE);

        (
            string memory ensName,
            bytes32 storedHash,
            string memory archetype,
            uint64 combatPower,
            string memory storageCID
        ) = inft.metadataOf(tokenId);

        assertEq(ensName, ENS_ALICE);
        assertEq(storedHash, PLAY_LOG_HASH_A);
        assertEq(archetype, ARCHETYPE);
        assertEq(uint256(combatPower), uint256(COMBAT_POWER));
        assertEq(storageCID, STORAGE_CID);
    }
}
