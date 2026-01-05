// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ArcMilestoneEscrow.sol";

/// @title ArcMilestoneFactory
/// @notice Factory contract for creating milestone escrow contracts
/// @dev Deploys new ArcMilestoneEscrow instances for each invoice
contract ArcMilestoneFactory {
    address public immutable usdc;
    address public immutable feeCollector;

    // Tracking
    mapping(bytes32 => address) public invoiceToEscrow;
    address[] public allEscrows;

    // Events
    event EscrowCreated(
        bytes32 indexed invoiceId,
        address indexed escrow,
        address indexed creator,
        uint256 totalAmount,
        uint256 milestoneCount
    );

    constructor(address _usdc, address _feeCollector) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_feeCollector != address(0), "Invalid fee collector address");
        usdc = _usdc;
        feeCollector = _feeCollector;
    }

    /// @notice Create a new milestone escrow for an invoice
    /// @param invoiceId Unique identifier for the invoice (bytes32 hash)
    /// @param milestoneAmounts Array of amounts for each milestone
    /// @param autoReleaseDays Days after funding before auto-release is allowed
    /// @return escrowAddress The address of the newly created escrow
    function createEscrow(
        bytes32 invoiceId,
        uint256[] calldata milestoneAmounts,
        uint256 autoReleaseDays
    ) external returns (address escrowAddress) {
        require(invoiceToEscrow[invoiceId] == address(0), "Escrow already exists for invoice");
        require(milestoneAmounts.length > 0, "Must have at least one milestone");

        ArcMilestoneEscrow escrow = new ArcMilestoneEscrow(
            msg.sender, // creator
            usdc,
            feeCollector,
            milestoneAmounts,
            autoReleaseDays
        );

        escrowAddress = address(escrow);
        invoiceToEscrow[invoiceId] = escrowAddress;
        allEscrows.push(escrowAddress);

        // Calculate total for event
        uint256 total;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            total += milestoneAmounts[i];
        }

        emit EscrowCreated(
            invoiceId,
            escrowAddress,
            msg.sender,
            total,
            milestoneAmounts.length
        );

        return escrowAddress;
    }

    /// @notice Get the escrow address for an invoice
    /// @param invoiceId The invoice identifier
    /// @return The escrow contract address (or zero if not exists)
    function getEscrow(bytes32 invoiceId) external view returns (address) {
        return invoiceToEscrow[invoiceId];
    }

    /// @notice Get the total number of escrows created
    /// @return The count of all escrow contracts
    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }

    /// @notice Get escrow address by index
    /// @param index The index in allEscrows array
    /// @return The escrow address at that index
    function getEscrowByIndex(uint256 index) external view returns (address) {
        require(index < allEscrows.length, "Index out of bounds");
        return allEscrows[index];
    }
}
