// Any group of players who enter this hub split the prize pool. If nobody wins, pool carries over to next game.
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@luckymachines/railway/contracts/Hub.sol";
import "./ScoreKeeper.sol";
import "./GameController.sol";
import "hardhat/console.sol";

contract Winners is Hub {
    bytes32 public GAME_ROUND_ROLE = keccak256("GAME_ROUND_ROLE");

    ScoreKeeper internal SCORE_KEEPER;
    GameController internal GAME_CONTROLLER;
    // mapping from game ID
    mapping(uint256 => uint256) public prizePoolPaidAmount;
    mapping(uint256 => bool) public gameHasUnpaidWinnings; // true if game has available prize
    mapping(uint256 => uint256[]) public topScores;
    // mapping from game ID => player address
    mapping(uint256 => mapping(address => uint256)) public playerPaidAmount; // how much player was paid for a given game
    // mapping from game ID => game score
    mapping(uint256 => mapping(uint256 => address[])) addressFromScore; // all addresses with given score

    constructor(
        string memory thisHub,
        address scoreKeeperAddress,
        address gameControllerAddress,
        address hubRegistryAddress,
        address hubAdmin
    ) Hub(hubRegistryAddress, hubAdmin) {
        uint256 hubID = REGISTRY.idFromAddress(address(this));
        REGISTRY.setName(thisHub, hubID);
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
        GAME_CONTROLLER = GameController(gameControllerAddress);
    }

    function _groupDidEnter(uint256 railcarID) internal override {
        super._groupDidEnter(railcarID);
        uint256 gameID = SCORE_KEEPER.gameIDFromRailcar(railcarID);
        if (SCORE_KEEPER.prizePool(gameID) > 0) {
            gameHasUnpaidWinnings[gameID] = true;
        }
        // Saves top scores + removes players from game
        saveTopScores(railcarID, gameID);
        GAME_CONTROLLER.enterWinners(block.timestamp, gameID, railcarID);
    }

    function getFinalRank(uint256 gameID, address playerAddress)
        public
        view
        returns (uint256 rank)
    {
        rank = 1;
        uint256 prevScore = 0;
        bool addressIsMatch = false;
        for (uint256 i = topScores[gameID].length - 1; i >= 0; i--) {
            uint256 score = topScores[gameID][i];
            if (score != prevScore) {
                for (
                    uint256 j = 0;
                    j < addressFromScore[gameID][score].length;
                    j++
                ) {
                    if (playerAddress == addressFromScore[gameID][score][j]) {
                        addressIsMatch = true;
                        break;
                    }
                }
                if (addressIsMatch) {
                    break;
                }
                rank++;
                prevScore = score;
            }
            if (i == 0) {
                break;
            }
        }
    }

    // User should call "getFinalRank" before calling this. Without proper rank function will fail
    function claimWinnings(uint256 gameID, uint256 finalRank) public {
        require(
            SCORE_KEEPER.prizePool(gameID) > 0,
            "No prize pool for this game"
        );
        address payable claimant = payable(tx.origin);

        uint256 totalPlayers = GAME_CONTROLLER.getPlayerCount(gameID);
        if (totalPlayers == 2) {
            // player is either 1 or 2
        } else if (totalPlayers == 3) {
            // player is either 1, 2, or 3
        } else if (totalPlayers > 3) {
            // player may be 1,2,3,4 or much higher
        }

        // payout winning based on player ranking
        // check if any winnings available
        // send winnings up to what player is owed - playerPaidAmount[gameID]
        // mark player / game as having claimed winnings
        // Top 4 players get paid out
        // If total players == 2, top 2
        // If total player == 3, top 3
        // if total players == 4, top 4

        // if all prize money claimed, set hasUnpaidWinnings[gameID] = false;
    }

    function saveTopScores(uint256 railcarID, uint256 gameID) public {
        // for each player, save mapping of score to their address
        address[] memory players = GAME_CONTROLLER.getRailcarMembers(railcarID);
        uint256[] memory allScores = new uint256[](players.length);
        for (uint256 i = 0; i < players.length; i++) {
            uint256 score = SCORE_KEEPER.playerScore(gameID, players[i]);
            allScores[i] = score;
            addressFromScore[gameID][score].push(players[i]);
            SCORE_KEEPER.removePlayerFromActiveGame(players[i]);
        }
        // sort scores
        quickSort(allScores, int256(0), int256(allScores.length - 1));
        topScores[gameID] = allScores;
    }

    function quickSort(
        uint256[] memory arr,
        int256 left,
        int256 right
    ) internal {
        int256 i = left;
        int256 j = right;
        if (i == j) return;
        uint256 pivot = arr[uint256(left + (right - left) / 2)];
        while (i <= j) {
            while (arr[uint256(i)] < pivot) i++;
            while (pivot < arr[uint256(j)]) j--;
            if (i <= j) {
                (arr[uint256(i)], arr[uint256(j)]) = (
                    arr[uint256(j)],
                    arr[uint256(i)]
                );
                i++;
                j--;
            }
        }
        if (left < j) quickSort(arr, left, j);
        if (i < right) quickSort(arr, i, right);
    }
}
