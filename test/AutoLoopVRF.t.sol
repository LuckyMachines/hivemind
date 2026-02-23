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
        // Check the queue for Round1 (queueType=1)
        uint256[] memory q = hjivemindKeeper.getQueue(1);
        assertTrue(q.length > 0, "Queue should have entries");

        uint256 gameID = q[0];
        assertTrue(gameID != 0, "Game ID should be non-zero");

        // Action should be SeedRound
        assertEq(
            uint256(hjivemindKeeper.action(HjivemindKeeper.Queue.Round1, gameID)),
            uint256(HjivemindKeeper.Action.SeedRound)
        );
    }

    function test_setQuestionSeed_fromKeeper() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;
        // Keeper delivers seed via setQuestionSeed
        uint256 seed = 12345;
        round1.setQuestionSeed(gameID, seed);
        assertEq(round1.questionSeed(gameID), seed);
    }

    function test_setQuestionSeed_alreadySet_reverts() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;
        round1.setQuestionSeed(gameID, 12345);

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

    function test_fullAutoLoopVRFFlow() public {
        _joinPlayers(2);
        _startGameAutoLoopVRF();

        uint256 gameID = 1;

        // Phase should be Question (set by _railcarDidEnter)
        assertEq(
            uint256(round1.phase(gameID)),
            uint256(GameRound.GamePhase.Question)
        );

        // Seed not yet set
        assertEq(round1.questionSeed(gameID), 0);

        // Get queue index for the SeedRound entry
        uint256[] memory q = hjivemindKeeper.getQueue(1);
        uint256 queueIndex = 0; // first entry

        // Simulate AutoLoop controller delivering VRF proof
        _fulfillAutoLoopVRF(1, queueIndex, gameID);

        // Seed should now be set (hash of gamma point)
        assertTrue(round1.questionSeed(gameID) != 0, "Seed should be set after VRF");

        // After VRF seed delivery, a StartRound action should be queued
        // The keeper should be able to start the round now
        // Check that shouldProgressLoop signals the StartRound action
        (bool ready, bytes memory data) = hjivemindKeeper.shouldProgressLoop();
        assertTrue(ready, "Keeper should have work after VRF seed delivery");

        // Execute the StartRound via keeper
        hjivemindKeeper.progressLoop(data);

        // Verify question is set
        (string memory question, string[4] memory choices) = round1.getQuestion(gameID);
        assertTrue(bytes(question).length > 0, "Question should be set");
        assertTrue(bytes(choices[0]).length > 0, "Choices should be set");

        // Verify minority/majority mode is set
        // The seed determines this: seed % 2 == 0 → minority
        // Our seed is keccak256(gammaX, gammaY) so it's deterministic
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
        uint256[] memory q = hjivemindKeeper.getQueue(1);
        bytes memory envelope = _buildVRFEnvelope(
            1, 0, gameID, 0xaaaa, 0xbbbb, block.timestamp
        );

        // Unregistered controller should revert
        vm.prank(player1);
        vm.expectRevert("Controller key not registered");
        hjivemindKeeper.progressLoop(envelope);
    }

    function test_setVRFSource_onlyAdmin() public {
        vm.prank(player1);
        vm.expectRevert();
        round1.setVRFSource(GameRound.VRFSource.Chainlink);
    }
}
