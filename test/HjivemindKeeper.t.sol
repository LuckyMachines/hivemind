// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HjivemindTestBase.t.sol";

contract HjivemindKeeperTest is HjivemindTestBase {
    function test_checkUpkeep_noUpkeepNeeded() public view {
        (bool upkeepNeeded,) = hjivemindKeeper.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }

    function test_checkUpkeep_lobbyCanStart() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (bool upkeepNeeded, bytes memory performData) = hjivemindKeeper.checkUpkeep("");
        assertTrue(upkeepNeeded);

        // Decode to verify it's a lobby start action
        (uint256 queueType, uint256 actionType,,) = abi.decode(performData, (uint256, uint256, uint256, uint256));
        assertEq(queueType, uint256(HjivemindKeeper.Queue.Lobby));
        assertEq(actionType, uint256(HjivemindKeeper.Action.StartGame));
    }

    function test_performUpkeep_startsGame() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (, bytes memory performData) = hjivemindKeeper.checkUpkeep("");
        hjivemindKeeper.performUpkeep(performData);

        // Game should have started — lobby should need new game ID
        assertFalse(lobby.canStart());
    }

    function test_addActionToQueue() public {
        // Round1 has QUEUE_ROLE, simulate it adding to queue
        vm.prank(address(round1));
        hjivemindKeeper.addActionToQueue(
            HjivemindKeeper.Action.StartRound,
            HjivemindKeeper.Queue.Round1,
            1
        );

        uint256[] memory q = hjivemindKeeper.getQueue(1); // Queue.Round1
        assertEq(q.length, 1);
        assertEq(q[0], 1);
    }

    function test_registerDeregisterGameRound() public {
        vm.prank(address(round1));
        hjivemindKeeper.registerGameRound(1, HjivemindKeeper.Queue.Round1);

        vm.prank(address(round1));
        hjivemindKeeper.deregisterGameRound(1, HjivemindKeeper.Queue.Round1);
    }

    function test_getUpdates_tracksCompletedUpkeeps() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (, bytes memory performData) = hjivemindKeeper.checkUpkeep("");
        hjivemindKeeper.performUpkeep(performData);

        uint256[][] memory updates = hjivemindKeeper.getUpdates();
        assertEq(updates.length, 1);
    }

    // AutoLoop interface tests
    function test_shouldProgressLoop_noLoopNeeded() public view {
        (bool loopIsReady,) = hjivemindKeeper.shouldProgressLoop();
        assertFalse(loopIsReady);
    }

    function test_shouldProgressLoop_lobbyCanStart() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (bool loopIsReady, bytes memory progressWithData) = hjivemindKeeper.shouldProgressLoop();
        assertTrue(loopIsReady);

        (uint256 queueType, uint256 actionType,,) = abi.decode(progressWithData, (uint256, uint256, uint256, uint256));
        assertEq(queueType, uint256(HjivemindKeeper.Queue.Lobby));
        assertEq(actionType, uint256(HjivemindKeeper.Action.StartGame));
    }

    function test_progressLoop_startsGame() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (, bytes memory progressWithData) = hjivemindKeeper.shouldProgressLoop();
        hjivemindKeeper.progressLoop(progressWithData);

        assertFalse(lobby.canStart());
    }

    function test_bothInterfaces_sameResult() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (bool upkeepNeeded, bytes memory performData) = hjivemindKeeper.checkUpkeep("");
        (bool loopIsReady, bytes memory progressWithData) = hjivemindKeeper.shouldProgressLoop();

        assertEq(upkeepNeeded, loopIsReady);
        assertEq(keccak256(performData), keccak256(progressWithData));
    }
}
