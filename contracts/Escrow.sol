// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentRegistry.sol";

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title PaidProof Escrow
/// @notice Holds USDC for a job. Only the registered Lead Verifier agent identity
///         (via its on-chain wallet from AgentRegistry) can sign release once the
///         criteria are met. Bitcoin-finality settlement on GOAT mainnet.
contract Escrow {
    enum JobStatus { Open, Funded, Delivered, Verified, Released, Disputed, Refunded }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        uint256 freelancerAgentId;
        uint256 clientAgentId;
        uint256 verifierAgentId;
        uint256 amount;
        string criteriaURI;
        string deliverableURI;
        string verdictURI;
        uint64 deadline;
        JobStatus status;
        uint256 createdAt;
    }

    IERC20 public immutable usdc;
    AgentRegistry public immutable registry;

    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount, string criteriaURI, uint64 deadline);
    event JobFunded(uint256 indexed jobId, uint256 amount);
    event Delivered(uint256 indexed jobId, string deliverableURI);
    event Verified(uint256 indexed jobId, uint256 indexed verifierAgentId, bool passed, string verdictURI);
    event Released(uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event Disputed(uint256 indexed jobId, string reason);

    error WrongStatus();
    error NotClient();
    error NotFreelancer();
    error NotVerifier();
    error DeadlinePassed();
    error TransferFailed();

    constructor(address usdc_, address registry_) {
        usdc = IERC20(usdc_);
        registry = AgentRegistry(registry_);
    }

    /// @notice Create a job agreement. Auto-resolves agent IDs from on-chain ERC-8004 registry.
    function createJob(
        address freelancer,
        uint256 amount,
        string calldata criteriaURI,
        uint64 deadline,
        uint256 verifierAgentId
    ) external returns (uint256) {
        uint256 jobId = nextJobId++;
        uint256 clientAgentId = registry.walletToAgentId(msg.sender);
        uint256 freelancerAgentId = registry.walletToAgentId(freelancer);

        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            freelancer: freelancer,
            freelancerAgentId: freelancerAgentId,
            clientAgentId: clientAgentId,
            verifierAgentId: verifierAgentId,
            amount: amount,
            criteriaURI: criteriaURI,
            deliverableURI: "",
            verdictURI: "",
            deadline: deadline,
            status: JobStatus.Open,
            createdAt: block.timestamp
        });

        emit JobCreated(jobId, msg.sender, freelancer, amount, criteriaURI, deadline);
        return jobId;
    }

    /// @notice Client funds the escrow. USDC is locked in this contract.
    function fund(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (j.status != JobStatus.Open) revert WrongStatus();
        if (msg.sender != j.client) revert NotClient();

        bool ok = usdc.transferFrom(msg.sender, address(this), j.amount);
        if (!ok) revert TransferFailed();

        j.status = JobStatus.Funded;
        emit JobFunded(jobId, j.amount);
    }

    /// @notice Freelancer marks delivery with a URI pointing to the work artifact.
    function markDelivered(uint256 jobId, string calldata deliverableURI) external {
        Job storage j = jobs[jobId];
        if (j.status != JobStatus.Funded) revert WrongStatus();
        if (msg.sender != j.freelancer) revert NotFreelancer();
        if (block.timestamp > j.deadline) revert DeadlinePassed();

        j.deliverableURI = deliverableURI;
        j.status = JobStatus.Delivered;
        emit Delivered(jobId, deliverableURI);
    }

    /// @notice Lead Verifier agent submits its verdict. Only the agent registered as
    ///         verifierAgentId in the ERC-8004 registry may call this.
    function submitVerdict(uint256 jobId, bool passed, string calldata verdictURI) external {
        Job storage j = jobs[jobId];
        if (j.status != JobStatus.Delivered) revert WrongStatus();

        address verifierWallet = registry.getAgentWallet(j.verifierAgentId);
        if (msg.sender != verifierWallet) revert NotVerifier();

        j.verdictURI = verdictURI;

        if (passed) {
            j.status = JobStatus.Verified;
            emit Verified(jobId, j.verifierAgentId, true, verdictURI);
            _release(jobId);
        } else {
            j.status = JobStatus.Disputed;
            emit Verified(jobId, j.verifierAgentId, false, verdictURI);
            emit Disputed(jobId, "Criteria not met per Lead Verifier");
        }
    }

    function _release(uint256 jobId) internal {
        Job storage j = jobs[jobId];

        bool ok = usdc.transfer(j.freelancer, j.amount);
        if (!ok) revert TransferFailed();

        j.status = JobStatus.Released;

        if (j.freelancerAgentId != 0) registry.recordOutcome(j.freelancerAgentId, true);
        if (j.clientAgentId != 0) registry.recordOutcome(j.clientAgentId, true);
        if (j.verifierAgentId != 0) registry.recordOutcome(j.verifierAgentId, true);

        emit Released(jobId, j.freelancer, j.amount);
    }

    /// @notice Refund path: if dispute survives second-opinion, the client may reclaim funds.
    ///         Kept open in the hackathon scope; production would gate behind arbiter sig.
    function refund(uint256 jobId) external {
        Job storage j = jobs[jobId];
        if (j.status != JobStatus.Disputed) revert WrongStatus();
        if (msg.sender != j.client) revert NotClient();

        bool ok = usdc.transfer(j.client, j.amount);
        if (!ok) revert TransferFailed();

        j.status = JobStatus.Refunded;
        if (j.freelancerAgentId != 0) registry.recordOutcome(j.freelancerAgentId, false);
        if (j.verifierAgentId != 0) registry.recordOutcome(j.verifierAgentId, false);

        emit Refunded(jobId, j.client, j.amount);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
}
