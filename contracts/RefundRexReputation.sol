// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RefundRexReputation
 * @notice Append-only reputation ledger for autonomous refund agents.
 *
 * Each successful resolution is recorded as a tuple
 *   (agentId, caseHash, recoveredUsdCents, settlementTxHash).
 *
 * Anyone can read aggregate stats; only the agent owner (msg.sender ==
 * ERC8004.getAgentWallet(agentId)) can append.
 *
 * Designed to live alongside the official ERC-8004 registry on GOAT Mainnet.
 */
interface IERC8004 {
    function getAgentWallet(uint256 agentId) external view returns (address);
}

contract RefundRexReputation {
    IERC8004 public immutable registry;

    struct Resolution {
        uint128 caseHash;            // truncated keccak256(caseId)
        uint64 recoveredUsdCents;    // 1e-2 USD
        uint64 timestamp;
        bytes32 settlementTxHash;    // x402 settlement reference
    }

    mapping(uint256 => Resolution[]) public byAgent;
    mapping(uint256 => uint256) public totalRecoveredCents;
    mapping(uint256 => uint256) public totalCases;

    event ResolutionRecorded(
        uint256 indexed agentId,
        uint128 caseHash,
        uint64 recoveredUsdCents,
        bytes32 settlementTxHash
    );

    constructor(IERC8004 _registry) {
        registry = _registry;
    }

    modifier onlyAgent(uint256 agentId) {
        require(
            registry.getAgentWallet(agentId) == msg.sender,
            "not agent owner"
        );
        _;
    }

    function record(
        uint256 agentId,
        uint128 caseHash,
        uint64 recoveredUsdCents,
        bytes32 settlementTxHash
    ) external onlyAgent(agentId) {
        Resolution memory r = Resolution({
            caseHash: caseHash,
            recoveredUsdCents: recoveredUsdCents,
            timestamp: uint64(block.timestamp),
            settlementTxHash: settlementTxHash
        });
        byAgent[agentId].push(r);
        totalRecoveredCents[agentId] += recoveredUsdCents;
        totalCases[agentId] += 1;
        emit ResolutionRecorded(agentId, caseHash, recoveredUsdCents, settlementTxHash);
    }

    function summary(uint256 agentId)
        external
        view
        returns (uint256 casesHandled, uint256 totalCents)
    {
        return (totalCases[agentId], totalRecoveredCents[agentId]);
    }
}
