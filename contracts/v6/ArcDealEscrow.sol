// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../v2/FeeCollector.sol";

/// @title ArcDealEscrow
/// @notice V6 — Milestone-based escrow with terms signing, dispute freeze, and inactivity refund.
/// @dev Created by ArcDealFactory. Contract is the source of truth; DB is a read cache.
contract ArcDealEscrow is ReentrancyGuard {

    enum State { CREATED, SIGNED, FUNDED, ACTIVE, DISPUTED, COMPLETED, REFUNDED }

    struct Milestone {
        uint256 amount;
        bool funded;
        bool delivered;
        bool approved;
        bool released;
    }

    // --- Immutable ---
    address public immutable creator;
    IERC20 public immutable usdc;
    FeeCollector public immutable feeCollector;
    bytes32 public immutable termsHash;
    uint256 public immutable totalAmount;
    uint256 public immutable autoReleaseDays;
    /// @notice If non-zero, only this wallet may sign + fund the deal. Zero = open to first non-creator signer.
    address public immutable expectedClient;
    /// @notice Dispute arbiter, fixed at creation by the factory (platform-controlled). Creator cannot change it.
    address public immutable klerosExecutor;
    /// @notice Stalled-dispute escape hatch: after this window with no resolution, funds refund to client.
    uint256 public constant DISPUTE_TIMEOUT = 30 days;

    // --- Mutable ---
    address public client;
    State public state;
    Milestone[] public milestones;
    uint256 public currentMilestone;
    uint256 public fundedAmount;
    uint256 public releasedAmount;
    uint256 public fundedAt;
    uint256 public lastActivityAt;
    bool public disputeActive;
    uint256 public disputedMilestoneIndex;
    uint256 public disputeOpenedAt;

    // --- Events ---
    event TermsSigned(address indexed client);
    event MilestoneFunded(uint256 indexed index, address indexed payer, uint256 amount);
    event DeliverySubmitted(uint256 indexed index, address indexed creator);
    event MilestoneApproved(uint256 indexed index, address indexed client);
    event MilestoneReleased(uint256 indexed index, uint256 creatorAmount, uint256 fee);
    event DisputeOpened(uint256 indexed milestoneIndex, address indexed openedBy);
    event DisputeResolved(uint256 payerAmount, uint256 creatorAmount);
    event AutoReleased(uint256 milestonesReleased);
    event Refunded(address indexed recipient, uint256 amount);
    event InactivityRefund(address indexed recipient, uint256 amount);
    event FullyCompleted();
    event DisputeTimedOut(address indexed recipient, uint256 amount);

    // --- Modifiers ---
    modifier onlyCreator() { require(msg.sender == creator, "Only creator"); _; }
    modifier onlyClient() { require(msg.sender == client, "Only client"); _; }
    modifier inState(State _s) { require(state == _s, "Invalid state"); _; }

    constructor(
        address _creator,
        address _usdc,
        address _feeCollector,
        uint256[] memory _milestoneAmounts,
        bytes32 _termsHash,
        uint256 _autoReleaseDays,
        address _expectedClient,
        address _klerosExecutor
    ) {
        require(_creator != address(0), "Invalid creator");
        require(_usdc != address(0), "Invalid USDC");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_milestoneAmounts.length > 0 && _milestoneAmounts.length <= 20, "1-20 milestones");
        require(_autoReleaseDays > 0 && _autoReleaseDays <= 90, "1-90 days");
        require(_expectedClient != _creator, "Client cannot be creator");

        creator = _creator;
        usdc = IERC20(_usdc);
        feeCollector = FeeCollector(_feeCollector);
        termsHash = _termsHash;
        autoReleaseDays = _autoReleaseDays;
        expectedClient = _expectedClient;
        klerosExecutor = _klerosExecutor;
        state = State.CREATED;

        uint256 total;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Zero amount");
            milestones.push(Milestone({
                amount: _milestoneAmounts[i],
                funded: false,
                delivered: false,
                approved: false,
                released: false
            }));
            total += _milestoneAmounts[i];
        }
        require(total >= 1e6, "Min $1 total");
        totalAmount = total;
    }

    // =========================================================================
    // Client signs terms — transitions CREATED → SIGNED
    // =========================================================================

    function signTerms() external inState(State.CREATED) {
        require(msg.sender != creator, "Self-deal blocked");
        if (expectedClient != address(0)) {
            require(msg.sender == expectedClient, "Not the designated client");
        }
        client = msg.sender;
        state = State.SIGNED;
        lastActivityAt = block.timestamp;
        emit TermsSigned(msg.sender);
    }

    // =========================================================================
    // Client funds milestones sequentially
    // =========================================================================

    function fundMilestone(uint256 index) external nonReentrant {
        require(state == State.SIGNED || state == State.ACTIVE, "Not fundable");
        require(msg.sender == client, "Only client");
        require(index < milestones.length, "Invalid index");
        require(index == currentMilestone, "Fund in order");
        require(!milestones[index].funded, "Already funded");

        Milestone storage m = milestones[index];
        uint256 payerAmount = feeCollector.calculatePayerAmount(m.amount);
        require(usdc.transferFrom(msg.sender, address(this), payerAmount), "Transfer failed");

        m.funded = true;
        fundedAmount += m.amount;
        currentMilestone++;
        lastActivityAt = block.timestamp;

        if (state == State.SIGNED) {
            fundedAt = block.timestamp;
            state = State.FUNDED;
        }
        if (fundedAmount > releasedAmount) {
            state = State.ACTIVE;
        }

        emit MilestoneFunded(index, msg.sender, payerAmount);
    }

    // =========================================================================
    // Freelancer submits delivery proof
    // =========================================================================

    function submitDelivery(uint256 index) external onlyCreator nonReentrant {
        require(state == State.ACTIVE, "Not active");
        require(index < milestones.length, "Invalid index");
        require(milestones[index].funded, "Not funded");
        require(!milestones[index].delivered, "Already delivered");

        milestones[index].delivered = true;
        lastActivityAt = block.timestamp;
        emit DeliverySubmitted(index, msg.sender);
    }

    // =========================================================================
    // Client approves milestone delivery
    // =========================================================================

    function approveMilestone(uint256 index) external onlyClient nonReentrant {
        require(state == State.ACTIVE, "Not active");
        require(index < milestones.length, "Invalid index");
        require(milestones[index].delivered, "Not delivered");
        require(!milestones[index].approved, "Already approved");

        milestones[index].approved = true;
        lastActivityAt = block.timestamp;
        emit MilestoneApproved(index, msg.sender);
    }

    // =========================================================================
    // Freelancer releases approved milestone to claim funds
    // =========================================================================

    function releaseMilestone(uint256 index) external onlyCreator nonReentrant {
        require(state == State.ACTIVE, "Not active");
        require(index < milestones.length, "Invalid index");
        require(milestones[index].approved, "Not approved");
        require(!milestones[index].released, "Already released");

        _releaseMilestone(index);
    }

    // =========================================================================
    // Dispute — freezes auto-release timer
    // =========================================================================

    function openDispute(uint256 milestoneIndex) external nonReentrant {
        require(state == State.ACTIVE, "Not active");
        require(msg.sender == creator || msg.sender == client, "Not a party");
        require(milestoneIndex < milestones.length, "Invalid index");
        require(milestones[milestoneIndex].funded, "Not funded");
        require(!milestones[milestoneIndex].released, "Already released");
        require(!disputeActive, "Dispute already open");

        disputeActive = true;
        disputedMilestoneIndex = milestoneIndex;
        state = State.DISPUTED;
        disputeOpenedAt = block.timestamp;
        lastActivityAt = block.timestamp;
        emit DisputeOpened(milestoneIndex, msg.sender);
    }

    function resolveDispute(
        uint256 payerAmount,
        uint256 creatorAmount
    ) external nonReentrant {
        require(msg.sender == klerosExecutor, "Only Kleros executor");
        require(state == State.DISPUTED, "Not disputed");
        uint256 remaining = usdc.balanceOf(address(this));
        require(payerAmount + creatorAmount <= remaining, "Exceeds balance");

        disputeActive = false;
        state = State.COMPLETED;
        lastActivityAt = block.timestamp;

        if (payerAmount > 0) {
            require(usdc.transfer(client, payerAmount), "Payer transfer failed");
        }
        if (creatorAmount > 0) {
            uint256 fee = feeCollector.calculateFee(creatorAmount);
            uint256 net = creatorAmount - fee;
            require(usdc.transfer(creator, net), "Creator transfer failed");
            if (fee > 0) {
                require(usdc.transfer(address(feeCollector), fee), "Fee failed");
                feeCollector.recordFee(fee);
            }
        }

        emit DisputeResolved(payerAmount, creatorAmount);
    }

    // =========================================================================
    // Dispute timeout escape hatch — prevents permanent fund lock if the
    // executor never resolves. After DISPUTE_TIMEOUT, anyone can trigger a
    // refund of all unreleased funded milestones to the client (the payer).
    // =========================================================================

    function resolveDisputeTimeout() external nonReentrant {
        require(state == State.DISPUTED, "Not disputed");
        require(block.timestamp >= disputeOpenedAt + DISPUTE_TIMEOUT, "Timeout not reached");

        uint256 refundable;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].funded && !milestones[i].released) {
                refundable += feeCollector.calculatePayerAmount(milestones[i].amount);
                milestones[i].funded = false;
            }
        }
        require(refundable > 0, "Nothing to refund");

        disputeActive = false;
        state = State.REFUNDED;
        lastActivityAt = block.timestamp;
        require(usdc.transfer(client, refundable), "Transfer failed");
        emit DisputeTimedOut(client, refundable);
    }

    // =========================================================================
    // Auto-release — blocked when dispute is active
    // =========================================================================

    function autoRelease() external nonReentrant {
        require(state == State.ACTIVE, "Not active");
        require(!disputeActive, "Dispute active");
        require(block.timestamp >= fundedAt + (autoReleaseDays * 1 days), "Too early");

        uint256 count;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].funded && !milestones[i].released) {
                _releaseMilestone(i);
                count++;
            }
        }
        require(count > 0, "Nothing to release");
        emit AutoReleased(count);
    }

    // =========================================================================
    // Refund — creator returns funds to client
    // =========================================================================

    function refund() external onlyCreator nonReentrant {
        require(state == State.ACTIVE || state == State.FUNDED, "Not refundable");
        require(!disputeActive, "Dispute active");

        uint256 refundable;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].funded && !milestones[i].released) {
                refundable += feeCollector.calculatePayerAmount(milestones[i].amount);
                milestones[i].funded = false;
            }
        }
        require(refundable > 0, "Nothing to refund");

        state = State.REFUNDED;
        require(usdc.transfer(client, refundable), "Transfer failed");
        emit Refunded(client, refundable);
    }

    // =========================================================================
    // Inactivity refund — client can reclaim if freelancer ghosts
    // =========================================================================

    function refundInactive() external onlyClient nonReentrant {
        require(state == State.ACTIVE, "Not active");
        require(!disputeActive, "Dispute active");
        require(
            block.timestamp >= lastActivityAt + (autoReleaseDays * 2 * 1 days),
            "Not inactive long enough"
        );

        uint256 refundable;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].funded && !milestones[i].released) {
                refundable += feeCollector.calculatePayerAmount(milestones[i].amount);
                milestones[i].funded = false;
            }
        }
        require(refundable > 0, "Nothing to refund");

        state = State.REFUNDED;
        require(usdc.transfer(client, refundable), "Transfer failed");
        emit InactivityRefund(client, refundable);
    }

    // =========================================================================
    // Internal
    // =========================================================================

    function _releaseMilestone(uint256 index) internal {
        Milestone storage m = milestones[index];
        m.released = true;

        uint256 creatorNet = feeCollector.calculateCreatorAmount(m.amount);
        uint256 fee = feeCollector.calculateFee(m.amount);

        require(usdc.transfer(creator, creatorNet), "Creator transfer failed");
        require(usdc.transfer(address(feeCollector), fee), "Fee failed");
        feeCollector.recordFee(fee);

        releasedAmount += m.amount;
        emit MilestoneReleased(index, creatorNet, fee);

        if (releasedAmount >= totalAmount) {
            state = State.COMPLETED;
            emit FullyCompleted();
        }
    }

    // =========================================================================
    // View functions
    // =========================================================================

    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function getMilestone(uint256 index) external view returns (
        uint256 amount, bool funded, bool delivered, bool approved, bool released
    ) {
        require(index < milestones.length, "Invalid index");
        Milestone memory m = milestones[index];
        return (m.amount, m.funded, m.delivered, m.approved, m.released);
    }

    function canAutoRelease() external view returns (bool) {
        return state == State.ACTIVE &&
               !disputeActive &&
               block.timestamp >= fundedAt + (autoReleaseDays * 1 days);
    }

    function canRefundInactive() external view returns (bool) {
        return state == State.ACTIVE &&
               !disputeActive &&
               block.timestamp >= lastActivityAt + (autoReleaseDays * 2 * 1 days);
    }

    function canResolveDisputeTimeout() external view returns (bool) {
        return state == State.DISPUTED &&
               block.timestamp >= disputeOpenedAt + DISPUTE_TIMEOUT;
    }

    function getParties() external view returns (
        address _creator,
        address _client,
        bytes32 _termsHash
    ) {
        return (creator, client, termsHash);
    }

    function getAmounts() external view returns (
        uint256 _totalAmount,
        uint256 _fundedAmount,
        uint256 _releasedAmount,
        uint256 _milestoneCount,
        uint256 _currentMilestone
    ) {
        return (totalAmount, fundedAmount, releasedAmount, milestones.length, currentMilestone);
    }

    function getState() external view returns (
        State _state,
        uint256 _fundedAt,
        uint256 _lastActivityAt,
        uint256 _autoReleaseDays,
        bool _disputeActive,
        uint256 _disputedMilestoneIndex
    ) {
        return (state, fundedAt, lastActivityAt, autoReleaseDays, disputeActive, disputedMilestoneIndex);
    }
}
