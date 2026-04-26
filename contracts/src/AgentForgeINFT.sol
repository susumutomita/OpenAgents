// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AgentForgeINFT {
    struct AgentMetadata {
        string ensName;
        bytes32 playLogHash;
        bytes policyBlob;
    }

    uint256 private _nextTokenId = 1;

    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => AgentMetadata) public metadataOf;

    event AgentForged(uint256 indexed tokenId, address indexed owner, string ensName, bytes32 playLogHash);
    event PolicyEmbedded(uint256 indexed tokenId, bytes policyBlob);

    function forge(address owner, string calldata ensName, bytes32 playLogHash, bytes calldata policyBlob)
        external
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;
        ownerOf[tokenId] = owner;
        metadataOf[tokenId] = AgentMetadata({
            ensName: ensName,
            playLogHash: playLogHash,
            policyBlob: policyBlob
        });

        emit AgentForged(tokenId, owner, ensName, playLogHash);
        emit PolicyEmbedded(tokenId, policyBlob);
    }

    function embedPolicy(uint256 tokenId, bytes calldata policyBlob) external {
        require(ownerOf[tokenId] != address(0), "unknown token");
        metadataOf[tokenId].policyBlob = policyBlob;

        emit PolicyEmbedded(tokenId, policyBlob);
    }
}
