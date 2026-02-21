// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "./HivemindTestBase.t.sol";

contract HivemindKeeperTest is HivemindTestBase {
    function test_checkUpkeep_noUpkeepNeeded() public view {
        (bool upkeepNeeded,) = hivemindKeeper.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }

    function test_checkUpkeep_lobbyCanStart() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (bool upkeepNeeded, bytes memory performData) = hivemindKeeper.checkUpkeep("");
        assertTrue(upkeepNeeded);

        // Decode to verify it's a lobby start action
        (uint256 queueType, uint256 actionType,,) = abi.decode(performData, (uint256, uint256, uint256, uint256));
        assertEq(queueType, uint256(HivemindKeeper.Queue.Lobby));
        assertEq(actionType, uint256(HivemindKeeper.Action.StartGame));
    }

    function test_performUpkeep_startsGame() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (, bytes memory performData) = hivemindKeeper.checkUpkeep("");
        hivemindKeeper.performUpkeep(performData);

        // Game should have started — lobby should need new game ID
        assertFalse(lobby.canStart());
    }

    function test_addActionToQueue() public {
        // Round1 has QUEUE_ROLE, simulate it adding to queue
        vm.prank(address(round1));
        hivemindKeeper.addActionToQueue(
            HivemindKeeper.Action.StartRound,
            HivemindKeeper.Queue.Round1,
            1
        );

        uint256[] memory q = hivemindKeeper.getQueue(1); // Queue.Round1
        assertEq(q.length, 1);
        assertEq(q[0], 1);
    }

    function test_registerDeregisterGameRound() public {
        vm.prank(address(round1));
        hivemindKeeper.registerGameRound(1, HivemindKeeper.Queue.Round1);

        vm.prank(address(round1));
        hivemindKeeper.deregisterGameRound(1, HivemindKeeper.Queue.Round1);
    }

    function test_getUpdates_tracksCompletedUpkeeps() public {
        _joinPlayers(2);
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);

        (, bytes memory performData) = hivemindKeeper.checkUpkeep("");
        hivemindKeeper.performUpkeep(performData);

        uint256[][] memory updates = hivemindKeeper.getUpdates();
        assertEq(updates.length, 1);
    }
}
