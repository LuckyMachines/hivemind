// Any group of players who enter this hub split the prize pool. If nobody wins, pool carries over to next game.
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@luckymachines/railway/contracts/Hub.sol";
import "./ScoreKeeper.sol";
import "hardhat/console.sol";

contract Winners is Hub {
    bytes32 public GAME_ROUND_ROLE = keccak256("GAME_ROUND_ROLE");

    ScoreKeeper internal SCORE_KEEPER;
    // mapping from game ID
    mapping(uint256 => uint256) public prizePool; // Matic (gwei)
    mapping(uint256 => bool) gameHasUnpaidWinnings; // true if any payments exist on this game
    mapping(uint256 => bool) gamePaid; // if all winnings from game have been paid out
    // game id => player address
    mapping(uint256 => mapping(address => bool)) playerPaid; // if player was paid for a given game

    uint256 rolloverPool; // winnings not allocated to any parties

    constructor(
        string memory thisHub,
        address scoreKeeperAddress,
        address hubRegistryAddress,
        address hubAdmin
    ) Hub(hubRegistryAddress, hubAdmin) {
        uint256 hubID = REGISTRY.idFromAddress(address(this));
        REGISTRY.setName(thisHub, hubID);
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
    }

    function _groupDidEnter(uint256 railcarID) internal override {
        super._groupDidEnter(railcarID);

        // TODO: get game ID from railcarID
        // set group needs payout
        // gameHasUnpaidWinnings[railcarID] = true;

        // payout winnings based on player points
        // players can claim winnings once they are recorded here
    }

    function claimWinnings(uint256 gameID) public {
        address payable claimant = payable(_msgSender());
        // payout winning based on player points
        // 10000
        // check if any winnings available
        // send winnings
        // mark player / game as having claimed winnings
    }
}
