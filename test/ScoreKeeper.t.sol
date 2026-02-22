// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {ScoreKeeper} from "../src/ScoreKeeper.sol";

contract ScoreKeeperTest is Test {
    ScoreKeeper scoreKeeper;
    address admin;
    address scoreSetter;
    address player;

    function setUp() public {
        admin = address(this);
        scoreSetter = makeAddr("scoreSetter");
        player = makeAddr("player");

        scoreKeeper = new ScoreKeeper();
        scoreKeeper.grantScoreSetterRole(scoreSetter);
    }

    function test_increaseScore() public {
        vm.prank(scoreSetter);
        scoreKeeper.increaseScore(100, 1, player);
        assertEq(scoreKeeper.playerScore(1, player), 100);
    }

    function test_increaseScore_accumulates() public {
        vm.startPrank(scoreSetter);
        scoreKeeper.increaseScore(100, 1, player);
        scoreKeeper.increaseScore(200, 1, player);
        vm.stopPrank();
        assertEq(scoreKeeper.playerScore(1, player), 300);
    }

    function test_increaseScore_requiresRole() public {
        vm.prank(makeAddr("unauthorized"));
        vm.expectRevert();
        scoreKeeper.increaseScore(100, 1, player);
    }

    function test_setGameID() public {
        vm.prank(scoreSetter);
        scoreKeeper.setGameID(1, player, 42);
        assertEq(scoreKeeper.currentGameID(player), 1);
        assertTrue(scoreKeeper.playerInActiveGame(player));
        assertEq(scoreKeeper.gameIDFromRailcar(42), 1);
    }

    function test_removePlayerFromActiveGame() public {
        vm.startPrank(scoreSetter);
        scoreKeeper.setGameID(1, player, 42);
        scoreKeeper.removePlayerFromActiveGame(player);
        vm.stopPrank();
        assertEq(scoreKeeper.currentGameID(player), 0);
        assertFalse(scoreKeeper.playerInActiveGame(player));
    }

    function test_increasePrizePool() public {
        vm.prank(scoreSetter);
        scoreKeeper.increasePrizePool(1 ether, 1);
        assertEq(scoreKeeper.prizePool(1), 1 ether);
    }

    function test_setLatestRound() public {
        vm.prank(scoreSetter);
        scoreKeeper.setLatestRound("hjivemind.round2", 1);
        assertEq(scoreKeeper.latestRound(1), "hjivemind.round2");
    }
}
