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
    mapping(uint256 => bool) public gameHasWinnings; // true if game has available prize
    mapping(uint256 => uint256[]) public topScores;
    // mapping from game ID => player address
    mapping(uint256 => mapping(address => bool)) public playerPaid; // if player was paid for a given game
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
            gameHasWinnings[gameID] = true;
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

    function playerHasScore(
        uint256 score,
        uint256 gameID,
        address playerAddress
    ) internal view returns (bool hasScore) {
        address[] memory scoreAddresses = addressFromScore[gameID][score];
        hasScore = false;
        for (uint256 i = 0; i < scoreAddresses.length; i++) {
            if (playerAddress == scoreAddresses[i]) {
                hasScore = true;
                break;
            }
        }
    }

    // User should call "getFinalRank" before calling this.
    // This function will waste gas if not in top 4 rank.
    function claimWinnings(uint256 gameID, uint256 finalScore) public {
        uint256 prizePool = SCORE_KEEPER.prizePool(gameID);
        require(prizePool > 0, "No prize pool for this game");
        address payable claimant = payable(tx.origin);
        require(
            !playerPaid[gameID][claimant],
            "player already paid for this game"
        );
        require(
            playerHasScore(finalScore, gameID, claimant),
            "incorrect player score submitted"
        );

        uint256 totalPlayers = GAME_CONTROLLER.getPlayerCount(gameID);
        uint256[] memory scores;
        if (totalPlayers == 2) {
            scores = new uint256[](2);
        } else if (totalPlayers == 3) {
            scores = new uint256[](3);
        } else if (totalPlayers > 3) {
            scores = new uint256[](4);
        }

        // create array of top scores [500,400,300,200]
        for (uint256 i = 0; i < scores.length; i++) {
            scores[i] = topScores[gameID][topScores[gameID].length - 1 - i];
        }

        uint256[] memory payoutTiers = new uint256[](scores.length);

        uint256 tier1Payouts = 1;
        uint256 tier2Payouts = 0;
        uint256 tier3Payouts = 0;
        uint256 tier4Payouts = 0;

        payoutTiers[0] = 1;
        for (uint256 i = 1; i < scores.length; i++) {
            if (scores[i] == scores[i - 1]) {
                payoutTiers[i] = payoutTiers[i - 1];
                if (payoutTiers[i] == 1) {
                    tier1Payouts++;
                } else if (payoutTiers[i] == 2) {
                    tier2Payouts++;
                } else if (payoutTiers[i] == 3) {
                    tier3Payouts++;
                }
            } else {
                payoutTiers[i] = payoutTiers[i - 1] + 1;
                if (payoutTiers[i] == 2) {
                    tier2Payouts++;
                } else if (payoutTiers[i] == 3) {
                    tier3Payouts++;
                } else if (payoutTiers[i] == 4) {
                    tier4Payouts++;
                }
            }
        }

        uint256[4] memory payoutAmounts;
        // Assuming 4 payouts...
        if (totalPlayers > 3) {
            if (tier1Payouts == 4) {
                // 1, 1, 1, 1
                payoutAmounts[0] = prizePool / 4;
                payoutAmounts[1] = prizePool / 4;
                payoutAmounts[2] = prizePool / 4;
                // payoutAmounts[3] = 25; // % (convert to actual numbers?)
            } else if (tier1Payouts == 3) {
                // 1, 1, 1, 2
                // 95% 1s, 5% 2
                payoutAmounts[0] = (prizePool * 10) / 32; //~31%
                payoutAmounts[1] = (prizePool * 10) / 32;
                payoutAmounts[2] = (prizePool * 10) / 32;
                // payoutAmounts[3] = 7;
            } else if (tier1Payouts == 2 && tier2Payouts == 2) {
                // 1, 1, 2, 2
                // 85% 1s, 15% 2s
                payoutAmounts[0] = (prizePool * 10) / 24;
                payoutAmounts[1] = (prizePool * 10) / 24;
                payoutAmounts[2] = prizePool / 12; // ~8%
                // payoutAmounts[3] = 8;
            } else if (tier1Payouts == 1 && tier2Payouts == 3) {
                // 1, 2, 2, 2
                // 70% 1s, 15% 2s
                payoutAmounts[0] = (prizePool * 10) / 14; //~70%
                payoutAmounts[1] = prizePool / 10;
                payoutAmounts[2] = prizePool / 10;
                // payoutAmounts[3] = 10;
            } else if (tier2Payouts == 2 && tier3Payouts == 1) {
                // 1, 2, 2, 3
                // 70% 1s, 25% 2s, 5% 3s
                payoutAmounts[0] = (prizePool * 10) / 14; //~70%
                payoutAmounts[1] = prizePool / 8;
                payoutAmounts[2] = prizePool / 8; // ~13%
                // payoutAmounts[3] = 4;
            } else if (tier2Payouts == 1 && tier3Payouts == 2) {
                // 1, 2, 3, 3
                // 70% 1s, 15% 2s, 15% 3s
                payoutAmounts[0] = (prizePool * 10) / 14; //~70%
                payoutAmounts[1] = prizePool / 6; // ~16%
                payoutAmounts[2] = prizePool / 14; // 7%
                // payoutAmounts[3] = 7;
            } else {
                // 1, 2, 3, 4
                // 70% 1s, 15% 2s, 10% 3s, 5% 4s
                payoutAmounts[0] = (prizePool * 10) / 14;
                payoutAmounts[1] = prizePool / 7; // ~14%
                payoutAmounts[2] = prizePool / 10;
                // payoutAmounts[3] = 5;
            }
            payoutAmounts[3] =
                prizePool -
                (payoutAmounts[0] + payoutAmounts[1] + payoutAmounts[2]);
        } else if (totalPlayers == 3) {
            if (tier1Payouts == 3) {
                //111
                payoutAmounts[0] = prizePool / 3;
                payoutAmounts[1] = prizePool / 3;
                // payoutAmounts[2] = 33;
            } else if (tier1Payouts == 2) {
                //112
                payoutAmounts[0] = (prizePool * 10) / 24; //~42%
                payoutAmounts[1] = (prizePool * 10) / 24; //~42%
                // payoutAmounts[2] = 16;
            } else if (tier2Payouts == 2) {
                //122
                payoutAmounts[0] = (prizePool * 10) / 14;
                payoutAmounts[1] = (prizePool * 10) / 67; //~15%
                // payoutAmounts[2] = 15;
            } else {
                //123
                payoutAmounts[0] = (prizePool * 10) / 14;
                payoutAmounts[1] = prizePool / 5;
                // payoutAmounts[2] = 10;
            }
            payoutAmounts[2] =
                prizePool -
                (payoutAmounts[0] + payoutAmounts[1]);
        } else if (totalPlayers == 2) {
            if (tier1Payouts == 2) {
                //1, 1
                payoutAmounts[0] = prizePool / 2;
                // payoutAmounts[1] = 50;
            } else {
                //1, 2
                payoutAmounts[0] = (prizePool * 10) / 14;
                // payoutAmounts[1] = 30;
            }
            payoutAmounts[1] = prizePool - payoutAmounts[0];
        }

        uint256 payoutAmount;
        for (uint256 i = 0; i < scores.length; i++) {
            if (finalScore == scores[i]) {
                payoutAmount = payoutAmounts[i];
                break;
            }
        }

        claimant.transfer(payoutAmount);
        playerPaid[gameID][claimant] = true;

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
