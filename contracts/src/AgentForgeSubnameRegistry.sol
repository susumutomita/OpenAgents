// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AgentForgeSubnameRegistry {
    struct TextRecord {
        string key;
        string value;
    }

    struct SubnameRecord {
        string subname;
        address controller;
        TextRecord[] textRecords;
    }

    mapping(bytes32 => SubnameRecord) private _records;

    event SubnameRegistered(bytes32 indexed node, string subname, address indexed controller);
    event TextRecordSet(bytes32 indexed node, string key, string value);

    function registerSubname(string calldata subname, address controller) external returns (bytes32 node) {
        node = keccak256(abi.encodePacked(subname));
        _records[node].subname = subname;
        _records[node].controller = controller;

        emit SubnameRegistered(node, subname, controller);
    }

    function setTextRecord(bytes32 node, string calldata key, string calldata value) external {
        require(_records[node].controller != address(0), "unknown subname");
        _records[node].textRecords.push(TextRecord({key: key, value: value}));

        emit TextRecordSet(node, key, value);
    }

    function resolve(bytes32 node) external view returns (SubnameRecord memory) {
        return _records[node];
    }
}
