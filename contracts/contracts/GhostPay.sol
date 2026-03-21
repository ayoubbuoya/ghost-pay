// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract GhostPay is Ownable {
    // ============================================================
    // FHE TYPES EXPLANATION
    // ============================================================
    // euint32: Encrypted 32-bit unsigned integer. Stores values up to 4,294,967,295.
    // Perfect for salaries (e.g., cents for USD = up to $42M per year).
    // Unlike regular uint32, euint32 values CANNOT be read directly.
    // They must be decrypted by the authorized user with proper permissions.
    //
    // InEuint32: Input type for encrypted data coming from the frontend.
    // The frontend (using fhenix.js) encrypts data before sending to the contract.
    // We convert this to euint32 using FHE.asEuint32().
    // ============================================================

    struct Employee {
        euint32 salary; // Encrypted annual salary
        euint32 bonus; // Encrypted bonus amount
        bool isActive; // Employment status (true = employed, false = terminated)
    }

    // ============================================================
    // STATE VARIABLES
    // ============================================================
    mapping(address => Employee) public employees; // Employee data by wallet address
    address[] public employeeList; // List of all employee addresses
    mapping(address => euint32) public totalPaid; // Total amount paid to each employee

    // ============================================================
    // EVENTS
    // ============================================================
    event EmployeeAdded(address indexed employee);
    event EmployeePaid(address indexed employee, bytes32 amount);
    event EmployeeRemoved(address indexed employee);

    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    constructor() Ownable(msg.sender) {}

    // ============================================================
    // OWNER FUNCTIONS
    // ============================================================

    /**
     * @notice Add a new employee with encrypted salary and bonus
     * @dev Only callable by owner
     * @param employee The wallet address of the employee
     * @param salary Encrypted salary payload from frontend (InEuint32)
     * @param bonus Encrypted bonus payload from frontend (InEuint32)
     *
     * FHE Pattern Explanation:
     * 1. Frontend encrypts salary/bonus using fhenix.js and sends as InEuint32
     * 2. Contract converts to euint32 using FHE.asEuint32()
     * 3. FHE.allowThis() grants contract access to perform future operations
     * 4. FHE.allowSender() grants the employee access to view their own data
     */
    function addEmployee(
        address employee,
        InEuint32 calldata salary,
        InEuint32 calldata bonus
    ) external onlyOwner {
        // Check that employee address is valid
        require(employee != address(0), "Invalid employee address");
        // Check that employee is not already added
        require(!employees[employee].isActive, "Employee already exists");

        // Convert InEuint32 payloads to euint32 encrypted values
        // InEuint32 is the encrypted input from frontend (using fhenix.js)
        // FHE.asEuint32() converts the payload to a usable euint32 for storage
        euint32 encryptedSalary = FHE.asEuint32(salary);
        euint32 encryptedBonus = FHE.asEuint32(bonus);

        // Store employee data
        employees[employee] = Employee({
            salary: encryptedSalary,
            bonus: encryptedBonus,
            isActive: true
        });

        // Initialize totalPaid with encrypted zero for this employee
        // We create a new zero value here since we can't do FHE operations in constructor
        euint32 zero = FHE.asEuint32(0);
        totalPaid[employee] = zero;
        FHE.allowThis(zero);

        // CRITICAL: Grant contract access to the stored encrypted values
        // FHE.allowThis() allows the contract to use these values in future operations
        // Without this, the contract would get "Access denied" when trying to read/modify
        FHE.allowThis(encryptedSalary);
        FHE.allowThis(encryptedBonus);
        FHE.allowThis(totalPaid[employee]);

        // CRITICAL: Grant employee access to their own encrypted data
        // FHE.allowSender() grants msg.sender (the caller) access to decrypt this value
        // In this case, the owner calls this function, but we want the EMPLOYEE to have access
        // So we use FHE.allow(value, address) instead
        FHE.allow(encryptedSalary, employee);
        FHE.allow(encryptedBonus, employee);
        FHE.allow(totalPaid[employee], employee);

        // Add employee to the list
        employeeList.push(employee);

        emit EmployeeAdded(employee);
    }

    /**
     * @notice Pay an employee an encrypted amount
     * @dev Only callable by owner
     * @param employee The wallet address of the employee to pay
     * @param amount Encrypted payment amount payload from frontend (InEuint32)
     *
     * FHE Pattern Explanation:
     * 1. Convert payment amount to euint32
     * 2. Use FHE.add() to add payment to totalPaid (homomorphic addition)
     * 3. Grant employee access to the updated totalPaid value
     *
     * IMPORTANT: FHE.add() can add two encrypted values without decrypting them first.
     * This is the core benefit of FHE - operations on encrypted data!
     */
    function payEmployee(
        address employee,
        InEuint32 calldata amount
    ) external onlyOwner {
        // Verify employee exists and is active
        require(employees[employee].isActive, "Employee not found or inactive");

        // Convert payment amount to encrypted euint32
        euint32 encryptedAmount = FHE.asEuint32(amount);

        // Get current total paid for this employee
        euint32 currentTotal = totalPaid[employee];

        // Add new payment to total using homomorphic addition
        // FHE.add() adds two encrypted values WITHOUT decrypting them first!
        // This preserves privacy - the contract never sees the actual amounts
        euint32 newTotal = FHE.add(currentTotal, encryptedAmount);

        // Update totalPaid in storage
        totalPaid[employee] = newTotal;

        // CRITICAL: Grant contract access to the new totalPaid value
        // FHE.allowThis() is needed because we updated the stored value
        FHE.allowThis(newTotal);

        // CRITICAL: Grant employee access to view their updated total
        // The employee needs to see how much they've been paid (encrypted)
        FHE.allow(newTotal, employee);

        emit EmployeePaid(employee, euint32.unwrap(encryptedAmount));
    }

    /**
     * @notice Remove an employee (set as inactive)
     * @dev Only callable by owner. Does not delete data, just marks as inactive.
     * @param employee The wallet address of the employee to remove
     *
     * NOTE: We're not revoking access here because:
     * 1. FHE access revocation is complex and not needed for MVP
     * 2. Employee can still view their historical salary data
     * 3. They just can't receive new payments
     */
    function removeEmployee(address employee) external onlyOwner {
        require(employees[employee].isActive, "Employee not active");

        // Set employee as inactive
        employees[employee].isActive = false;

        emit EmployeeRemoved(employee);
    }

    // ============================================================
    // VIEW FUNCTIONS (Read-Only)
    // ============================================================

    /**
     * @notice Get an employee's encrypted salary and bonus data
     * @dev This is a view function, so no access grant needed here.
     *      Access was already granted when employee was added.
     * @param employee The wallet address of the employee
     * @return salary Encrypted salary (euint32)
     * @return bonus Encrypted bonus (euint32)
     * @return isActive Employment status (bool)
     */
    function getEmployeeData(
        address employee
    ) external view returns (euint32 salary, euint32 bonus, bool isActive) {
        Employee memory emp = employees[employee];
        return (emp.salary, emp.bonus, emp.isActive);
    }

    /**
     * @notice Get the caller's total paid amount (encrypted)
     * @dev This is a view function. Caller must have been granted access
     *      when added as employee or when paid.
     * @return totalPaid Encrypted total amount paid to the caller
     */
    function getTotalPaid() external view returns (euint32) {
        return totalPaid[msg.sender];
    }

    /**
     * @notice Get the list of all employee addresses
     * @dev This does NOT return any encrypted data, just addresses
     * @return List of employee wallet addresses
     */
    function getEmployeeList() external view returns (address[] memory) {
        return employeeList;
    }

    /**
     * @notice Get the number of employees
     * @return count Number of active employees
     */
    function getEmployeeCount() external view returns (uint256) {
        return employeeList.length;
    }

    /**
     * @notice Check if an address is an active employee
     * @param employee The wallet address to check
     * @return isEmployee True if the address is an active employee
     */
    function isEmployee(address employee) external view returns (bool) {
        return employees[employee].isActive;
    }
}
