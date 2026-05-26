/**
 * Minimal ABIs for the contracts PaidProof interacts with on GOAT.
 * Keep these surgical — only the functions actually called.
 */

/** ERC-20 standard subset used for USDC transfers. */
export const ERC20_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * ERC-8004 Identity Registry — minimal subset.
 * Spec: https://ercs.ethereum.org/ERCS/erc-8004
 * Impl: https://github.com/erc-8004/erc-8004-contracts
 */
export const IDENTITY_REGISTRY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "register",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setAgentURI",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "agentURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "tokenOfOwnerByIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

/**
 * ERC-8004 Reputation Registry — minimal subset.
 * Stores feedback signals as int128 fixed-point values + bytes32 tags.
 */
export const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "giveFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "revokeFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "feedbackIndex", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getSummary",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
    ],
    outputs: [
      { name: "count", type: "uint256" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "FeedbackGiven",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "clientAddress", type: "address", indexed: true },
      { name: "feedbackIndex", type: "uint256", indexed: false },
      { name: "value", type: "int128", indexed: false },
      { name: "valueDecimals", type: "uint8", indexed: false },
      { name: "tag1", type: "bytes32", indexed: false },
      { name: "tag2", type: "bytes32", indexed: false },
    ],
  },
] as const;

/**
 * PaidProof's AgentRegistry — ERC-8004-flavored identity + reputation.
 * Matches `contracts/AgentRegistry.sol`. AgentRole enum:
 *   0 = Freelancer, 1 = Client, 2 = Verifier, 3 = Specialist
 */
export const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "register",
    inputs: [
      { name: "name", type: "string" },
      { name: "uri", type: "string" },
      { name: "role", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "updateUri",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "uri", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "recordOutcome",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "success", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "walletToAgentId",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getAgentWallet",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getAgent",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
          { name: "uri", type: "string" },
          { name: "role", type: "uint8" },
          { name: "jobsCompleted", type: "uint256" },
          { name: "jobsSuccessful", type: "uint256" },
          { name: "reputationScore", type: "uint256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "role", type: "uint8", indexed: false },
      { name: "uri", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ReputationUpdated",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "jobsCompleted", type: "uint256", indexed: false },
      { name: "jobsSuccessful", type: "uint256", indexed: false },
      { name: "reputationScore", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * PaidProof Escrow contract. Matches `contracts/Escrow.sol`.
 *
 *   JobStatus: 0 Open  1 Funded  2 Delivered  3 Verified  4 Released  5 Disputed  6 Refunded
 *
 * Lifecycle:
 *   createJob → fund → markDelivered → submitVerdict
 *   submitVerdict auto-releases on pass; sets Disputed on fail.
 */
export const ESCROW_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "createJob",
    inputs: [
      { name: "freelancer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "criteriaURI", type: "string" },
      { name: "deadline", type: "uint64" },
      { name: "verifierAgentId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "fund",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "markDelivered",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliverableURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "submitVerdict",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "passed", type: "bool" },
      { name: "verdictURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "refund",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "client", type: "address" },
          { name: "freelancer", type: "address" },
          { name: "freelancerAgentId", type: "uint256" },
          { name: "clientAgentId", type: "uint256" },
          { name: "verifierAgentId", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "criteriaURI", type: "string" },
          { name: "deliverableURI", type: "string" },
          { name: "verdictURI", type: "string" },
          { name: "deadline", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "nextJobId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "JobCreated",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "freelancer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "criteriaURI", type: "string", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "JobFunded",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Delivered",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "deliverableURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Verified",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "verifierAgentId", type: "uint256", indexed: true },
      { name: "passed", type: "bool", indexed: false },
      { name: "verdictURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Released",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "freelancer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Disputed",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
