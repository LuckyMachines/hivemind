// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "hardhat/console.sol";
import "./ScoreKeeper.sol";

contract Lobby is AccessControlEnumerable {
    ScoreKeeper private SCORE_KEEPER;
    uint256 private _currentGameID;
    bool private _needsNewGameID; // set to true when game has started
    // Mapping from game id
    mapping(uint256 => uint256) public playerCount;

    constructor(address scoreKeeperAddress) {
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _needsNewGameID = true;
    }

    // TODO: join via game controller
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
    }
}

// join game
// move with group into round 1 when game is ready
// Max limit 1000
