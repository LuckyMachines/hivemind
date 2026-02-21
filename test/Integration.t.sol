// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HivemindTestBase.t.sol";

contract IntegrationTest is HivemindTestBase {
    function test_fullGameFlow_twoPlayers() public {
        // 1. Players join lobby
        _joinPlayers(2);
        assertEq(lobby.playerCount(1), 2);
        assertEq(gameController.getPlayerCount(1), 2);

        // 2. Start game (time limit passes)
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();

        // 3. VRF fulfills for Round 1
        vrfCoordinator.fulfillRandomWords(1, address(round1));
        assertTrue(round1.questionSeed(1) != 0);

        // 4. Keeper starts Round 1
        round1.startNewRound(1);

        // 5. Get the question
        (string memory q, string[4] memory choices) = round1.getQuestion(1);
        assertTrue(bytes(q).length > 0);
        assertTrue(bytes(choices[0]).length > 0);

        // 6. Both players submit hashed answers
        string memory answer1 = choices[0]; // Both pick first choice
        string memory crowd1 = choices[0];
        bytes32 hashed1 = keccak256(abi.encode(answer1, crowd1, "secret1"));
        bytes32 hashed2 = keccak256(abi.encode(answer1, crowd1, "secret2"));

        vm.prank(player1, player1);
        round1.submitAnswers(hashed1, 1);
        vm.prank(player2, player2);
        round1.submitAnswers(hashed2, 1);

        // Phase should auto-transition to Reveal
        assertEq(uint256(round1.phase(1)), uint256(GameRound.GamePhase.Reveal));

        // 7. Both players reveal
        vm.prank(player1, player1);
        round1.revealAnswers(answer1, crowd1, "secret1", 1);
        vm.prank(player2, player2);
        round1.revealAnswers(answer1, crowd1, "secret2", 1);

        // Phase should auto-transition to Completed, players move to Round 2
        assertEq(uint256(round1.phase(1)), uint256(GameRound.GamePhase.Completed));

        // 8. Check scores — both should have submission + winning + reveal bonus points
        uint256 score1 = scoreKeeper.playerScore(1, player1);
        uint256 score2 = scoreKeeper.playerScore(1, player2);
        assertTrue(score1 > 0);
        assertTrue(score2 > 0);

        // Latest round should now be round2
        assertEq(scoreKeeper.latestRound(1), "hivemind.round2");
    }

    function test_gameController_queries() public {
        _joinPlayers(2);
        assertEq(gameController.getPlayerCount(1), 2);

        vm.prank(player1, player1);
        assertTrue(gameController.getIsInActiveGame());

        vm.prank(player1, player1);
        assertEq(gameController.getCurrentGame(), 1);
    }

    function test_abandonActiveGame() public {
        vm.prank(player1, player1);
        lobby.joinGame();

        vm.prank(player1, player1);
        gameController.abandonActiveGame();

        assertFalse(scoreKeeper.playerInActiveGame(player1));
    }
}
