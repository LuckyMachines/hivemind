// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import {AutoLoopCompatibleInterface} from "./interfaces/AutoLoopCompatibleInterface.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {VRFVerifier} from "./VRFVerifier.sol";
import "./GameRound.sol";
import "./Winners.sol";
import "./Lobby.sol";

contract HjivemindKeeper is AutomationCompatibleInterface, AutoLoopCompatibleInterface, AccessControlEnumerable {
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
        FindWinners,
        SeedRound
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
    mapping(Queue => uint256) public queueIndex; // index of queue to be passed for certain upkeeps
    // Mapping from Queue enum => game id
    mapping(Queue => mapping(uint256 => Action)) public action; // Action to be performed on queue for game
    uint256[2][] public registeredGameRounds;

    // AutoLoop VRF state
    mapping(address => uint256[2]) public controllerPublicKeys;
    mapping(address => bool) public controllerKeyRegistered;
    bool public vrfEnabled;

    constructor(
        address lobbyAddress,
        address round1Address,
        address round2Address,
        address round3Address,
        address round4Address,
        address winnersAddress
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        LOBBY = Lobby(lobbyAddress);
        ROUND_1 = GameRound(round1Address);
        ROUND_2 = GameRound(round2Address);
        ROUND_3 = GameRound(round3Address);
        ROUND_4 = GameRound(round4Address);
        WINNERS = Winners(payable(winnersAddress));
        queueIndex[Queue.Lobby] = LOBBY_INDEX;
        queueIndex[Queue.Round1] = ROUND_1_INDEX;
        queueIndex[Queue.Round2] = ROUND_2_INDEX;
        queueIndex[Queue.Round3] = ROUND_3_INDEX;
        queueIndex[Queue.Round4] = ROUND_4_INDEX;
        queueIndex[Queue.Winners] = WINNERS_INDEX;
    }

    function getQueue(uint256 queueType)
        public
        view
        returns (uint256[] memory)
    {
        return queue[Queue(queueType)];
    }

    // Queue Role functions
    function addActionToQueue(
        Action actionType,
        Queue queueType,
        uint256 gameID
    ) public onlyRole(QUEUE_ROLE) {
        _addActionToQueue(actionType, queueType, gameID);
    }

    function registerGameRound(uint256 gameID, Queue roundQueue)
        public
        onlyRole(QUEUE_ROLE)
    {
        registeredGameRounds.push([gameID, uint256(roundQueue)]);
    }

    function deregisterGameRound(uint256 gameID, Queue roundQueue)
        public
        onlyRole(QUEUE_ROLE)
    {
        int256 indexMatch = -1;
        for (uint256 i = 0; i < registeredGameRounds.length; i++) {
            if (
                registeredGameRounds[i][0] == gameID &&
                registeredGameRounds[i][1] == uint256(roundQueue)
            ) {
                indexMatch = int256(i);
                break;
            }
            if (registeredGameRounds[i][0] == 0) {
                break;
            }
        }
        if (indexMatch > -1) {
            uint256 index = uint256(indexMatch);

            for (uint256 j = index; j < registeredGameRounds.length - 1; j++) {
                registeredGameRounds[j] = registeredGameRounds[j + 1];
                if (registeredGameRounds[j][0] == 0 && gameID != 0) {
                    // we are past the end of the values we want
                    break;
                }
            }
            delete registeredGameRounds[registeredGameRounds.length - 1];
        }
    }

    // Chainlink Automation functions
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        return _checkInternal();
    }

    function performUpkeep(bytes calldata performData) external override {
        _performInternal(performData);
    }

    // AutoLoop functions
    function shouldProgressLoop()
        external
        view
        override
        returns (bool loopIsReady, bytes memory progressWithData)
    {
        return _checkInternal();
    }

    function progressLoop(bytes calldata progressWithData) external override {
        if (vrfEnabled) {
            // Try to decode as VRF envelope first
            // VRF envelope: (uint256 queue, uint256 action, uint256 queueIndex, uint256 gameID, bytes vrfProofData)
            // Standard envelope: (uint256 queue, uint256 action, uint256 queueIndex, uint256 gameID)
            (uint256 _queue, uint256 _action, , ) = abi.decode(
                progressWithData,
                (uint256, uint256, uint256, uint256)
            );
            if (Action(_action) == Action.SeedRound) {
                _performVRFSeedRound(progressWithData);
                return;
            }
        }
        _performInternal(progressWithData);
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

    function loopCanUpdate(bytes calldata progressWithData)
        public
        view
        returns (bool)
    {
        return keeperCanUpdate(progressWithData);
    }

    // ERC165 Support
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlEnumerable)
        returns (bool)
    {
        return
            interfaceId == type(AutoLoopCompatibleInterface).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // Shared internal logic
    function _checkInternal()
        internal
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = false;
        performData = bytes("");
        Queue _queue;
        Action _action;
        uint256 _queueIndex;
        bool needsUpdate;
        uint256 gameID;
        (needsUpdate, _queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Lobby
        );
        if (needsUpdate) {
            _queue = Queue.Lobby;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                _queueIndex,
                gameID
            );
            return (upkeepNeeded, performData);
        }
        (needsUpdate, _queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round1
        );
        if (needsUpdate) {
            _queue = Queue.Round1;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                _queueIndex,
                gameID
            );
            return (upkeepNeeded, performData);
        }
        (needsUpdate, _queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round2
        );
        if (needsUpdate) {
            _queue = Queue.Round2;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                _queueIndex,
                gameID
            );
            return (upkeepNeeded, performData);
        }
        (needsUpdate, _queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round3
        );
        if (needsUpdate) {
            _queue = Queue.Round3;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                _queueIndex,
                gameID
            );
            return (upkeepNeeded, performData);
        }
        (needsUpdate, _queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Round4
        );
        if (needsUpdate) {
            _queue = Queue.Round4;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                _queueIndex,
                gameID
            );
            return (upkeepNeeded, performData);
        }
        (needsUpdate, _queueIndex, _action, gameID) = _queueNeedsUpdate(
            Queue.Winners
        );
        if (needsUpdate) {
            _queue = Queue.Winners;
            upkeepNeeded = true;
            performData = abi.encode(
                uint256(_queue),
                uint256(_action),
                _queueIndex,
                gameID
            );
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
            return (upkeepNeeded, performData);
        }
    }

    function _performInternal(bytes calldata performData) internal {
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
            if (q == Queue.Lobby) {
                if (a == Action.StartGame) {
                    LOBBY.startGame();
                }
            } else if (q == Queue.Round1) {
                if (a == Action.StartRound) {
                    ROUND_1.startNewRound(_gameID);
                } else if (a == Action.UpdatePhase) {
                    ROUND_1.updatePhase(_gameID);
                }
            } else if (q == Queue.Round2) {
                if (a == Action.StartRound) {
                    ROUND_2.startNewRound(_gameID);
                } else if (a == Action.UpdatePhase) {
                    ROUND_2.updatePhase(_gameID);
                }
            } else if (q == Queue.Round3) {
                if (a == Action.StartRound) {
                    ROUND_3.startNewRound(_gameID);
                } else if (a == Action.UpdatePhase) {
                    ROUND_3.updatePhase(_gameID);
                }
            } else if (q == Queue.Round4) {
                if (a == Action.StartRound) {
                    ROUND_4.startNewRound(_gameID);
                } else if (a == Action.UpdatePhase) {
                    ROUND_4.updatePhase(_gameID);
                }
            }
            // then reset queue
            if (_queueIndex < LOBBY_INDEX) {
                queue[q][_queueIndex] = 0;
            }
            action[q][_gameID] = Action.None;
        }
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

        // Game Rounds
        for (uint256 i = 0; i < registeredGameRounds.length; i++) {
            if (
                registeredGameRounds[i][0] > 0 && registeredGameRounds[i][1] > 0
            ) {
                needsUpdate = _checkGameRoundNeedsUpdate(
                    registeredGameRounds[i][0],
                    Queue(registeredGameRounds[i][1])
                );
            }
            if (needsUpdate) {
                index = queueIndex[Queue(registeredGameRounds[i][1])];
                queueAction = Action.UpdatePhase;
                return (
                    needsUpdate,
                    index,
                    queueAction,
                    registeredGameRounds[i][0]
                );
            }
        }
    }

    function _checkGameRoundNeedsUpdate(uint256 gameID, Queue roundQueue)
        internal
        view
        returns (bool needsUpdate)
    {
        needsUpdate = false;
    }

    function _verifyCanUpdate(
        Queue queueType,
        Action queueAction,
        uint256 _queueIndex,
        uint256 gameID
    ) internal view returns (bool canUpdate) {
        canUpdate = false;
        if (queueAction != Action.None) {
            if (_queueIndex == LOBBY_INDEX) {
                canUpdate = LOBBY.canStart();
            } else if (
                _queueIndex < LOBBY_INDEX &&
                queue[queueType][_queueIndex] != 0 &&
                queue[queueType][_queueIndex] == gameID
            ) {
                canUpdate = true;
            } else if (
                _queueIndex == ROUND_1_INDEX ||
                _queueIndex == ROUND_2_INDEX ||
                _queueIndex == ROUND_3_INDEX ||
                _queueIndex == ROUND_4_INDEX
            ) {
                canUpdate = true;
            } else if (_queueIndex == WINNERS_INDEX) {
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

    // AutoLoop VRF internal
    function _performVRFSeedRound(bytes calldata progressWithData) internal {
        (
            uint256 _queue,
            uint256 _action,
            uint256 _queueIndex,
            uint256 _gameID,
            bytes memory vrfProofData
        ) = abi.decode(
            progressWithData,
            (uint256, uint256, uint256, uint256, bytes)
        );

        Queue q = Queue(_queue);

        // Decode and verify VRF proof
        VRFVerifier.ECVRFProof memory proof = abi.decode(
            vrfProofData,
            (VRFVerifier.ECVRFProof)
        );

        // Verify controller key is registered
        address controller = msg.sender;
        require(controllerKeyRegistered[controller], "Controller key not registered");
        require(
            controllerPublicKeys[controller][0] == proof.pk[0] &&
            controllerPublicKeys[controller][1] == proof.pk[1],
            "Public key mismatch"
        );

        // Verify VRF proof
        require(VRFVerifier.fastVerify(proof), "Invalid VRF proof");

        // Extract randomness from verified proof
        bytes32 randomness = VRFVerifier.gammaToHash(proof.gamma);

        // Clean up old SeedRound queue entry BEFORE delivering seed,
        // because _deliverSeedToRound queues a new StartRound action for the same gameID
        if (_queueIndex < LOBBY_INDEX) {
            queue[q][_queueIndex] = 0;
        }

        // Deliver seed to the appropriate round (this queues StartRound)
        _deliverSeedToRound(q, _gameID, uint256(randomness));

        uint256[] memory newUpdate = new uint256[](4);
        newUpdate[0] = _queue;
        newUpdate[1] = _action;
        newUpdate[2] = _queueIndex;
        newUpdate[3] = _gameID;
        _completedUpdates.push(newUpdate);
    }

    function _deliverSeedToRound(Queue q, uint256 gameID, uint256 seed) internal {
        if (q == Queue.Round1) {
            ROUND_1.setQuestionSeed(gameID, seed);
        } else if (q == Queue.Round2) {
            ROUND_2.setQuestionSeed(gameID, seed);
        } else if (q == Queue.Round3) {
            ROUND_3.setQuestionSeed(gameID, seed);
        } else if (q == Queue.Round4) {
            ROUND_4.setQuestionSeed(gameID, seed);
        }
    }

    // Admin Functions
    function addQueueRole(address queueRoleAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(QUEUE_ROLE, queueRoleAddress);
    }

    function setVRFEnabled(bool enabled)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        vrfEnabled = enabled;
    }

    function registerControllerKey(
        address controller,
        uint256 pkX,
        uint256 pkY
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        controllerPublicKeys[controller] = [pkX, pkY];
        controllerKeyRegistered[controller] = true;
    }
}
