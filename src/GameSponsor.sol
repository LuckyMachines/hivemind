// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

interface ILobby {
    function joinGame() external payable;
    function entryFee() external view returns (uint256);
}

/**
 * @title GameSponsor
 * @notice Testnet sponsorship contract for Hjivemind and general game testing.
 *         Holds a pool of ETH and lets players join Hjivemind for free (sponsor pays entry fee)
 *         or claim small drips to play Plundrix STAKES games.
 *
 *         The deployed Hjivemind Lobby uses tx.origin for player identity, so when a player
 *         calls sponsoredJoinHjivemind(), this contract forwards the call to lobby.joinGame()
 *         and the player is correctly identified by tx.origin.
 *
 *         Deploy once, fund with testnet ETH.
 */
contract GameSponsor is AccessControlEnumerable {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    ILobby public lobby;

    uint256 public dripAmount = 0.005 ether;  // enough for ~5 Plundrix STAKES games at 0.001 ETH
    uint256 public maxSponsoredEntries = 5;    // max free Hjivemind entries per address

    mapping(address => bool) public hasClaimed;          // faucet: one claim per address
    mapping(address => uint256) public sponsoredEntries;  // hjivemind: entries used

    uint256 public totalSponsored;     // total ETH spent on Hjivemind entries
    uint256 public totalDripped;       // total ETH dripped for Plundrix
    uint256 public totalEntriesSponsored;

    event HjivemindSponsored(address indexed player, uint256 entryFee, uint256 gameNumber);
    event FaucetClaimed(address indexed player, uint256 amount);
    event LobbyUpdated(address indexed newLobby);
    event DripAmountUpdated(uint256 newAmount);
    event MaxEntriesUpdated(uint256 newMax);
    event FundsDeposited(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(address lobbyAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        lobby = ILobby(lobbyAddress);
    }

    // --- Hjivemind Sponsorship ---

    /**
     * @notice Join the current Hjivemind game for free. Sponsor pays your entry fee.
     * @dev The deployed Lobby uses tx.origin for player identity, so calling this
     *      from an EOA correctly registers the caller as the player.
     */
    function sponsoredJoinHjivemind() external {
        require(sponsoredEntries[msg.sender] < maxSponsoredEntries, "Max sponsored entries reached");

        uint256 fee = lobby.entryFee();
        require(address(this).balance >= fee, "Sponsor pool empty");

        sponsoredEntries[msg.sender]++;
        totalSponsored += fee;
        totalEntriesSponsored++;

        // tx.origin = the player's EOA, which is what the Lobby uses for identity
        lobby.joinGame{value: fee}();

        emit HjivemindSponsored(msg.sender, fee, totalEntriesSponsored);
    }

    // --- Plundrix Faucet ---

    /**
     * @notice Claim a small amount of testnet ETH to play Plundrix STAKES games.
     *         One claim per address.
     */
    function claimTestFunds() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(address(this).balance >= dripAmount, "Sponsor pool empty");

        hasClaimed[msg.sender] = true;
        totalDripped += dripAmount;

        (bool success, ) = msg.sender.call{value: dripAmount}("");
        require(success, "Transfer failed");

        emit FaucetClaimed(msg.sender, dripAmount);
    }

    // --- Views ---

    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function remainingEntries(address player) external view returns (uint256) {
        return maxSponsoredEntries - sponsoredEntries[player];
    }

    function canSponsor() external view returns (bool) {
        uint256 fee = lobby.entryFee();
        return address(this).balance >= fee;
    }

    function stats() external view returns (
        uint256 balance,
        uint256 sponsored,
        uint256 dripped,
        uint256 entries,
        uint256 hjivemindEntryFee
    ) {
        return (
            address(this).balance,
            totalSponsored,
            totalDripped,
            totalEntriesSponsored,
            lobby.entryFee()
        );
    }

    // --- Admin ---

    function setLobby(address lobbyAddress) external onlyRole(MANAGER_ROLE) {
        lobby = ILobby(lobbyAddress);
        emit LobbyUpdated(lobbyAddress);
    }

    function setDripAmount(uint256 amount) external onlyRole(MANAGER_ROLE) {
        dripAmount = amount;
        emit DripAmountUpdated(amount);
    }

    function setMaxSponsoredEntries(uint256 max) external onlyRole(MANAGER_ROLE) {
        maxSponsoredEntries = max;
        emit MaxEntriesUpdated(max);
    }

    function resetPlayer(address player) external onlyRole(MANAGER_ROLE) {
        hasClaimed[player] = false;
        sponsoredEntries[player] = 0;
    }

    function withdrawExcess(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit FundsWithdrawn(to, amount);
    }

    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}
