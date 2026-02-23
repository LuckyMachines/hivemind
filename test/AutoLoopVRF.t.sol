// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HjivemindTestBase.t.sol";

contract AutoLoopVRFTest is HjivemindTestBase {
    function setUp() public override {
        super.setUp();
        _enableAutoLoopVRF();
    }

    function test_setVRFSource_autoLoop() public view {
        assertEq(
            uint256(round1.vrfSource()),
            uint256(GameRound.VRFSource.AutoLoop)
        );
        assertEq(
            uint256(round2.vrfSource()),
            uint256(GameRound.VRFSource.AutoLoop)
        );
        assertEq(
            uint256(round3.vrfSource()),
            uint256(GameRound.VRFSource.AutoLoop)
        );
        assertEq(
            uint256(round4.vrfSource()),
            uint256(GameRound.VRFSource.AutoLoop)
        );
        assertTrue(hjivemindKeeper.vrfEnabled());
    }

    function test_railcarEnter_autoLoopMode_queuesSeedRound() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        // In AutoLoop mode, _railcarDidEnter queues a SeedRound action
        uint256[] memory q = hjivemindKeeper.getQueue(1);
        assertTrue(q.length > 0, "Queue should have entries");

        uint256 gameID = q[0];
        assertTrue(gameID != 0, "Game ID should be non-zero");

        assertEq(
            uint256(hjivemindKeeper.action(HjivemindKeeper.Queue.Round1, gameID)),
            uint256(HjivemindKeeper.Action.SeedRound)
        );
    }

    function test_setQuestionSeed_fromKeeper() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;
        uint256 seed = 12345;
        _directSetQuestionSeed(round1, gameID, seed);
        assertEq(round1.questionSeed(gameID), seed);
    }

    function test_setQuestionSeed_alreadySet_reverts() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;
        _directSetQuestionSeed(round1, gameID, 12345);

        vm.expectRevert("Seed already set");
        round1.setQuestionSeed(gameID, 67890);
    }

    function test_setQuestionSeed_nonKeeper_reverts() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        vm.prank(player1);
        vm.expectRevert();
        round1.setQuestionSeed(1, 12345);
    }

    function test_fullAutoLoopVRFFlow_viaDirect() public {
        // Full game flow using direct seed delivery (bypasses VRF proof).
        // VRF proof verification is tested separately at the library level.
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;

        // Phase should be Question
        assertEq(
            uint256(round1.phase(gameID)),
            uint256(GameRound.GamePhase.Question)
        );
        assertEq(round1.questionSeed(gameID), 0);

        // Deliver seed directly (simulates keeper after VRF proof verification)
        _directSetQuestionSeed(round1, gameID, 42);
        assertTrue(round1.questionSeed(gameID) != 0, "Seed should be set");

        // StartRound should now be queued
        (bool ready, bytes memory data) = hjivemindKeeper.shouldProgressLoop();
        assertTrue(ready, "Keeper should have work after seed delivery");

        // Execute StartRound
        hjivemindKeeper.progressLoop(data);

        // Verify question is set
        (string memory question, string[4] memory choices) = round1.getQuestion(gameID);
        assertTrue(bytes(question).length > 0, "Question should be set");
        assertTrue(bytes(choices[0]).length > 0, "Choices should be set");
    }

    function test_vrfEnabled_toggle() public {
        assertTrue(hjivemindKeeper.vrfEnabled());
        hjivemindKeeper.setVRFEnabled(false);
        assertFalse(hjivemindKeeper.vrfEnabled());
    }

    function test_controllerKey_registration() public view {
        assertTrue(hjivemindKeeper.controllerKeyRegistered(autoLoopController));
        (uint256 pkX, uint256 pkY) = (
            hjivemindKeeper.controllerPublicKeys(autoLoopController, 0),
            hjivemindKeeper.controllerPublicKeys(autoLoopController, 1)
        );
        assertEq(pkX, CONTROLLER_PK_X);
        assertEq(pkY, CONTROLLER_PK_Y);
    }

    function test_progressLoop_unregisteredController_reverts() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;
        // Build a VRF envelope (will fail proof verification, but should fail on controller check first)
        uint256[4] memory fakeProof = [uint256(1), uint256(2), uint256(3), uint256(4)];
        uint256[2] memory fakeU = [uint256(1), uint256(2)];
        uint256[4] memory fakeV = [uint256(1), uint256(2), uint256(3), uint256(4)];
        bytes memory envelope = _buildVRFEnvelope(1, 0, gameID, fakeProof, fakeU, fakeV);

        // Unregistered controller should revert
        vm.prank(player1);
        vm.expectRevert("Controller key not registered");
        hjivemindKeeper.progressLoop(envelope);
    }

    function test_progressLoop_wrongVRFVersion_reverts() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;
        // Build envelope with wrong version
        bytes memory gameData = abi.encode(
            uint256(1), uint256(HjivemindKeeper.Action.SeedRound), uint256(0), gameID
        );
        bytes memory envelope = abi.encode(
            uint8(99), // wrong version
            [uint256(1), uint256(2), uint256(3), uint256(4)],
            [uint256(1), uint256(2)],
            [uint256(1), uint256(2), uint256(3), uint256(4)],
            gameData
        );

        vm.prank(autoLoopController);
        vm.expectRevert("Unsupported VRF version");
        hjivemindKeeper.progressLoop(envelope);
    }

    function test_setVRFSource_onlyAdmin() public {
        vm.prank(player1);
        vm.expectRevert();
        round1.setVRFSource(GameRound.VRFSource.Chainlink);
    }

    function test_vrfEnvelopeFormat_standardDataPassesThrough() public {
        // Standard 128-byte envelope should still go through _performInternal
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        // Deliver seed directly to get a StartRound queued
        _directSetQuestionSeed(round1, 1, 42);

        // shouldProgressLoop returns standard 128-byte data
        (bool ready, bytes memory data) = hjivemindKeeper.shouldProgressLoop();
        assertTrue(ready);
        assertEq(data.length, 128, "Standard envelope should be 128 bytes");

        // This should go through _performInternal, not VRF path
        hjivemindKeeper.progressLoop(data);

        // Verify it worked
        (string memory question, ) = round1.getQuestion(1);
        assertTrue(bytes(question).length > 0);
    }
}
