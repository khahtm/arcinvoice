// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FeeCollector.sol";

/// @title ArcMilestoneEscrow
/// @notice Escrow contract with milestone support and fee collection
/// @dev Created by ArcMilestoneFactory for each invoice
contract ArcMilestoneEscrow is ReentrancyGuard {
    enum EscrowState { CREATED, FUNDED, RELEASED, REFUNDED }

    struct Milestone {
        uint256 amount;
        bool approved;
        bool released;
    }

    // Immutable state
    address public immutable creator;
    IERC20 public immutable usdc;
    FeeCollector public immutable feeCollector;
    uint256 public immutable totalAmount;
    uint256 public immutable autoReleaseDays;

    // Mutable state
    address public payer;
    uint256 public fundedAt;
    uint256 public releasedAmount;
    EscrowState public state;
    Milestone[] public milestones;

    // Events
    event Funded(address indexed payer, uint256 amount, uint256 timestamp);
    event MilestoneApproved(uint256 indexed index);
    event MilestoneReleased(uint256 indexed index, uint256 creatorAmount, uint256 fee);
    event Refunded(address indexed recipient, uint256 amount);
    event FullyReleased();
    event FundsSplit(uint256 payerAmount, uint256 creatorAmount);

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
                approved: false,
                released: false
            }));
            total += _milestoneAmounts[i];
        }
        totalAmount = total;
    }

    /// @notice Payer deposits funds (amount + payer fee portion)
    function deposit() external inState(EscrowState.CREATED) nonReentrant {
        uint256 payerAmount = feeCollector.calculatePayerAmount(totalAmount);
        require(usdc.transferFrom(msg.sender, address(this), payerAmount), "Transfer failed");

        payer = msg.sender;
        fundedAt = block.timestamp;
        state = EscrowState.FUNDED;

        emit Funded(msg.sender, payerAmount, fundedAt);
    }

    /// @notice Payer approves a milestone (signals work is acceptable)
    /// @param index The milestone index to approve
    function approveMilestone(uint256 index) external onlyPayer inState(EscrowState.FUNDED) {
        require(index < milestones.length, "Invalid index");
        require(!milestones[index].approved, "Already approved");

        milestones[index].approved = true;
        emit MilestoneApproved(index);
    }

    /// @notice Creator releases an approved milestone to receive funds
    /// @param index The milestone index to release
    function releaseMilestone(uint256 index) external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
        require(index < milestones.length, "Invalid index");
        require(milestones[index].approved, "Not approved");
        require(!milestones[index].released, "Already released");

        _releaseMilestone(index);
    }

    /// @notice Creator refunds all remaining funds to payer
    function refund() external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
        uint256 remaining = usdc.balanceOf(address(this));
        require(remaining > 0, "Nothing to refund");

        state = EscrowState.REFUNDED;
        require(usdc.transfer(payer, remaining), "Transfer failed");

        emit Refunded(payer, remaining);
    }

    /// @notice Split funds between payer and creator (for dispute resolution)
    /// @dev Only callable by payer who can choose to split funds
    /// @param payerAmount Amount to return to payer
    function splitFunds(uint256 payerAmount) external onlyPayer inState(EscrowState.FUNDED) nonReentrant {
        uint256 remaining = usdc.balanceOf(address(this));
        require(payerAmount <= remaining, "Exceeds balance");

        uint256 creatorAmount = remaining - payerAmount;
        state = EscrowState.RELEASED;

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

    /// @notice Anyone can trigger auto-release after deadline
    function autoRelease() external inState(EscrowState.FUNDED) nonReentrant {
        require(
            block.timestamp >= fundedAt + (autoReleaseDays * 1 days),
            "Too early for auto-release"
        );

        // Release all unreleased milestones
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].released) {
                milestones[i].approved = true;
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
            state = EscrowState.RELEASED;
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
        bool approved,
        bool released
    ) {
        require(index < milestones.length, "Invalid index");
        Milestone memory m = milestones[index];
        return (m.amount, m.approved, m.released);
    }

    /// @notice Check if auto-release is available
    function canAutoRelease() external view returns (bool) {
        return state == EscrowState.FUNDED &&
               block.timestamp >= fundedAt + (autoReleaseDays * 1 days);
    }

    /// @notice Get escrow details
    function getDetails() external view returns (
        address _creator,
        address _payer,
        uint256 _totalAmount,
        uint256 _releasedAmount,
        EscrowState _state,
        uint256 _fundedAt,
        uint256 _autoReleaseDays,
        uint256 _milestoneCount
    ) {
        return (
            creator,
            payer,
            totalAmount,
            releasedAmount,
            state,
            fundedAt,
            autoReleaseDays,
            milestones.length
        );
    }
}
