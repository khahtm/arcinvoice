// ERC20 ABI for USDC interactions
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Factory ABI for creating escrows
export const FACTORY_ABI = [
  {
    name: 'createEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'invoiceId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'autoReleaseDays', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'EscrowCreated',
    type: 'event',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'escrow', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Escrow ABI for escrow operations
export const ESCROW_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'release',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'autoRelease',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_creator', type: 'address' },
      { name: '_payer', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_state', type: 'uint8' },
      { name: '_fundedAt', type: 'uint256' },
      { name: '_autoReleaseDays', type: 'uint256' },
    ],
  },
  {
    name: 'state',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'canAutoRelease',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'Funded',
    type: 'event',
    inputs: [
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Released',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Refunded',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ============================================
// V2 ABIs (Milestone Escrow + Fees)
// ============================================

// FeeCollector ABI
export const FEE_COLLECTOR_ABI = [
  {
    name: 'FEE_BPS',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalCollected',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'calculateFee',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'calculatePayerAmount',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'invoiceAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'calculateCreatorAmount',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'invoiceAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'FeeCollected',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Milestone Factory ABI
export const MILESTONE_FACTORY_ABI = [
  {
    name: 'createEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'invoiceId', type: 'bytes32' },
      { name: 'milestoneAmounts', type: 'uint256[]' },
      { name: 'autoReleaseDays', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getEscrowCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'EscrowCreated',
    type: 'event',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'escrow', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'milestoneCount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Milestone Escrow ABI V2 Legacy (fund-all-upfront)
// Used for existing V2 invoices created before 2026-01-05
export const MILESTONE_ESCROW_ABI_V2_LEGACY = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'approveMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'releaseMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'autoRelease',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_creator', type: 'address' },
      { name: '_payer', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_state', type: 'uint8' },
      { name: '_fundedAt', type: 'uint256' },
      { name: '_autoReleaseDays', type: 'uint256' },
      { name: '_milestoneCount', type: 'uint256' },
    ],
  },
  {
    name: 'getMilestone',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'approved', type: 'bool' },
      { name: 'released', type: 'bool' },
    ],
  },
  {
    name: 'getMilestoneCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'state',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'canAutoRelease',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'Funded',
    type: 'event',
    inputs: [
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MilestoneApproved',
    type: 'event',
    inputs: [
      { name: 'index', type: 'uint256', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
    ],
  },
  {
    name: 'MilestoneReleased',
    type: 'event',
    inputs: [
      { name: 'index', type: 'uint256', indexed: true },
      { name: 'creatorAmount', type: 'uint256', indexed: false },
      { name: 'fee', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Refunded',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Milestone Escrow ABI (V3: Pay-per-milestone)
export const MILESTONE_ESCROW_ABI = [
  // V3: Fund individual milestones sequentially
  {
    name: 'fundMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'releaseMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'autoRelease',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_creator', type: 'address' },
      { name: '_payer', type: 'address' },
      { name: '_totalAmount', type: 'uint256' },
      { name: '_fundedAmount', type: 'uint256' },
      { name: '_releasedAmount', type: 'uint256' },
      { name: '_state', type: 'uint8' },
      { name: '_fundedAt', type: 'uint256' },
      { name: '_autoReleaseDays', type: 'uint256' },
      { name: '_milestoneCount', type: 'uint256' },
      { name: '_currentMilestone', type: 'uint256' },
    ],
  },
  {
    name: 'getMilestone',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'funded', type: 'bool' },
      { name: 'released', type: 'bool' },
    ],
  },
  {
    name: 'getMilestoneCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getCurrentMilestone',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'state',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'canAutoRelease',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'fundedAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'releasedAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'MilestoneFunded',
    type: 'event',
    inputs: [
      { name: 'index', type: 'uint256', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MilestoneReleased',
    type: 'event',
    inputs: [
      { name: 'index', type: 'uint256', indexed: true },
      { name: 'creatorAmount', type: 'uint256', indexed: false },
      { name: 'fee', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Refunded',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'FullyReleased',
    type: 'event',
    inputs: [],
  },
  {
    name: 'splitFunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'payerAmount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'FundsSplit',
    type: 'event',
    inputs: [
      { name: 'payerAmount', type: 'uint256', indexed: false },
      { name: 'creatorAmount', type: 'uint256', indexed: false },
    ],
  },
  // Kleros integration
  {
    name: 'klerosExecutor',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setKlerosExecutor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_executor', type: 'address' }],
    outputs: [],
  },
  {
    name: 'executeKlerosRuling',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'payerAmount', type: 'uint256' },
      { name: 'creatorAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'KlerosRulingExecuted',
    type: 'event',
    inputs: [
      { name: 'payerAmount', type: 'uint256', indexed: false },
      { name: 'creatorAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'KlerosExecutorUpdated',
    type: 'event',
    inputs: [{ name: 'newExecutor', type: 'address', indexed: true }],
  },
] as const;
