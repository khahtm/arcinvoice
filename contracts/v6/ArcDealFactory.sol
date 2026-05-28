// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ArcDealEscrow.sol";

/// @title ArcDealFactory
/// @notice Factory for deploying V6 deal escrow contracts
contract ArcDealFactory is Ownable {
    address public immutable usdc;
    address public immutable feeCollector;
    /// @notice Platform-controlled dispute arbiter, baked immutably into each new escrow.
    /// Owner can rotate it for future deals; existing escrows keep the value set at their creation.
    address public klerosExecutor;

    mapping(bytes32 => address) public dealToEscrow;
    address[] public allEscrows;

    event KlerosExecutorUpdated(address indexed executor);

    event DealCreated(
        bytes32 indexed dealId,
        address indexed escrow,
        address indexed creator,
        bytes32 termsHash,
        uint256 totalAmount,
        uint256 milestoneCount
    );

    constructor(address _usdc, address _feeCollector, address _klerosExecutor) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        require(_feeCollector != address(0), "Invalid fee collector");
        usdc = _usdc;
        feeCollector = _feeCollector;
        klerosExecutor = _klerosExecutor;
    }

    /// @notice Rotate the dispute arbiter for future deals. Does not affect already-deployed escrows.
    function setKlerosExecutor(address _executor) external onlyOwner {
        klerosExecutor = _executor;
        emit KlerosExecutorUpdated(_executor);
    }

    function createDeal(
        bytes32 dealId,
        uint256[] calldata milestoneAmounts,
        bytes32 termsHash,
        uint256 autoReleaseDays,
        address expectedClient
    ) external returns (address escrowAddress) {
        require(dealToEscrow[dealId] == address(0), "Deal already exists");

        ArcDealEscrow escrow = new ArcDealEscrow(
            msg.sender,
            usdc,
            feeCollector,
            milestoneAmounts,
            termsHash,
            autoReleaseDays,
            expectedClient,
            klerosExecutor
        );

        escrowAddress = address(escrow);
        dealToEscrow[dealId] = escrowAddress;
        allEscrows.push(escrowAddress);

        uint256 total;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            total += milestoneAmounts[i];
        }

        emit DealCreated(dealId, escrowAddress, msg.sender, termsHash, total, milestoneAmounts.length);
    }

    function getEscrow(bytes32 dealId) external view returns (address) {
        return dealToEscrow[dealId];
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }

    function getEscrowByIndex(uint256 index) external view returns (address) {
        require(index < allEscrows.length, "Out of bounds");
        return allEscrows[index];
    }
}
