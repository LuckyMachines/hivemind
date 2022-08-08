// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@luckymachines/railway/contracts/RailYard.sol";
import "hardhat/console.sol";
import "./ScoreKeeper.sol";

contract Lobby is AccessControlEnumerable {
    ScoreKeeper private SCORE_KEEPER;
    RailYard private RAIL_YARD;
    uint256 private _currentGameID;
    bool private _needsNewGameID; // set to true when game has started

    uint256 public timeLimitToJoin = 300; // Countdown starts after 2nd player joins
    uint256 public playerLimit = 10; // game automatically starts if player limit reached
    uint256 public joinCountdownStartTime;

    // Mapping from game id
    mapping(uint256 => uint256) public playerCount;

    constructor(address scoreKeeperAddress, address railYardAddress) {
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
        RAIL_YARD = RailYard(railYardAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _needsNewGameID = true;
    }

    function joinGame() public {
        address player = tx.origin;
        require(
            !SCORE_KEEPER.playerInActiveGame(player),
            "player already in game"
        );
        if (_needsNewGameID) {
            _currentGameID++;
            _needsNewGameID = false;
        }
        SCORE_KEEPER.setGameID(_currentGameID, player);
        playerCount[_currentGameID]++;

        if (playerCount[_currentGameID] == 2) {
            joinCountdownStartTime = block.timestamp;
        }

        // TODO: join group railcar

        // auto-start game if at limit
        if (playerCount[_currentGameID] == playerLimit) {
            startGame();
        }
    }

    function startGame() public {
        if (_canStartGame()) {
            // start game...
            // reset needsnewgameid
            // reset joinCountdownStartTime
        }
        // can only call if game is ready to start
        // anyone can call this
    }

    // Admin functions
    function setTimeLimitToJoin(uint256 timeInSeconds)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        timeLimitToJoin = timeInSeconds;
    }

    function setPlayerLimit(uint256 limit) public onlyRole(DEFAULT_ADMIN_ROLE) {
        playerLimit = limit;
    }

    // Internal functions
    function _canStartGame() internal view returns (bool canStart) {
        if (
            block.timestamp >= (joinCountdownStartTime + timeLimitToJoin) ||
            playerCount[_currentGameID] >= playerLimit
        ) {
            canStart = true;
        } else {
            canStart = false;
        }
    }
}

// join game
// move with group into round 1 when game is ready
// Max limit 1000
