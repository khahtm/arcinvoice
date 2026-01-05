// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FeeCollector.sol";

/// @title ArcMilestoneEscrow
/// @notice Pay-per-milestone escrow contract with fee collection
/// @dev Created by ArcMilestoneFactory for each invoice. Payer funds milestones sequentially.
contract ArcMilestoneEscrow is ReentrancyGuard {
    // State: CREATED=awaiting first funding, ACTIVE=at least one funded, COMPLETED=all released, REFUNDED
    enum EscrowState { CREATED, ACTIVE, COMPLETED, REFUNDED }

    struct Milestone {
        uint256 amount;
        bool funded;    // Payer has funded this milestone
        bool released;  // Creator has released this milestone
    }

    // Immutable state
    address public immutable creator;
    IERC20 public immutable usdc;
    FeeCollector public immutable feeCollector;
    uint256 public immutable totalAmount;
    uint256 public immutable autoReleaseDays;

    // Mutable state
    address public payer;
    address public klerosExecutor; // Trusted address for Kleros ruling execution
    uint256 public fundedAt;
    uint256 public fundedAmount;      // Total amount funded so far
    uint256 public releasedAmount;    // Total amount released so far
    uint256 public currentMilestone;  // Index of next fundable milestone
    EscrowState public state;
    Milestone[] public milestones;

    // Events
    event MilestoneFunded(uint256 indexed index, address indexed payer, uint256 amount);
    event MilestoneReleased(uint256 indexed index, uint256 creatorAmount, uint256 fee);
    event Refunded(address indexed recipient, uint256 amount);
    event FullyReleased();
    event FundsSplit(uint256 payerAmount, uint256 creatorAmount);
    event KlerosRulingExecuted(uint256 payerAmount, uint256 creatorAmount);
    event KlerosExecutorUpdated(address indexed newExecutor);

    // Modifiers
    modifier onlyPayer() {
        require(msg.sender == payer, "Only payer");
        _;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    modifier inState(EscrowState _state) {
        require(state == _state, "Invalid state");
        _;
    }

    modifier onlyKlerosExecutor() {
        require(msg.sender == klerosExecutor, "Only Kleros executor");
        _;
    }

    constructor(
        address _creator,
        address _usdc,
        address _feeCollector,
        uint256[] memory _milestoneAmounts,
        uint256 _autoReleaseDays
    ) {
        require(_creator != address(0), "Invalid creator");
        require(_usdc != address(0), "Invalid USDC");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_milestoneAmounts.length > 0 && _milestoneAmounts.length <= 10, "Invalid milestone count");
        require(_autoReleaseDays > 0 && _autoReleaseDays <= 90, "Invalid auto-release days");

        creator = _creator;
        usdc = IERC20(_usdc);
        feeCollector = FeeCollector(_feeCollector);
        autoReleaseDays = _autoReleaseDays;
        state = EscrowState.CREATED;

        uint256 total;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Invalid milestone amount");
            milestones.push(Milestone({
                amount: _milestoneAmounts[i],
                funded: false,
                released: false
            }));
            total += _milestoneAmounts[i];
        }
        totalAmount = total;
    }

    /// @notice Payer funds a specific milestone (sequential order required)
    /// @param index The milestone index to fund
    function fundMilestone(uint256 index) external nonReentrant {
        require(index < milestones.length, "Invalid index");
        require(index == currentMilestone, "Must fund in order");
        require(!milestones[index].funded, "Already funded");

        Milestone storage m = milestones[index];

        // Calculate payer amount for this milestone (amount + fee)
        uint256 payerAmount = feeCollector.calculatePayerAmount(m.amount);
        require(usdc.transferFrom(msg.sender, address(this), payerAmount), "Transfer failed");

        // Update state
        m.funded = true;
        fundedAmount += m.amount;
        currentMilestone++;

        // Set payer on first funding
        if (state == EscrowState.CREATED) {
            payer = msg.sender;
            fundedAt = block.timestamp;
            state = EscrowState.ACTIVE;
        }

        emit MilestoneFunded(index, msg.sender, payerAmount);
    }

    /// @notice Creator releases a funded milestone to receive funds
    /// @param index The milestone index to release
    function releaseMilestone(uint256 index) external onlyCreator nonReentrant {
        require(state == EscrowState.ACTIVE, "Not active");
        require(index < milestones.length, "Invalid index");
        require(milestones[index].funded, "Not funded");
        require(!milestones[index].released, "Already released");

        _releaseMilestone(index);
    }

    /// @notice Creator refunds all funded but unreleased milestones to payer
    function refund() external onlyCreator nonReentrant {
        require(state == EscrowState.ACTIVE, "Not active");

        uint256 refundable = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].funded && !milestones[i].released) {
                // Calculate what was deposited for this milestone (amount + fee)
                refundable += feeCollector.calculatePayerAmount(milestones[i].amount);
                milestones[i].funded = false;  // Reset funded state
            }
        }

        require(refundable > 0, "Nothing to refund");
        state = EscrowState.REFUNDED;
        require(usdc.transfer(payer, refundable), "Transfer failed");

        emit Refunded(payer, refundable);
    }

    /// @notice Split funds between payer and creator (for dispute resolution)
    /// @dev Only callable by payer who can choose to split funds
    /// @param payerAmount Amount to return to payer
    function splitFunds(uint256 payerAmount) external onlyPayer nonReentrant {
        require(state == EscrowState.ACTIVE, "Not active");
        uint256 remaining = usdc.balanceOf(address(this));
        require(payerAmount <= remaining, "Exceeds balance");

        uint256 creatorAmount = remaining - payerAmount;
        state = EscrowState.COMPLETED;

        // Transfer to payer (no fee on refunded portion)
        if (payerAmount > 0) {
            require(usdc.transfer(payer, payerAmount), "Payer transfer failed");
        }

        // Transfer to creator (with fee on their portion)
        if (creatorAmount > 0) {
            uint256 fee = feeCollector.calculateFee(creatorAmount);
            uint256 creatorNet = creatorAmount - fee;

            require(usdc.transfer(creator, creatorNet), "Creator transfer failed");
            if (fee > 0) {
                require(usdc.transfer(address(feeCollector), fee), "Fee transfer failed");
                feeCollector.recordFee(fee);
            }
        }

        emit FundsSplit(payerAmount, creatorAmount);
    }

    /// @notice Set Kleros executor address (only creator can set once)
    /// @param _executor The trusted executor address
    function setKlerosExecutor(address _executor) external onlyCreator {
        require(klerosExecutor == address(0), "Already set");
        require(_executor != address(0), "Invalid executor");
        klerosExecutor = _executor;
        emit KlerosExecutorUpdated(_executor);
    }

    /// @notice Execute Kleros ruling (only callable by trusted executor)
    /// @param payerAmount Amount to return to payer
    /// @param creatorAmount Amount to release to creator
    function executeKlerosRuling(
        uint256 payerAmount,
        uint256 creatorAmount
    ) external onlyKlerosExecutor nonReentrant {
        require(state == EscrowState.ACTIVE, "Not active");
        uint256 remaining = usdc.balanceOf(address(this));
        require(payerAmount + creatorAmount <= remaining, "Invalid amounts");

        state = EscrowState.COMPLETED;

        // Transfer to payer (no fee on refunded portion)
        if (payerAmount > 0) {
            require(usdc.transfer(payer, payerAmount), "Payer transfer failed");
        }

        // Transfer to creator (with fee on their portion)
        if (creatorAmount > 0) {
            uint256 fee = feeCollector.calculateFee(creatorAmount);
            uint256 creatorNet = creatorAmount - fee;

            require(usdc.transfer(creator, creatorNet), "Creator transfer failed");
            if (fee > 0) {
                require(usdc.transfer(address(feeCollector), fee), "Fee transfer failed");
                feeCollector.recordFee(fee);
            }
        }

        emit KlerosRulingExecuted(payerAmount, creatorAmount);
    }

    /// @notice Anyone can trigger auto-release after deadline
    function autoRelease() external nonReentrant {
        require(state == EscrowState.ACTIVE, "Not active");
        require(
            block.timestamp >= fundedAt + (autoReleaseDays * 1 days),
            "Too early for auto-release"
        );

        // Release all funded but unreleased milestones
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].funded && !milestones[i].released) {
                _releaseMilestone(i);
            }
        }
    }

    /// @notice Internal function to release a milestone
    function _releaseMilestone(uint256 index) internal {
        Milestone storage m = milestones[index];
        m.released = true;

        uint256 creatorAmount = feeCollector.calculateCreatorAmount(m.amount);
        uint256 fee = feeCollector.calculateFee(m.amount);

        // Transfer to creator (minus their fee portion)
        require(usdc.transfer(creator, creatorAmount), "Creator transfer failed");

        // Transfer total fee to collector
        require(usdc.transfer(address(feeCollector), fee), "Fee transfer failed");
        feeCollector.recordFee(fee);

        releasedAmount += m.amount;
        emit MilestoneReleased(index, creatorAmount, fee);

        // Check if all milestones released
        if (releasedAmount >= totalAmount) {
            state = EscrowState.COMPLETED;
            emit FullyReleased();
        }
    }

    // View functions

    /// @notice Get the number of milestones
    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    /// @notice Get milestone details
    function getMilestone(uint256 index) external view returns (
        uint256 amount,
        bool funded,
        bool released
    ) {
        require(index < milestones.length, "Invalid index");
        Milestone memory m = milestones[index];
        return (m.amount, m.funded, m.released);
    }

    /// @notice Check if auto-release is available
    function canAutoRelease() external view returns (bool) {
        return state == EscrowState.ACTIVE &&
               block.timestamp >= fundedAt + (autoReleaseDays * 1 days);
    }

    /// @notice Get the index of the next fundable milestone
    function getCurrentMilestone() external view returns (uint256) {
        return currentMilestone;
    }

    /// @notice Get escrow details
    function getDetails() external view returns (
        address _creator,
        address _payer,
        uint256 _totalAmount,
        uint256 _fundedAmount,
        uint256 _releasedAmount,
        EscrowState _state,
        uint256 _fundedAt,
        uint256 _autoReleaseDays,
        uint256 _milestoneCount,
        uint256 _currentMilestone
    ) {
        return (
            creator,
            payer,
            totalAmount,
            fundedAmount,
            releasedAmount,
            state,
            fundedAt,
            autoReleaseDays,
            milestones.length,
            currentMilestone
        );
    }
}
