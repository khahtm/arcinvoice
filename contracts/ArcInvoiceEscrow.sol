// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArcInvoiceEscrow
/// @notice Escrow contract for holding USDC until release or refund
contract ArcInvoiceEscrow is ReentrancyGuard {
    // State
    enum EscrowState { CREATED, FUNDED, RELEASED, REFUNDED }

    address public immutable creator;
    address public payer;
    IERC20 public immutable usdc;
    uint256 public immutable amount;
    uint256 public immutable autoReleaseDays;
    uint256 public fundedAt;
    EscrowState public state;

    // Events
    event Funded(address indexed payer, uint256 amount, uint256 timestamp);
    event Released(address indexed recipient, uint256 amount);
    event Refunded(address indexed recipient, uint256 amount);

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
        uint256 _amount,
        uint256 _autoReleaseDays
    ) {
        require(_creator != address(0), "Invalid creator");
        require(_usdc != address(0), "Invalid USDC");
        require(_amount > 0, "Invalid amount");
        require(_autoReleaseDays > 0 && _autoReleaseDays <= 90, "Invalid days");

        creator = _creator;
        usdc = IERC20(_usdc);
        amount = _amount;
        autoReleaseDays = _autoReleaseDays;
        state = EscrowState.CREATED;
    }

    /// @notice Payer deposits USDC into escrow
    function deposit() external inState(EscrowState.CREATED) nonReentrant {
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        payer = msg.sender;
        fundedAt = block.timestamp;
        state = EscrowState.FUNDED;

        emit Funded(msg.sender, amount, fundedAt);
    }

    /// @notice Payer releases funds to creator (approves work)
    function release() external onlyPayer inState(EscrowState.FUNDED) nonReentrant {
        state = EscrowState.RELEASED;
        require(usdc.transfer(creator, amount), "Transfer failed");

        emit Released(creator, amount);
    }

    /// @notice Creator voluntarily refunds payer
    function refund() external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
        state = EscrowState.REFUNDED;
        require(usdc.transfer(payer, amount), "Transfer failed");

        emit Refunded(payer, amount);
    }

    /// @notice Auto-release after deadline (callable by anyone)
    function autoRelease() external inState(EscrowState.FUNDED) nonReentrant {
        require(
            block.timestamp >= fundedAt + (autoReleaseDays * 1 days),
            "Too early"
        );

        state = EscrowState.RELEASED;
        require(usdc.transfer(creator, amount), "Transfer failed");

        emit Released(creator, amount);
    }

    /// @notice Get escrow details
    function getDetails() external view returns (
        address _creator,
        address _payer,
        uint256 _amount,
        EscrowState _state,
        uint256 _fundedAt,
        uint256 _autoReleaseDays
    ) {
        return (creator, payer, amount, state, fundedAt, autoReleaseDays);
    }

    /// @notice Check if auto-release is available
    function canAutoRelease() external view returns (bool) {
        return state == EscrowState.FUNDED &&
               block.timestamp >= fundedAt + (autoReleaseDays * 1 days);
    }
}
