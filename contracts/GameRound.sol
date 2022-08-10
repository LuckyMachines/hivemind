// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;
import "@luckymachines/railway/contracts/Hub.sol";
import "@luckymachines/railway/contracts/RailYard.sol";
import "./Questions.sol";
import "./ScoreKeeper.sol";
import "./GameController.sol";
import "hardhat/console.sol";

contract GameRound is Hub {
    uint256 constant maxPointsPerRound = 10000;
    string public hubName;
    string public nextRoundHub;
    uint256 public roundTimeLimit = 300; // in seconds (5 minute default)

    enum GamePhase {
        Pregame,
        Question,
        Reveal,
        Completed
    }

    Questions internal QUESTIONS;
    ScoreKeeper internal SCORE_KEEPER;
    GameController internal GAME_CONTROLLER;
    RailYard internal RAIL_YARD;

    // mapping from game ID
    mapping(uint256 => uint256) internal revealPoints;
    mapping(uint256 => string) internal question;
    mapping(uint256 => string[4]) internal responses;
    mapping(uint256 => uint256) public roundStartTime;
    mapping(uint256 => uint256) public revealStartTime;
    mapping(uint256 => uint256[4]) public responseScores; // how many people chose each response
    mapping(uint256 => GamePhase) public phase;
    mapping(uint256 => uint256) public totalResponses;
    mapping(uint256 => uint256) public totalReveals;
    mapping(uint256 => uint256) public railcar;

    // from game ID => player
    mapping(uint256 => mapping(address => bytes32)) public hashedAnswer;
    mapping(uint256 => mapping(address => bool)) public answersRevealed;
    mapping(uint256 => mapping(address => bool)) public roundWinner;

    constructor(
        string memory thisHub,
        string memory nextHub,
        address questionsAddress,
        address scoreKeeperAddress,
        address gameControllerAddress,
        address railYardAddress,
        address hubRegistryAddress,
        address hubAdmin
    ) Hub(hubRegistryAddress, hubAdmin) {
        uint256 hubID = REGISTRY.idFromAddress(address(this));
        REGISTRY.setName(thisHub, hubID);
        hubName = thisHub;
        nextRoundHub = nextHub;
        QUESTIONS = Questions(questionsAddress);
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
        GAME_CONTROLLER = GameController(gameControllerAddress);
        RAIL_YARD = RailYard(railYardAddress);
    }

    // Player functions
    function getQuestion(uint256 gameID)
        public
        view
        returns (string memory q, string[4] memory choices)
    {
        q = question[gameID];
        choices = responses[gameID];
    }

    // submit answers (will be stored in secret)
    function submitAnswers(
        string memory questionAnswer,
        string memory crowdAnswer,
        string memory secretPhrase,
        uint256 gameID
    ) public {
        address player = tx.origin;
        require(playerIsInHub(gameID, player), "Player is not in this hub");
        require(
            phase[gameID] == GamePhase.Question,
            "Game not in question phase"
        );
        require(
            block.timestamp < roundStartTime[gameID] + roundTimeLimit,
            "Cannot submit answers. Round time limit has passed."
        );
        bytes32 inputHash = keccak256(
            abi.encode(questionAnswer, crowdAnswer, secretPhrase)
        );
        hashedAnswer[gameID][player] = inputHash;
        totalResponses[gameID]++;
        if (totalResponses[gameID] >= GAME_CONTROLLER.getPlayerCount(gameID)) {
            updatePhase(gameID);
        }
    }

    // reveal answers / first gets most points
    function revealAnswers(
        string memory questionAnswer,
        string memory crowdAnswer,
        string memory secretPhrase,
        uint256 gameID
    ) public {
        address player = tx.origin;
        require(playerIsInHub(gameID, player), "Player is not in this hub");
        require(phase[gameID] == GamePhase.Reveal, "Game not in reveal phase");
        require(
            !answersRevealed[gameID][player],
            "Player already revealed answers"
        );

        // These must be the exact same values as sent to submit answers or play is not valid
        bytes32 hashedReveal = keccak256(
            abi.encode(questionAnswer, crowdAnswer, secretPhrase)
        );
        bool hashesMatch = hashedAnswer[gameID][player] == hashedReveal;

        uint256 cIndex = indexOfResponse(gameID, crowdAnswer);
        if (cIndex < 4) {
            responseScores[gameID][cIndex] += 1;
            answersRevealed[gameID][player] = true;
            if (hashesMatch) {
                roundWinner[gameID][player] = true;

                uint256 currentRevealPoints = revealPoints[gameID];
                SCORE_KEEPER.increaseScore(currentRevealPoints, gameID, player);
                revealPoints[gameID] = currentRevealPoints > 0
                    ? currentRevealPoints - 1
                    : 0;
            }
        }

        totalReveals[gameID]++;
        if (totalReveals[gameID] >= GAME_CONTROLLER.getPlayerCount(gameID)) {
            updatePhase(gameID);
        }
    }

    // Public functions
    function needsUpdate(uint256 gameID) public view returns (bool) {
        if (
            (phase[gameID] == GamePhase.Question &&
                block.timestamp >= (roundStartTime[gameID] + roundTimeLimit)) ||
            (phase[gameID] == GamePhase.Reveal &&
                block.timestamp >=
                (revealStartTime[gameID] + roundTimeLimit)) ||
            (totalResponses[gameID] >=
                GAME_CONTROLLER.getPlayerCount(gameID)) ||
            (totalReveals[gameID] >= GAME_CONTROLLER.getPlayerCount(gameID))
        ) {
            return true;
        } else {
            return false;
        }
    }

    function updatePhase(uint256 gameID) public {
        if (phase[gameID] == GamePhase.Question) {
            if (
                block.timestamp >= (roundStartTime[gameID] + roundTimeLimit) ||
                totalResponses[gameID] >= GAME_CONTROLLER.getPlayerCount(gameID)
            ) {
                revealStartTime[gameID] = block.timestamp;
                phase[gameID] = GamePhase.Reveal;
                GAME_CONTROLLER.revealStart(
                    hubName,
                    block.timestamp,
                    gameID,
                    GAME_CONTROLLER.getRailcarID(gameID)
                );
            }
        } else if (phase[gameID] == GamePhase.Reveal) {
            if (
                block.timestamp >= (revealStartTime[gameID] + roundTimeLimit) ||
                totalReveals[gameID] >= GAME_CONTROLLER.getPlayerCount(gameID)
            ) {
                phase[gameID] = GamePhase.Completed;
                GAME_CONTROLLER.roundEnd(
                    hubName,
                    block.timestamp,
                    gameID,
                    GAME_CONTROLLER.getRailcarID(gameID)
                );
            }
        }
    }

    // Admin functions

    function setQuestionsAddress(address questionsAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        QUESTIONS = Questions(questionsAddress);
    }

    // Internal
    function _groupDidEnter(uint256 railcarID) internal override {
        super._groupDidEnter(railcarID);
        // TODO:request randomness to use for question
        // Testing with timestamp as faux random
        startNewRound(railcarID, block.timestamp);
    }

    // on randomness delivered...
    function startNewRound(uint256 railcarID, uint256 randomSeed) internal {
        // TODO: use actual randomness, pass any value for testing
        uint256 gameID = RAIL_YARD.getRailcarIntStorage(railcarID)[0]; // get from railcar
        revealPoints[gameID] = maxPointsPerRound;
        string memory q;
        string[4] memory r;
        (q, r) = QUESTIONS.getQuestionWithSeed(randomSeed);
        question[gameID] = q;
        responses[gameID] = r;
        roundStartTime[gameID] = block.timestamp;
        phase[gameID] = GamePhase.Question;
        railcar[gameID] = railcarID;
        GAME_CONTROLLER.roundStart(hubName, block.timestamp, gameID, railcarID);
    }

    function exitPlayersToNextRound() internal {
        // _sendGroupToHub(uint256 railcarID, string memory hubName);
    }

    function playerIsInHub(uint256 gameID, address playerAddress)
        internal
        view
        returns (bool)
    {
        return RAIL_YARD.isMember(railcar[gameID], playerAddress);
    }

    function indexOfResponse(uint256 gameID, string memory response)
        internal
        view
        returns (uint256 index)
    {
        index = 4; // this is returned if nothing matches
        if (!stringsMatch(response, "")) {
            if (stringsMatch(response, responses[gameID][0])) {
                index = 0;
            } else if (stringsMatch(response, responses[gameID][1])) {
                index = 1;
            } else if (stringsMatch(response, responses[gameID][2])) {
                index = 2;
            } else if (stringsMatch(response, responses[gameID][3])) {
                index = 3;
            }
        }
    }

    function stringsMatch(string memory s1, string memory s2)
        internal
        pure
        returns (bool)
    {
        return keccak256(abi.encode(s1)) == keccak256(abi.encode(s2));
    }
}
