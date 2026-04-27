// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title AgentForgeINFT
/// @notice ERC-7857-style intelligent NFT for Gr@diusWeb3 agents.
///         tokenId is deterministic from the playLogHash so the same play log
///         can never mint twice — the iNFT body is a literal function of how
///         the player flew the ship.
/// @dev    Storage layout intentionally exposes a public `metadataOf` getter
///         so off-chain indexers can scrape archetype / combat power / storage
///         CID without parsing tokenURI.
contract AgentForgeINFT is ERC721 {
    using Strings for uint256;

    struct AgentMetadata {
        string ensName;
        bytes32 playLogHash;
        string archetype;
        uint64 combatPower;
        string storageCID;
    }

    /// @notice Per-token metadata captured at forge time.
    mapping(uint256 => AgentMetadata) public metadataOf;

    /// @notice Opaque policy blob attached at forge time. Kept separate so
    ///         indexers can decide whether to ingest it.
    mapping(uint256 => bytes) public policyOf;

    event AgentForged(
        uint256 indexed tokenId,
        address indexed owner,
        string ensName,
        bytes32 playLogHash,
        string storageCID
    );
    event PolicyEmbedded(uint256 indexed tokenId, bytes policyBlob);

    constructor() ERC721("Gr@diusWeb3 Agent", "GR8DIUS") {}

    /// @notice Forge a new iNFT. tokenId derives from (msg.sender, playLogHash)
    ///         so the same play log can be minted once per wallet, but a third
    ///         party cannot front-run / grief by replaying someone else's hash.
    /// @param  ensName      `{handle}.gradiusweb3.eth` from forge.ts
    /// @param  playLogHash  keccak256-style fingerprint of the deterministic
    ///                      play log (computed off-chain in the shared package)
    /// @param  policyBlob   serialized policy (kept opaque on chain)
    /// @param  archetype    human-readable archetype label
    /// @param  combatPower  derived combat power score
    /// @param  storageCID   0G Storage CID of the play log JSON
    /// @return tokenId      uint256(keccak256(msg.sender, playLogHash))
    function forge(
        string calldata ensName,
        bytes32 playLogHash,
        bytes calldata policyBlob,
        string calldata archetype,
        uint64 combatPower,
        string calldata storageCID
    ) external returns (uint256 tokenId) {
        tokenId = uint256(keccak256(abi.encodePacked(msg.sender, playLogHash)));

        _safeMint(msg.sender, tokenId);

        metadataOf[tokenId] = AgentMetadata({
            ensName: ensName,
            playLogHash: playLogHash,
            archetype: archetype,
            combatPower: combatPower,
            storageCID: storageCID
        });
        policyOf[tokenId] = policyBlob;

        emit AgentForged(tokenId, msg.sender, ensName, playLogHash, storageCID);
        emit PolicyEmbedded(tokenId, policyBlob);
    }

    /// @notice ERC-721 tokenURI returning a data URI with full metadata.
    ///         The "image" field is a small SVG-data-URI placeholder so any
    ///         marketplace that requires an image still renders something
    ///         deterministic.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        AgentMetadata memory md = metadataOf[tokenId];

        string memory image = _buildImage(md.archetype, md.combatPower);

        // JSON has to be Base64-safe ASCII. We assume the caller-supplied
        // strings (ensName / archetype / storageCID) do not contain quote
        // characters; forge.ts always slugifies these before calling.
        string memory json = string(
            abi.encodePacked(
                '{"name":"',
                md.ensName,
                '","description":"Gr@diusWeb3 agent forged from a 60-second play log.",',
                '"image":"',
                image,
                '",',
                '"archetype":"',
                md.archetype,
                '",',
                '"combatPower":',
                uint256(md.combatPower).toString(),
                ',',
                '"playLogHash":"0x',
                _toHex(md.playLogHash),
                '",',
                '"storageCID":"',
                md.storageCID,
                '",',
                '"ensName":"',
                md.ensName,
                '"}'
            )
        );

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    function _buildImage(string memory archetype, uint64 combatPower)
        internal
        pure
        returns (string memory)
    {
        bytes memory svg = abi.encodePacked(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 320'>",
            "<rect width='320' height='320' fill='#05080c'/>",
            "<text x='20' y='160' fill='#c8ff00' font-family='monospace' font-size='20'>",
            archetype,
            "</text>",
            "<text x='20' y='200' fill='#7ee0ff' font-family='monospace' font-size='14'>CP ",
            uint256(combatPower).toString(),
            "</text></svg>"
        );
        return string(
            abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(svg))
        );
    }

    function _toHex(bytes32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory out = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            out[2 * i] = alphabet[uint8(value[i] >> 4)];
            out[2 * i + 1] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(out);
    }
}
