// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ERC8004TrustlessAgents (minimal)
 * @notice Reference shape of the live registry deployed on GOAT Mainnet at
 *         0x8004A169FB4a3325136EB29fA0ceB6D2e539a432.
 * @dev RefundRex calls register(name) and setUri(agentId, uri) — that's it.
 *      This contract is included for documentation + local testing only.
 */
interface IERC721Like {
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
}

contract ERC8004TrustlessAgents {
    event AgentRegistered(uint256 indexed agentId, address indexed wallet, string name);
    event AgentUriUpdated(uint256 indexed agentId, string uri);

    mapping(uint256 => address) public agentWallet;
    mapping(uint256 => string) public agentName;
    mapping(uint256 => string) public agentUri;
    uint256 public nextAgentId = 1;

    function register(string calldata name) external returns (uint256 agentId) {
        agentId = nextAgentId++;
        agentWallet[agentId] = msg.sender;
        agentName[agentId] = name;
        emit AgentRegistered(agentId, msg.sender, name);
    }

    function setUri(uint256 agentId, string calldata uri) external {
        require(agentWallet[agentId] == msg.sender, "not owner");
        agentUri[agentId] = uri;
        emit AgentUriUpdated(agentId, uri);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return agentWallet[agentId];
    }
}
