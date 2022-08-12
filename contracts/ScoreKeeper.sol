// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

// Stores scores and game state for each player
// Only authorized game round contracts can update state

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "hardhat/console.sol";

contract ScoreKeeper is AccessControlEnumerable {
    bytes32 public SCORE_SETTER_ROLE = keccak256("SCORE_SETTER_ROLE");

    // Mapping from game ID
    mapping(uint256 => string) public latestRound;
    mapping(uint256 => uint256) public prizePool;
    // Mapping from game ID => player address
    mapping(uint256 => mapping(address => uint256)) public playerScore;
    // Mapping from player address
    mapping(address => uint256) public currentGameID;
    mapping(address => bool) public playerInActiveGame;
    // Mapping from railcar ID
    mapping(uint256 => uint256) public gameIDFromRailcar;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function grantScoreSetterRole(address scoreSetterAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(SCORE_SETTER_ROLE, scoreSetterAddress);
    }

    function increaseScore(
        uint256 points,
        uint256 gameID,
        address playerAddress
    ) external onlyRole(SCORE_SETTER_ROLE) {
        playerScore[gameID][playerAddress] += points;
    }

    function increasePrizePool(uint256 valueIncrease, uint256 gameID)
        external
        onlyRole(SCORE_SETTER_ROLE)
    {
        prizePool[gameID] += valueIncrease;
    }

    function setLatestRound(string memory hubName, uint256 gameID)
        external
        onlyRole(SCORE_SETTER_ROLE)
    {
        latestRound[gameID] = hubName;
    }

    function setGameID(uint256 gameID, address playerAddress)
        external
        onlyRole(SCORE_SETTER_ROLE)
    {
        currentGameID[playerAddress] = gameID;
        playerInActiveGame[playerAddress] = true;
    }

    function setGameID(
        uint256 gameID,
        address playerAddress,
        uint256 railcarID
    ) external onlyRole(SCORE_SETTER_ROLE) {
        currentGameID[playerAddress] = gameID;
        playerInActiveGame[playerAddress] = true;
        gameIDFromRailcar[railcarID] = gameID;
    }

    function removePlayerFromActiveGame(address playerAddress)
        external
        onlyRole(SCORE_SETTER_ROLE)
    {
        currentGameID[playerAddress] = 0;
        playerInActiveGame[playerAddress] = false;
    }
}
