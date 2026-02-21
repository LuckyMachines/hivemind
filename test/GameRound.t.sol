// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HivemindTestBase.t.sol";

contract GameRoundTest is HivemindTestBase {
    function test_railcarEntersRound1_afterGameStart() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();

        // Round1 should have the game in Question phase after VRF
        uint256 gameID = 1;
        // Phase is Question (1) before VRF fulfills, but questionSeed is 0
        assertEq(uint256(round1.phase(gameID)), uint256(GameRound.GamePhase.Question));
    }

    function test_vrfFulfillment_setsQuestionSeed() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();

        // Fulfill VRF
        vrfCoordinator.fulfillRandomWords(1, address(round1));
        assertTrue(round1.questionSeed(1) != 0);
    }

    function test_startNewRound_afterVRF() public {
        _joinPlayers(2);
        _startGameAndFulfillVRF();

        // Keeper starts the round
        round1.startNewRound(1);
    }

    function test_submitAnswers() public {
        _joinPlayers(2);
        _startGameAndFulfillVRF();
        round1.startNewRound(1);

        // Player submits a hashed answer
        bytes32 hashed = keccak256(abi.encode("North", "South", "secret123"));
        vm.prank(player1, player1);
        round1.submitAnswers(hashed, 1);

        assertEq(round1.totalResponses(1), 1);
        // Player should get submission points
        assertEq(scoreKeeper.playerScore(1, player1), 100);
    }

    function test_submitAnswers_outsideQuestionPhase_reverts() public {
        _joinPlayers(2);
        _startGameAndFulfillVRF();
        // Don't start the round — still in pregame with no question
        // Actually after _startGameAndFulfillVRF the phase is Question
        // Let's manually push past round time limit to reach Reveal
        round1.startNewRound(1);

        bytes32 hashed1 = keccak256(abi.encode("North", "South", "s1"));
        bytes32 hashed2 = keccak256(abi.encode("North", "South", "s2"));
        vm.prank(player1, player1);
        round1.submitAnswers(hashed1, 1);
        vm.prank(player2, player2);
        round1.submitAnswers(hashed2, 1);
        // Both submitted — phase auto-transitions to Reveal

        // Now try to submit — should fail
        vm.prank(player1, player1);
        vm.expectRevert("Game not in question phase");
        round1.submitAnswers(hashed1, 1);
    }

    function test_revealAnswers() public {
        _joinPlayers(2);
        _startGameAndFulfillVRF();
        round1.startNewRound(1);

        // Get the actual question responses
        (, string[4] memory choices) = round1.getQuestion(1);
        string memory answer = choices[0]; // Use actual first choice
        string memory crowd = choices[1];  // Use actual second choice

        // Both players submit using actual choices
        bytes32 hashed1 = keccak256(abi.encode(answer, crowd, "secret1"));
        bytes32 hashed2 = keccak256(abi.encode(answer, crowd, "secret2"));
        vm.prank(player1, player1);
        round1.submitAnswers(hashed1, 1);
        vm.prank(player2, player2);
        round1.submitAnswers(hashed2, 1);

        // Phase should be Reveal now
        assertEq(uint256(round1.phase(1)), uint256(GameRound.GamePhase.Reveal));

        // Player1 reveals
        vm.prank(player1, player1);
        round1.revealAnswers(answer, crowd, "secret1", 1);
        assertEq(round1.totalReveals(1), 1);
        assertTrue(round1.answersRevealed(1, player1));
    }

    function test_revealAnswers_mismatch_reverts() public {
        _joinPlayers(2);
        _startGameAndFulfillVRF();
        round1.startNewRound(1);

        bytes32 hashed1 = keccak256(abi.encode("North", "South", "secret1"));
        bytes32 hashed2 = keccak256(abi.encode("South", "South", "secret2"));
        vm.prank(player1, player1);
        round1.submitAnswers(hashed1, 1);
        vm.prank(player2, player2);
        round1.submitAnswers(hashed2, 1);

        // Try to reveal with wrong secret
        vm.prank(player1, player1);
        vm.expectRevert("revealed answers don't match original answers");
        round1.revealAnswers("North", "South", "wrong_secret", 1);
    }

    function test_needsUpdate_afterTimeLimit() public {
        _joinPlayers(2);
        _startGameAndFulfillVRF();
        round1.startNewRound(1);

        assertFalse(round1.needsUpdate(1));
        vm.warp(block.timestamp + round1.roundTimeLimit() + 1);
        assertTrue(round1.needsUpdate(1));
    }

    function test_updatePhase_questionToReveal() public {
        _joinPlayers(2);
        _startGameAndFulfillVRF();
        round1.startNewRound(1);

        vm.warp(block.timestamp + round1.roundTimeLimit() + 1);
        round1.updatePhase(1);
        assertEq(uint256(round1.phase(1)), uint256(GameRound.GamePhase.Reveal));
    }
}
