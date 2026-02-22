// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HjivemindTestBase.t.sol";

contract GameRoundTest is HjivemindTestBase {
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

    function test_isMinorityRound_setByVRF() public {
        // Even seed → minority round
        _joinPlayers(2);
        _startGameAndFulfillVRFWithSeed(42); // even
        round1.startNewRound(1);
        assertTrue(round1.isMinorityRound(1));
        assertTrue(round1.getIsMinorityRound(1));
    }

    function test_isMinorityRound_oddSeedIsMajority() public {
        _joinPlayers(2);
        _startGameAndFulfillVRFWithSeed(77); // odd
        round1.startNewRound(1);
        assertFalse(round1.isMinorityRound(1));
    }

    function test_findMinorityWinners_leastPopularWins() public {
        // 4 players: 3 pick choice 0, 1 picks choice 1
        // In minority mode, choice 1 (least popular) wins
        _joinPlayers(4);
        _startGameAndFulfillVRFWithSeed(42); // even → minority
        round1.startNewRound(1);
        assertTrue(round1.isMinorityRound(1));

        (, string[4] memory choices) = round1.getQuestion(1);

        // Players 1-3 answer choice[0], crowd guess choice[0]
        // Player 4 answers choice[1], crowd guess choice[1]
        bytes32 h1 = keccak256(abi.encode(choices[0], choices[0], "s1"));
        bytes32 h2 = keccak256(abi.encode(choices[0], choices[0], "s2"));
        bytes32 h3 = keccak256(abi.encode(choices[0], choices[0], "s3"));
        bytes32 h4 = keccak256(abi.encode(choices[1], choices[1], "s4"));

        vm.prank(player1, player1);
        round1.submitAnswers(h1, 1);
        vm.prank(player2, player2);
        round1.submitAnswers(h2, 1);
        vm.prank(player3, player3);
        round1.submitAnswers(h3, 1);
        vm.prank(player4, player4);
        round1.submitAnswers(h4, 1);

        // Reveal
        vm.prank(player1, player1);
        round1.revealAnswers(choices[0], choices[0], "s1", 1);
        vm.prank(player2, player2);
        round1.revealAnswers(choices[0], choices[0], "s2", 1);
        vm.prank(player3, player3);
        round1.revealAnswers(choices[0], choices[0], "s3", 1);
        vm.prank(player4, player4);
        round1.revealAnswers(choices[1], choices[1], "s4", 1);

        // Game completed — check winners
        assertEq(uint256(round1.phase(1)), uint256(GameRound.GamePhase.Completed));

        // Player 4 chose the minority (choice 1, score=1) — should win
        assertTrue(round1.roundWinner(1, player4));
        // Players 1-3 chose majority (choice 0, score=3) — should lose
        assertFalse(round1.roundWinner(1, player1));
        assertFalse(round1.roundWinner(1, player2));
        assertFalse(round1.roundWinner(1, player3));

        // Winning choice index should be [1]
        uint256[] memory winIdx = round1.getWinningChoiceIndex(1);
        assertEq(winIdx.length, 1);
        assertEq(winIdx[0], 1);
    }

    function test_findMinorityWinners_tieAtMinimum() public {
        // 4 players: 2 pick choice 0, 1 picks choice 1, 1 picks choice 2
        // Choices 1 and 2 tie at minimum (score=1 each), both win
        _joinPlayers(4);
        _startGameAndFulfillVRFWithSeed(42); // even → minority
        round1.startNewRound(1);

        (, string[4] memory choices) = round1.getQuestion(1);

        bytes32 h1 = keccak256(abi.encode(choices[0], choices[0], "s1"));
        bytes32 h2 = keccak256(abi.encode(choices[0], choices[0], "s2"));
        bytes32 h3 = keccak256(abi.encode(choices[1], choices[1], "s3"));
        bytes32 h4 = keccak256(abi.encode(choices[2], choices[2], "s4"));

        vm.prank(player1, player1);
        round1.submitAnswers(h1, 1);
        vm.prank(player2, player2);
        round1.submitAnswers(h2, 1);
        vm.prank(player3, player3);
        round1.submitAnswers(h3, 1);
        vm.prank(player4, player4);
        round1.submitAnswers(h4, 1);

        vm.prank(player1, player1);
        round1.revealAnswers(choices[0], choices[0], "s1", 1);
        vm.prank(player2, player2);
        round1.revealAnswers(choices[0], choices[0], "s2", 1);
        vm.prank(player3, player3);
        round1.revealAnswers(choices[1], choices[1], "s3", 1);
        vm.prank(player4, player4);
        round1.revealAnswers(choices[2], choices[2], "s4", 1);

        assertEq(uint256(round1.phase(1)), uint256(GameRound.GamePhase.Completed));

        // Both minority choices (1 and 2) should be winning indices
        uint256[] memory winIdx = round1.getWinningChoiceIndex(1);
        assertEq(winIdx.length, 2);
        assertEq(winIdx[0], 1);
        assertEq(winIdx[1], 2);

        // Players 3 and 4 win (chose minority choices)
        assertTrue(round1.roundWinner(1, player3));
        assertTrue(round1.roundWinner(1, player4));
        // Players 1 and 2 lose (chose majority)
        assertFalse(round1.roundWinner(1, player1));
        assertFalse(round1.roundWinner(1, player2));
    }

    function test_findMinorityWinners_allTie() public {
        // 4 players each pick a different choice → all tie at score=1
        // All 4 choices are winning → everyone wins
        _joinPlayers(4);
        _startGameAndFulfillVRFWithSeed(42); // even → minority
        round1.startNewRound(1);

        (, string[4] memory choices) = round1.getQuestion(1);

        bytes32 h1 = keccak256(abi.encode(choices[0], choices[0], "s1"));
        bytes32 h2 = keccak256(abi.encode(choices[1], choices[1], "s2"));
        bytes32 h3 = keccak256(abi.encode(choices[2], choices[2], "s3"));
        bytes32 h4 = keccak256(abi.encode(choices[3], choices[3], "s4"));

        vm.prank(player1, player1);
        round1.submitAnswers(h1, 1);
        vm.prank(player2, player2);
        round1.submitAnswers(h2, 1);
        vm.prank(player3, player3);
        round1.submitAnswers(h3, 1);
        vm.prank(player4, player4);
        round1.submitAnswers(h4, 1);

        vm.prank(player1, player1);
        round1.revealAnswers(choices[0], choices[0], "s1", 1);
        vm.prank(player2, player2);
        round1.revealAnswers(choices[1], choices[1], "s2", 1);
        vm.prank(player3, player3);
        round1.revealAnswers(choices[2], choices[2], "s3", 1);
        vm.prank(player4, player4);
        round1.revealAnswers(choices[3], choices[3], "s4", 1);

        assertEq(uint256(round1.phase(1)), uint256(GameRound.GamePhase.Completed));

        // All 4 choices at minimum → length 4 → everyone wins
        uint256[] memory winIdx = round1.getWinningChoiceIndex(1);
        assertEq(winIdx.length, 4);

        assertTrue(round1.roundWinner(1, player1));
        assertTrue(round1.roundWinner(1, player2));
        assertTrue(round1.roundWinner(1, player3));
        assertTrue(round1.roundWinner(1, player4));
    }
}
