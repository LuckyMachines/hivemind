// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HjivemindTestBase.t.sol";

contract LobbyTest is HjivemindTestBase {
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

    // Protocol fee tests
    function test_protocolFee_default2Percent() public {
        assertEq(lobby.protocolFeeBps(), 200);
    }

    function test_protocolFee_deducted() public {
        lobby.setEntryFee(1 ether);
        address winnersAddr = address(winners);
        uint256 winnersBefore = winnersAddr.balance;

        vm.prank(player1, player1);
        lobby.joinGame{value: 1 ether}();

        // 2% fee = 0.02 ether stays in lobby, 0.98 ether goes to winners
        assertEq(lobby.totalProtocolFees(), 0.02 ether);
        assertEq(winnersAddr.balance - winnersBefore, 0.98 ether);
    }

    function test_protocolFee_accumulates() public {
        lobby.setEntryFee(1 ether);

        vm.prank(player1, player1);
        lobby.joinGame{value: 1 ether}();
        vm.prank(player2, player2);
        lobby.joinGame{value: 1 ether}();

        // 2 players * 0.02 ether = 0.04 ether total fees
        assertEq(lobby.totalProtocolFees(), 0.04 ether);
    }

    function test_protocolFee_withdraw() public {
        lobby.setEntryFee(1 ether);

        vm.prank(player1, player1);
        lobby.joinGame{value: 1 ether}();
        vm.prank(player2, player2);
        lobby.joinGame{value: 1 ether}();

        address treasury = makeAddr("treasury");
        uint256 expectedFees = 0.04 ether;
        assertEq(lobby.totalProtocolFees(), expectedFees);

        lobby.withdraw(treasury);

        assertEq(treasury.balance, expectedFees);
        assertEq(lobby.totalProtocolFees(), 0);
    }

    function test_protocolFee_withdrawEmpty_reverts() public {
        address treasury = makeAddr("treasury");
        vm.expectRevert("No fees to withdraw");
        lobby.withdraw(treasury);
    }

    function test_setProtocolFeeBps() public {
        lobby.setProtocolFeeBps(500); // 5%
        assertEq(lobby.protocolFeeBps(), 500);
    }

    function test_setProtocolFeeBps_cap() public {
        vm.expectRevert("Fee exceeds 10% cap");
        lobby.setProtocolFeeBps(1001); // > 10%
    }

    function test_setProtocolFeeBps_zero() public {
        lobby.setProtocolFeeBps(0); // No fee
        lobby.setEntryFee(1 ether);

        vm.prank(player1, player1);
        lobby.joinGame{value: 1 ether}();

        assertEq(lobby.totalProtocolFees(), 0);
        // Full amount goes to prize pool
        assertEq(scoreKeeper.prizePool(1), 1 ether);
    }

    function test_protocolFee_noFeeWhenNoEntryFee() public {
        // entryFee = 0, so msg.value = 0, fee = 0
        vm.prank(player1, player1);
        lobby.joinGame();
        assertEq(lobby.totalProtocolFees(), 0);
    }
}
