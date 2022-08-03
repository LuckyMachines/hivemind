// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;
import "@luckymachines/railway/contracts/Hub.sol";
import "./Questions.sol";
import "./ScoreKeeper.sol";
import "hardhat/console.sol";

contract GameRound is Hub {
    string constant hubName;
    string constant nextRoundHub;

    uint256 public roundTimeLimit; // in seconds
    uint256 internal _gameID;

    Questions internal QUESTIONS;
    ScoreKeeper internal SCORE_KEEPER;

    // mapping from game ID
    mapping(uint256 => uint256) internal revealPoints;
    mapping(uint256 => string) internal question;
    mapping(uint256 => string[4]) internal responses;
    mapping(uint256 => uint256) public roundStartTime;
    mapping(uint256 => uint256[4]) public responseScores; // how many people chose each response

    // from game ID => player
    mapping(uint256 => mapping(address => bytes32)) hashedAnswer;
    mapping(uint256 => mapping(address => bool)) public answersRevealed;
    mapping(uint256 => mapping(address => bool)) public roundWinner;

    event RoundStart(uint256 startTime, uint256 gameID, uint256 groupID);

    constructor(
        string memory thisHub,
        string memory nextHub,
        address questionsAddress,
        address scoreKeeperAddress,
        address hubRegistryAddress,
        address hubAdmin
    ) Hub(hubRegistryAddress, hubAdmin) {
        uint256 hubID = REGISTRY.idFromAddress(address(this));
        REGISTRY.setName(thisHub, hubID);
        hubName = thisHub;
        nextRoundHub = nextHub;
        QUESTIONS = Questions(questionsAddress);
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
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
    ) {
        require(
            block.timestamp < roundStartTime[gameID] + roundTimeLimit,
            "Cannot submit answers. Round time limit has passed."
        );
        bytes32 inputHash = keccak256(
            abi.encode(questionAnswer, crowdAnswer, secretPhrase)
        );
        hashedAnswer[gameID][tx.origin] = inputHash;
    }

    // reveal answers / first gets most points
    function revealAnswers(
        string memory questionAnswer,
        string memory crowdAnswer,
        string memory secretPhrase,
        uint256 gameID
    ) {
        require(!answersRevealed[player], "Player already revealed answers");
        // These must be the exact same values as sent to submit answers or play is not valid
        bytes32 hashedReveal = keccak256(
            abi.encode(questionAnswer, crowdAnswer, secretPhrase)
        );
        address player = tx.origin;
        bool hashesMatch = hashedAnswer[gameID][player] == hashedReveal;

        uint256 cIndex = indexOfResponse(gameID, crowdAnswer);
        if (cIndex < 4) {
            responseScores[gameID][cIndex] += 1;
            answersRevealed[player] = true;
            if (hashesMatch) {
                roundWinner[gameID][player] = true;

                uint256 currentRevealPoints = revealPoints[gameID];
                SCORE_KEEPER.increaseScore(
                    currentRevealPoints,
                    gameID,
                    playerAddress
                );
                revealPoints[gameID] = currentRevealPoints > 0
                    ? currentRevealPoints - 1
                    : 0;
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
    function _groupDidEnter(uint256 railcarID) internal {
        super._groupDidEnter(railcarID);
        // request randomness to use for question
    }

    // on randomness delivered...
    function startNewRound(uint256 railcarID, uint256 randomSeed) internal {
        // TODO: use actual randomness, pass any value for testing
        _gameID++;
        revealPoints[_gameID] = 10000;
        string memory q;
        string[4] memory r;
        (q, r) = QUESTIONS.getQuestionWithSeed(randomSeed);
        question[_gameID] = q;
        responses[_gameID] = r;
        emit RoundStart(block.timestamp, _gameID, railcarID);
    }

    function exitWinnersToNextRound() internal {
        // _sendGroupToHub(uint256 railcarID, string memory hubName);
    }

    function indexOfResponse(uint256 gameID, string memory response)
        internal
        returns (uint256 index)
    {
        index = 4; // this is returned if nothing matches
        if (abi.encode(response) == abi.encode(responses[gameID][0])) {
            index = 0;
        } else if (abi.encode(response) == abi.encode(responses[gameID][1])) {
            index = 1;
        } else if (abi.encode(response) == abi.encode(responses[gameID][2])) {
            index = 2;
        } else if (abi.encode(response) == abi.encode(responses[gameID][3])) {
            index = 3;
        }
    }
}