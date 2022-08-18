// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./GameRound.sol";
import "./Winners.sol";
import "./Lobby.sol";

contract HivemindKeeper is KeeperCompatibleInterface, AccessControlEnumerable {
    enum Queue {
        Lobby,
        Round1,
        Round2,
        Round3,
        Round4,
        Winners
    }
    enum Action {
        None,
        StartGame,
        StartRound,
        UpdatePhase,
        Clean,
        FindWinners
    }

    uint256 constant LOBBY_INDEX = 10000000000;
    uint256 constant ROUND_1_INDEX = 20000000000;
    uint256 constant ROUND_2_INDEX = 30000000000;
    uint256 constant ROUND_3_INDEX = 40000000000;
    uint256 constant ROUND_4_INDEX = 50000000000;
    uint256 constant WINNERS_INDEX = 60000000000;

    bytes32 public QUEUE_ROLE = keccak256("QUEUE_ROLE");

    uint256[][] private _completedUpdates;
    Lobby LOBBY;
    GameRound ROUND_1;
    GameRound ROUND_2;
    GameRound ROUND_3;
    GameRound ROUND_4;
    Winners WINNERS;
    // Mapping from Queue enum
    mapping(Queue => uint256[]) public queue; // index of games that need update
    // Mapping from Queue enum => game id
    mapping(Queue => mapping(uint256 => Action)) public action; // Action to be performed on queue for game

    constructor(
        address lobbyAddress,
        address round1Address,
        address round2Address,
        address round3Address,
        address round4Address,
        address winnersAddress
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        LOBBY = Lobby(lobbyAddress);
        ROUND_1 = GameRound(round1Address);
        ROUND_2 = GameRound(round2Address);
        ROUND_3 = GameRound(round3Address);
        ROUND_4 = GameRound(round4Address);
        WINNERS = Winners(winnersAddress);
    }

    // Queue Role functions
    function addActionToQueue(
        Action actionType,
        Queue queueType,
        uint256 gameID
    ) public onlyRole(QUEUE_ROLE) {
        _addActionToQueue(actionType, queueType, gameID);
    }

    // Chainlink Keeper functions
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = false;
        performData = bytes("");
        Queue _queue;
        Action _action;
        uint256 queueIndex;
        bool needsUpdate;
        uint256 gameID;
        (needsUpdate, queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Lobby
        );
        if (needsUpdate) {
            _queue = Queue.Lobby;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                queueIndex,
                gameID
            );
            // save everything to performData
            return (upkeepNeeded, performData);
        }
        (needsUpdate, queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round1
        );
        if (needsUpdate) {
            _queue = Queue.Round1;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                queueIndex,
                gameID
            );
            // save everything to performData
            return (upkeepNeeded, performData);
        }
        (needsUpdate, queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round2
        );
        if (needsUpdate) {
            _queue = Queue.Round2;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                queueIndex,
                gameID
            );
            // save everything to performData
            return (upkeepNeeded, performData);
        }
        (needsUpdate, queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round3
        );
        if (needsUpdate) {
            _queue = Queue.Round3;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                queueIndex,
                gameID
            );
            // save everything to performData
            return (upkeepNeeded, performData);
        }
        (needsUpdate, queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round4
        );
        if (needsUpdate) {
            _queue = Queue.Round4;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                queueIndex,
                gameID
            );
            // save everything to performData
            return (upkeepNeeded, performData);
        }
        (needsUpdate, queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Winners
        );
        if (needsUpdate) {
            _queue = Queue.Winners;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                queueIndex,
                gameID
            );
            // save everything to performData
            return (upkeepNeeded, performData);
        }
        (needsUpdate, _queue) = _queueNeedsClean();
        if (needsUpdate) {
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(Action.Clean),
                0,
                0
            );
            // save everything to performData
            return (upkeepNeeded, performData);
        }
        // set check data to which queue to update from, which index
        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 _queue;
        uint256 _action;
        uint256 _queueIndex;
        uint256 _gameID;
        (_queue, _action, _queueIndex, _gameID) = abi.decode(
            performData,
            (uint256, uint256, uint256, uint256)
        );
        Queue q = Queue(_queue);
        Action a = Action(_action);

        uint256[] memory newUpdate = new uint256[](4);
        newUpdate[0] = _queue;
        newUpdate[1] = _action;
        newUpdate[2] = _queueIndex;
        newUpdate[3] = _gameID;
        _completedUpdates.push(newUpdate);

        bool canUpdate = _verifyCanUpdate(q, a, _queueIndex, _gameID);
        if (canUpdate) {
            /* Possible Actions:
                StartGame,
                StartRound,
                StartReveal,
                EndRound,
                Clean,
                FindWinners
            */
            // do upkeep...
            if (q == Queue.Lobby) {
                // Lobby
                if (a == Action.StartGame) {
                    LOBBY.startGame();
                } else if (a == Action.Clean) {
                    // Clean Queue
                }
            } else if (q == Queue.Round1) {
                // Round 1
                if (a == Action.StartRound) {
                    // Start Round
                    ROUND_1.startNewRound(_gameID);
                } else if (a == Action.UpdatePhase) {
                    // Start Reveal
                } else if (a == Action.Clean) {
                    // Clean Queue
                }
            } else if (q == Queue.Round2) {
                // Round 2
                if (a == Action.StartRound) {
                    // Start Round
                } else if (a == Action.UpdatePhase) {
                    // Start Reveal
                } else if (a == Action.Clean) {
                    // Clean Queue
                }
            } else if (q == Queue.Round3) {
                // Round 3
                if (a == Action.StartRound) {
                    // Start Round
                } else if (a == Action.UpdatePhase) {
                    // Start Reveal
                } else if (a == Action.Clean) {
                    // Clean Queue
                }
            } else if (q == Queue.Round4) {
                // Round 4
                if (a == Action.StartRound) {
                    // Start Round
                } else if (a == Action.UpdatePhase) {
                    // Start Reveal
                } else if (a == Action.Clean) {
                    // Clean Queue
                }
            } else if (q == Queue.Winners) {
                // Winners
                if (a == Action.FindWinners) {
                    // find winners
                } else if (a == Action.Clean) {
                    // clean queue
                }
            }
            // then reset queue
            if (_queueIndex < LOBBY_INDEX) {
                queue[q][_queueIndex] = 0;
            }
            action[q][_gameID] = Action.None;
        }
    }

    function getUpdates() public view returns (uint256[][] memory updates) {
        updates = _completedUpdates;
    }

    function keeperCanUpdate(bytes calldata performData)
        public
        view
        returns (bool)
    {
        uint256 _queue;
        uint256 _action;
        uint256 _queueIndex;
        uint256 _gameID;
        (_queue, _action, _queueIndex, _gameID) = abi.decode(
            performData,
            (uint256, uint256, uint256, uint256)
        );
        Queue q = Queue(_queue);
        Action a = Action(_action);

        return _verifyCanUpdate(q, a, _queueIndex, _gameID);
    }

    // Internal checks
    function _queueNeedsClean()
        internal
        view
        returns (bool needClean, Queue queueType)
    {
        // TODO: check if we want to clean any zero filled queues...
    }

    function _queueNeedsUpdate(Queue queueType)
        internal
        view
        returns (
            bool needsUpdate,
            uint256 index,
            Action queueAction,
            uint256 gameID
        )
    {
        needsUpdate = false;
        index = 0;
        queueAction = Action(0);
        // check for self-reported update needs first
        for (uint256 i = 0; i < queue[queueType].length; i++) {
            uint256 _gameID = queue[queueType][i];
            if (_gameID != 0) {
                needsUpdate = true;
                index = i;
                queueAction = action[queueType][_gameID];
                gameID = _gameID;
                break;
            }
        }
        if (needsUpdate) {
            return (needsUpdate, index, queueAction, gameID);
        }

        // then check for "stuck" contracts
        // Lobby
        if (LOBBY.canStart()) {
            needsUpdate = true;
            index = LOBBY_INDEX;
            queueAction = Action.StartGame;
            return (needsUpdate, index, queueAction, LOBBY.currentGame());
        }

        // TODO:
        // Game Rounds
    }

    function _verifyCanUpdate(
        Queue queueType,
        Action queueAction,
        uint256 queueIndex,
        uint256 gameID
    ) internal view returns (bool canUpdate) {
        canUpdate = false;
        if (queueAction != Action.None) {
            if (queueIndex == LOBBY_INDEX) {
                canUpdate = LOBBY.canStart();
            } else if (
                queueIndex < LOBBY_INDEX &&
                queue[queueType][queueIndex] != 0 &&
                queue[queueType][queueIndex] == gameID
            ) {
                canUpdate = true;
            } else if (
                queueIndex == ROUND_1_INDEX ||
                queueIndex == ROUND_2_INDEX ||
                queueIndex == ROUND_3_INDEX ||
                queueIndex == ROUND_4_INDEX
            ) {
                // This can always be true, if not possible to update,
                // this will complete without updating anything
                // and be removed from the queue
                canUpdate = true;
            } else if (queueIndex == WINNERS_INDEX) {
                // TODO:
                // Check if this can be updated...
                canUpdate = true;
            }
        }
    }

    function _addActionToQueue(
        Action actionType,
        Queue queueType,
        uint256 gameID
    ) internal {
        queue[queueType].push(gameID);
        action[queueType][gameID] = actionType;
    }

    // Admin Functions
    function addQueueRole(address queueRoleAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(QUEUE_ROLE, queueRoleAddress);
    }
}
