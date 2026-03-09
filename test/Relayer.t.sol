// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HjivemindTestBase.t.sol";

contract RelayerTest is HjivemindTestBase {
    address relayer;

    function setUp() public override {
        super.setUp();
        relayer = makeAddr("relayer");
        vm.deal(relayer, 100 ether);

        // Grant RELAYER_ROLE to relayer address on all contracts
        lobby.addRelayer(relayer);
        round1.addRelayer(relayer);
        round2.addRelayer(relayer);
        round3.addRelayer(relayer);
        round4.addRelayer(relayer);
        winners.addRelayer(relayer);
        gameController.addRelayer(relayer);

        // GameController needs RELAYER_ROLE on downstream contracts for passthroughs
        lobby.addRelayer(address(gameController));
        round1.addRelayer(address(gameController));
        round2.addRelayer(address(gameController));
        round3.addRelayer(address(gameController));
        round4.addRelayer(address(gameController));
        winners.addRelayer(address(gameController));
    }

    // ── Lobby: joinGameFor ──────────────────────────────────────

    function test_joinGameFor_singlePlayer() public {
        vm.prank(relayer);
        lobby.joinGameFor(player1);
        assertEq(lobby.playerCount(1), 1);
        assertTrue(scoreKeeper.playerInActiveGame(player1));
    }

    function test_joinGameFor_multiplePlayers() public {
        vm.prank(relayer);
        lobby.joinGameFor(player1);
        vm.prank(relayer);
        lobby.joinGameFor(player2);
        vm.prank(relayer);
        lobby.joinGameFor(player3);
        assertEq(lobby.playerCount(1), 3);
        assertTrue(scoreKeeper.playerInActiveGame(player1));
        assertTrue(scoreKeeper.playerInActiveGame(player2));
        assertTrue(scoreKeeper.playerInActiveGame(player3));
    }

    function test_joinGameFor_alreadyInGame_reverts() public {
        vm.prank(relayer);
        lobby.joinGameFor(player1);
        vm.prank(relayer);
        vm.expectRevert("player already in game");
        lobby.joinGameFor(player1);
    }

    function test_joinGameFor_notRelayer_reverts() public {
        vm.prank(player1);
        vm.expectRevert();
        lobby.joinGameFor(player2);
    }

    function test_joinGameFor_withEntryFee() public {
        lobby.setEntryFee(0.1 ether);
        vm.prank(relayer);
        lobby.joinGameFor{value: 0.1 ether}(player1);
        assertEq(lobby.playerCount(1), 1);
    }

    function test_joinGameFor_insufficientFee_reverts() public {
        lobby.setEntryFee(0.1 ether);
        vm.prank(relayer);
        vm.expectRevert("Minimum entry fee not sent");
        lobby.joinGameFor{value: 0.05 ether}(player1);
    }

    function test_joinGameFor_mixedWithDirectJoin() public {
        // Player 1 joins via relayer, player 2 joins directly
        vm.prank(relayer);
        lobby.joinGameFor(player1);
        vm.prank(player2, player2);
        lobby.joinGame();
        assertEq(lobby.playerCount(1), 2);
        assertTrue(scoreKeeper.playerInActiveGame(player1));
        assertTrue(scoreKeeper.playerInActiveGame(player2));
    }

    // ── GameRound: submitAnswersFor / revealAnswersFor ─────────

    function test_submitAnswersFor() public {
        // Join two players via relayer and start game
        vm.prank(relayer);
        lobby.joinGameFor(player1);
        vm.prank(relayer);
        lobby.joinGameFor(player2);

        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();

        // Fulfill VRF
        vrfCoordinator.fulfillRandomWords(1, address(round1));

        // Start new round via keeper
        round1.startNewRound(1);

        // Submit answers for player1 via relayer
        bytes32 hashed = keccak256(abi.encode("North", "South", "secret123"));
        vm.prank(relayer);
        round1.submitAnswersFor(hashed, 1, player1);
        assertEq(round1.totalResponses(1), 1);
    }

    function test_submitAnswersFor_notRelayer_reverts() public {
        vm.prank(relayer);
        lobby.joinGameFor(player1);
        vm.prank(relayer);
        lobby.joinGameFor(player2);

        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();
        vrfCoordinator.fulfillRandomWords(1, address(round1));
        round1.startNewRound(1);

        bytes32 hashed = keccak256(abi.encode("North", "South", "secret123"));
        vm.prank(player1);
        vm.expectRevert();
        round1.submitAnswersFor(hashed, 1, player1);
    }

    function test_revealAnswersFor() public {
        vm.prank(relayer);
        lobby.joinGameFor(player1);
        vm.prank(relayer);
        lobby.joinGameFor(player2);

        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();

        // Use a known seed to get predictable question
        uint256[] memory words = new uint256[](1);
        words[0] = 42;
        vrfCoordinator.fulfillRandomWordsWithOverride(1, address(round1), words);
        round1.startNewRound(1);

        // Get the actual question choices
        (, string[4] memory choices) = round1.getQuestion(1);

        string memory questionAnswer = choices[0];
        string memory crowdAnswer = choices[1];
        string memory secret = "mysecret";

        // Submit via relayer
        bytes32 hashed = keccak256(abi.encode(questionAnswer, crowdAnswer, secret));
        vm.prank(relayer);
        round1.submitAnswersFor(hashed, 1, player1);

        // Also submit for player2 so round transitions
        bytes32 hashed2 = keccak256(abi.encode(choices[0], choices[0], "secret2"));
        vm.prank(relayer);
        round1.submitAnswersFor(hashed2, 1, player2);

        // Now reveal for player1 via relayer
        vm.prank(relayer);
        round1.revealAnswersFor(questionAnswer, crowdAnswer, secret, 1, player1);
        assertTrue(round1.answersRevealed(1, player1));
    }

    // ── Winners: claimWinningsFor ─────────────────────────────

    function test_claimWinningsFor_notRelayer_reverts() public {
        vm.prank(player1);
        vm.expectRevert();
        winners.claimWinningsFor(1, 100, player1);
    }

    // ── GameController: relayer passthroughs ──────────────────

    function test_gameController_joinGameFor() public {
        vm.prank(relayer);
        gameController.joinGameFor{value: 0}(player1);
        assertEq(lobby.playerCount(1), 1);
        assertTrue(scoreKeeper.playerInActiveGame(player1));
    }

    function test_gameController_addRelayer_onlyAdmin() public {
        address newRelayer = makeAddr("newRelayer");
        vm.prank(player1);
        vm.expectRevert();
        gameController.addRelayer(newRelayer);

        // Admin can add
        gameController.addRelayer(newRelayer);
    }
}
