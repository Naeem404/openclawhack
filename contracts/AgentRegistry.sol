// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PaidProof AgentRegistry (ERC-8004-style minimal identity + reputation)
/// @notice Mints a non-transferable identity token per agent, tracks portable reputation,
///         and exposes a metadata URI per agent (compatible with the GOAT ERC-8004 pattern).
contract AgentRegistry {
    struct Agent {
        uint256 id;
        string name;
        address wallet;
        string uri;
        AgentRole role;
        uint256 jobsCompleted;
        uint256 jobsSuccessful;
        uint256 reputationScore;
        bool exists;
    }

    enum AgentRole {
        Freelancer,
        Client,
        Verifier,
        Specialist
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public walletToAgentId;
    mapping(string => uint256) public nameToAgentId;

    event AgentRegistered(uint256 indexed agentId, address indexed wallet, string name, AgentRole role, string uri);
    event AgentUriUpdated(uint256 indexed agentId, string uri);
    event ReputationUpdated(uint256 indexed agentId, uint256 jobsCompleted, uint256 jobsSuccessful, uint256 reputationScore);

    error AgentAlreadyRegistered();
    error AgentNotFound();
    error UnauthorizedCaller();

    function register(string calldata name, string calldata uri, AgentRole role) external returns (uint256) {
        if (walletToAgentId[msg.sender] != 0) revert AgentAlreadyRegistered();
        if (nameToAgentId[name] != 0) revert AgentAlreadyRegistered();

        uint256 id = nextAgentId++;
        agents[id] = Agent({
            id: id,
            name: name,
            wallet: msg.sender,
            uri: uri,
            role: role,
            jobsCompleted: 0,
            jobsSuccessful: 0,
            reputationScore: 1000,
            exists: true
        });

        walletToAgentId[msg.sender] = id;
        nameToAgentId[name] = id;

        emit AgentRegistered(id, msg.sender, name, role, uri);
        return id;
    }

    function updateUri(uint256 agentId, string calldata uri) external {
        Agent storage a = agents[agentId];
        if (!a.exists) revert AgentNotFound();
        if (a.wallet != msg.sender) revert UnauthorizedCaller();
        a.uri = uri;
        emit AgentUriUpdated(agentId, uri);
    }

    /// @notice Anyone (typically the escrow contract) can record a verified outcome.
    ///         For the hackathon scope we keep this open; production would gate by trusted writers.
    function recordOutcome(uint256 agentId, bool success) external {
        Agent storage a = agents[agentId];
        if (!a.exists) revert AgentNotFound();

        a.jobsCompleted += 1;
        if (success) {
            a.jobsSuccessful += 1;
            a.reputationScore += 5;
        } else {
            if (a.reputationScore > 10) {
                a.reputationScore -= 10;
            } else {
                a.reputationScore = 0;
            }
        }

        emit ReputationUpdated(agentId, a.jobsCompleted, a.jobsSuccessful, a.reputationScore);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory a = agents[agentId];
        if (!a.exists) revert AgentNotFound();
        return a;
    }

    function getAgentByWallet(address wallet) external view returns (Agent memory) {
        uint256 id = walletToAgentId[wallet];
        if (id == 0) revert AgentNotFound();
        return agents[id];
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        Agent memory a = agents[agentId];
        if (!a.exists) revert AgentNotFound();
        return a.wallet;
    }

    function totalAgents() external view returns (uint256) {
        return nextAgentId - 1;
    }
}
