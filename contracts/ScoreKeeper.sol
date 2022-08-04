// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

// Maintains scores for each player
// players with highest scores get biggest payouts in final round

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "hardhat/console.sol";

contract ScoreKeeper is AccessControlEnumerable {
    bytes32 public SCORE_SETTER_ROLE = keccak256("SCORE_SETTER_ROLE");

    // Mapping from game ID => player address
    mapping(uint256 => mapping(address => uint256)) public playerScore;
    mapping(uint256 => mapping(address => string)) public latestRound; // the last hub the player is known to be in

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

    function setLatestRound(
        string memory hubName,
        uint256 gameID,
        address playerAddress
    ) external onlyRole(SCORE_SETTER_ROLE) {
        latestRound[gameID][playerAddress] = hubName;
    }
}
