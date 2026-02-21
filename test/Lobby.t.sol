// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HivemindTestBase.t.sol";

contract LobbyTest is HivemindTestBase {
    function test_joinGame_singlePlayer() public {
        vm.prank(player1, player1);
        lobby.joinGame();
        assertEq(lobby.playerCount(1), 1);
        assertTrue(scoreKeeper.playerInActiveGame(player1));
    }

    function test_joinGame_multiplePlayers() public {
        _joinPlayers(3);
        assertEq(lobby.playerCount(1), 3);
        assertTrue(scoreKeeper.playerInActiveGame(player1));
        assertTrue(scoreKeeper.playerInActiveGame(player2));
        assertTrue(scoreKeeper.playerInActiveGame(player3));
    }

    function test_joinGame_alreadyInGame_reverts() public {
        vm.prank(player1, player1);
        lobby.joinGame();
        vm.prank(player1, player1);
        vm.expectRevert("player already in game");
        lobby.joinGame();
    }

    function test_canStart_afterTimeLimitWithTwoPlayers() public {
        _joinPlayers(2);
        assertFalse(lobby.canStart());
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        assertTrue(lobby.canStart());
    }

    function test_canStart_false_singlePlayer() public {
        vm.prank(player1, player1);
        lobby.joinGame();
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        assertFalse(lobby.canStart());
    }

    function test_startGame() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();
        assertFalse(lobby.canStart());
    }

    function test_startGame_reverts_tooEarly() public {
        _joinPlayers(2);
        vm.expectRevert("unable to start game");
        lobby.startGame();
    }

    function test_setTimeLimitToJoin() public {
        lobby.setTimeLimitToJoin(60);
        assertEq(lobby.timeLimitToJoin(), 60);
    }

    function test_setPlayerLimit() public {
        lobby.setPlayerLimit(5);
        assertEq(lobby.playerLimit(), 5);
    }

    function test_setEntryFee() public {
        lobby.setEntryFee(0.1 ether);
        assertEq(lobby.entryFee(), 0.1 ether);
    }

    function test_entryFee_enforced() public {
        lobby.setEntryFee(0.1 ether);
        vm.prank(player1, player1);
        vm.expectRevert("Minimum entry fee not sent");
        lobby.joinGame();
    }

    function test_entryFee_accepted() public {
        lobby.setEntryFee(0.1 ether);
        vm.prank(player1, player1);
        lobby.joinGame{value: 0.1 ether}();
        assertEq(lobby.playerCount(1), 1);
    }
}
