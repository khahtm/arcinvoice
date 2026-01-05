// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FeeCollector
/// @notice Collects and manages protocol fees for Arc Invoice
/// @dev Receives fees from escrow contracts and allows owner to withdraw
contract FeeCollector is Ownable {
    IERC20 public immutable usdc;

    /// @notice Fee in basis points (100 = 1%)
    uint256 public constant FEE_BPS = 100;

    /// @notice Total fees collected (for tracking)
    uint256 public totalCollected;

    event FeeCollected(address indexed from, uint256 amount);
    event FeeWithdrawn(address indexed to, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /// @notice Calculate total fee for an amount
    /// @param amount The invoice amount
    /// @return The fee amount (1% of invoice)
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return (amount * FEE_BPS) / 10000;
    }

    /// @notice Calculate what payer needs to deposit (amount + half fee)
    /// @param invoiceAmount The base invoice amount
    /// @return The total payer needs to deposit
    function calculatePayerAmount(uint256 invoiceAmount) public pure returns (uint256) {
        uint256 halfFee = calculateFee(invoiceAmount) / 2;
        return invoiceAmount + halfFee;
    }

    /// @notice Calculate what creator receives (amount - half fee)
    /// @param invoiceAmount The base invoice amount
    /// @return The amount creator receives after fee
    function calculateCreatorAmount(uint256 invoiceAmount) public pure returns (uint256) {
        uint256 halfFee = calculateFee(invoiceAmount) / 2;
        return invoiceAmount - halfFee;
    }

    /// @notice Record fee collection (called by escrow contracts)
    /// @param amount The fee amount collected
    function recordFee(uint256 amount) external {
        totalCollected += amount;
        emit FeeCollected(msg.sender, amount);
    }

    /// @notice Withdraw collected fees to specified address
    /// @param to The address to send fees to
    function withdraw(address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        require(usdc.transfer(to, balance), "Transfer failed");
        emit FeeWithdrawn(to, balance);
    }

    /// @notice Get current balance of collected fees
    /// @return The USDC balance held by this contract
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
