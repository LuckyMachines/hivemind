// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HjivemindTestBase.t.sol";

contract IntegrationTest is HjivemindTestBase {
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
        assertEq(scoreKeeper.latestRound(1), "hjivemind.round2");
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

    function test_mixedMode_majorityAndMinorityRounds() public {
        // 4 players play through 2 rounds: majority then minority
        _joinPlayers(4);
        uint256 gameID = 1;

        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();

        // ── Round 1: Majority mode (odd seed) ──
        uint256[] memory words = new uint256[](1);
        words[0] = 77; // odd → majority
        vrfCoordinator.fulfillRandomWordsWithOverride(1, address(round1), words);
        round1.startNewRound(gameID);
        assertFalse(round1.isMinorityRound(gameID));

        {
            (, string[4] memory c1) = round1.getQuestion(gameID);

            // 3 players pick choice[0], 1 picks choice[1]
            // In majority mode, choice[0] wins
            bytes32 h1 = keccak256(abi.encode(c1[0], c1[0], "s1"));
            bytes32 h2 = keccak256(abi.encode(c1[0], c1[0], "s2"));
            bytes32 h3 = keccak256(abi.encode(c1[0], c1[0], "s3"));
            bytes32 h4 = keccak256(abi.encode(c1[1], c1[1], "s4"));

            vm.prank(player1, player1);
            round1.submitAnswers(h1, gameID);
            vm.prank(player2, player2);
            round1.submitAnswers(h2, gameID);
            vm.prank(player3, player3);
            round1.submitAnswers(h3, gameID);
            vm.prank(player4, player4);
            round1.submitAnswers(h4, gameID);

            vm.prank(player1, player1);
            round1.revealAnswers(c1[0], c1[0], "s1", gameID);
            vm.prank(player2, player2);
            round1.revealAnswers(c1[0], c1[0], "s2", gameID);
            vm.prank(player3, player3);
            round1.revealAnswers(c1[0], c1[0], "s3", gameID);
            vm.prank(player4, player4);
            round1.revealAnswers(c1[1], c1[1], "s4", gameID);
        }

        // Round 1 completed — majority winners: players 1-3 (chose majority choice[0])
        assertEq(uint256(round1.phase(gameID)), uint256(GameRound.GamePhase.Completed));
        assertTrue(round1.roundWinner(gameID, player1));
        assertTrue(round1.roundWinner(gameID, player2));
        assertTrue(round1.roundWinner(gameID, player3));
        assertFalse(round1.roundWinner(gameID, player4));

        uint256 scoreAfterR1_p1 = scoreKeeper.playerScore(gameID, player1);
        uint256 scoreAfterR1_p4 = scoreKeeper.playerScore(gameID, player4);

        // ── Round 2: Minority mode (even seed) ──
        // Railcar auto-entered round2, VRF request ID = 2
        round2.addKeeper(admin);
        words[0] = 42; // even → minority
        vrfCoordinator.fulfillRandomWordsWithOverride(2, address(round2), words);
        round2.startNewRound(gameID);
        assertTrue(round2.isMinorityRound(gameID));

        {
            (, string[4] memory c2) = round2.getQuestion(gameID);

            // 3 players pick choice[0], 1 picks choice[1]
            // In minority mode, choice[1] wins (least popular)
            bytes32 h1 = keccak256(abi.encode(c2[0], c2[0], "s1"));
            bytes32 h2 = keccak256(abi.encode(c2[0], c2[0], "s2"));
            bytes32 h3 = keccak256(abi.encode(c2[0], c2[0], "s3"));
            bytes32 h4 = keccak256(abi.encode(c2[1], c2[1], "s4"));

            vm.prank(player1, player1);
            round2.submitAnswers(h1, gameID);
            vm.prank(player2, player2);
            round2.submitAnswers(h2, gameID);
            vm.prank(player3, player3);
            round2.submitAnswers(h3, gameID);
            vm.prank(player4, player4);
            round2.submitAnswers(h4, gameID);

            vm.prank(player1, player1);
            round2.revealAnswers(c2[0], c2[0], "s1", gameID);
            vm.prank(player2, player2);
            round2.revealAnswers(c2[0], c2[0], "s2", gameID);
            vm.prank(player3, player3);
            round2.revealAnswers(c2[0], c2[0], "s3", gameID);
            vm.prank(player4, player4);
            round2.revealAnswers(c2[1], c2[1], "s4", gameID);
        }

        // Round 2 completed — minority winner: player 4 (chose minority choice[1])
        assertEq(uint256(round2.phase(gameID)), uint256(GameRound.GamePhase.Completed));
        assertFalse(round2.roundWinner(gameID, player1));
        assertFalse(round2.roundWinner(gameID, player2));
        assertFalse(round2.roundWinner(gameID, player3));
        assertTrue(round2.roundWinner(gameID, player4));

        // Cumulative scores: player1 gained winning points in R1 but not R2
        // player4 gained winning points in R2 but not R1
        uint256 scoreAfterR2_p1 = scoreKeeper.playerScore(gameID, player1);
        uint256 scoreAfterR2_p4 = scoreKeeper.playerScore(gameID, player4);

        // Player 1 score should have increased from R1 (submission+reveal bonus) but NOT from R2 winning
        assertTrue(scoreAfterR2_p1 > scoreAfterR1_p1); // got submission+reveal bonus in R2
        // Player 4 should have gained winning points in R2
        assertTrue(scoreAfterR2_p4 > scoreAfterR1_p4);

        // GameController pass-through should work
        assertTrue(gameController.getIsMinorityRound("hjivemind.round2", gameID));
        assertFalse(gameController.getIsMinorityRound("hjivemind.round1", gameID));
    }
}
