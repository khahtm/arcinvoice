// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ArcInvoiceEscrow.sol";

/// @title ArcInvoiceFactory
/// @notice Factory contract for creating escrow contracts
contract ArcInvoiceFactory {
    address public immutable usdc;

    // Tracking
    mapping(bytes32 => address) public invoiceToEscrow;
    address[] public allEscrows;

    // Events
    event EscrowCreated(
        bytes32 indexed invoiceId,
        address indexed escrow,
        address indexed creator,
        uint256 amount
    );

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC");
        usdc = _usdc;
    }

    /// @notice Create new escrow for an invoice
    function createEscrow(
        bytes32 invoiceId,
        uint256 amount,
        uint256 autoReleaseDays
    ) external returns (address) {
        require(invoiceToEscrow[invoiceId] == address(0), "Already exists");

        ArcInvoiceEscrow escrow = new ArcInvoiceEscrow(
            msg.sender, // creator
            usdc,
            amount,
            autoReleaseDays
        );

        address escrowAddress = address(escrow);
        invoiceToEscrow[invoiceId] = escrowAddress;
        allEscrows.push(escrowAddress);

        emit EscrowCreated(invoiceId, escrowAddress, msg.sender, amount);

        return escrowAddress;
    }

    /// @notice Get escrow address for invoice
    function getEscrow(bytes32 invoiceId) external view returns (address) {
        return invoiceToEscrow[invoiceId];
    }

    /// @notice Get total escrow count
    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
