// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@luckymachines/railway/contracts/HubRegistry.sol";
import "@luckymachines/railway/contracts/RailYard.sol";
import "./Lobby.sol";
import "./GameRound.sol";
import "./ScoreKeeper.sol";
import "./Winners.sol";

contract GameController is AccessControlEnumerable {
    Lobby internal LOBBY;
    ScoreKeeper internal SCORE_KEEPER;
    HubRegistry internal HUB_REGISTRY;
    RailYard internal RAIL_YARD;

    bytes32 public EVENT_SENDER_ROLE = keccak256("EVENT_SENDER_ROLE");

    event RoundStart(
        string hubAlias,
        uint256 startTime,
        uint256 gameID,
        uint256 groupID
    );

    event RevealStart(
        string hubAlias,
        uint256 startTime,
        uint256 gameID,
        uint256 groupID
    );

    event RoundEnd(
        string hubAlias,
        uint256 timestamp,
        uint256 gameID,
        uint256 groupID
    );

    event EnterWinners(uint256 timestamp, uint256 gameID, uint256 groupID);

    constructor(
        address lobbyAddress,
        address scoreKeeperAddress,
        address railYardAddress,
        address HubRegistryAddress
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        LOBBY = Lobby(lobbyAddress);
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
        RAIL_YARD = RailYard(railYardAddress);
        HUB_REGISTRY = HubRegistry(HubRegistryAddress);
    }

    // Player Interactions
    function joinGame() public payable {
        LOBBY.joinGame();
    }

    function submitAnswers(
        string memory questionAnswer,
        string memory crowdAnswer,
        string memory secretPhrase,
        uint256 gameID,
        string memory hubAlias
    ) public {
        GameRound(HUB_REGISTRY.addressFromName(hubAlias)).submitAnswers(
            questionAnswer,
            crowdAnswer,
            secretPhrase,
            gameID
        );
    }

    function revealAnswers(
        string memory questionAnswer,
        string memory crowdAnswer,
        string memory secretPhrase,
        uint256 gameID,
        string memory hubAlias
    ) public {
        GameRound(HUB_REGISTRY.addressFromName(hubAlias)).revealAnswers(
            questionAnswer,
            crowdAnswer,
            secretPhrase,
            gameID
        );
    }

    // Game Summary Functions
    // Player specific functions
    // called directly by player or by passing player address as last argument
    function getScore(uint256 gameID)
        public
        view
        returns (uint256 playerScore)
    {
        playerScore = SCORE_KEEPER.playerScore(gameID, _msgSender());
    }

    function getScore(uint256 gameID, address playerAddress)
        public
        view
        returns (uint256 playerScore)
    {
        playerScore = SCORE_KEEPER.playerScore(gameID, playerAddress);
    }

    function getIsInActiveGame() public view returns (bool inActiveGame) {
        inActiveGame = SCORE_KEEPER.playerInActiveGame(_msgSender());
    }

    function getIsInActiveGame(address playerAddress)
        public
        view
        returns (bool inActiveGame)
    {
        inActiveGame = SCORE_KEEPER.playerInActiveGame(playerAddress);
    }

    function getCurrentGame() public view returns (uint256 gameID) {
        gameID = SCORE_KEEPER.currentGameID(_msgSender());
    }

    function getCurrentGame(address playerAddress)
        public
        view
        returns (uint256 gameID)
    {
        gameID = SCORE_KEEPER.currentGameID(playerAddress);
    }

    function getCurrentGame(uint256 railcarID)
        public
        view
        returns (uint256 gameID)
    {
        gameID = SCORE_KEEPER.gameIDFromRailcar(railcarID);
    }

    function getFinalRanking(uint256 gameID)
        public
        view
        returns (uint256 rank)
    {
        rank = Winners(HUB_REGISTRY.addressFromName("hivemind.winners"))
            .getFinalRank(gameID, _msgSender());
    }

    function getFinalRanking(uint256 gameID, address playerAddress)
        public
        view
        returns (uint256 rank)
    {
        rank = Winners(HUB_REGISTRY.addressFromName("hivemind.winners"))
            .getFinalRank(gameID, playerAddress);
    }

    // Game specific functions
    function getPlayerCount(uint256 gameID)
        public
        view
        returns (uint256 playerCount)
    {
        playerCount = LOBBY.playerCount(gameID);
    }

    function getLatestRound(uint256 gameID)
        public
        view
        returns (string memory hubAlias)
    {
        hubAlias = SCORE_KEEPER.latestRound(gameID);
    }

    function getRailcarID(uint256 gameID)
        public
        view
        returns (uint256 railcarID)
    {
        railcarID = LOBBY.railcarID(gameID);
    }

    function getRailcarMembers(uint256 railcarID)
        public
        view
        returns (address[] memory members)
    {
        members = RAIL_YARD.getRailcarMembers(railcarID);
    }

    function getQuestion(string memory hubAlias, uint256 gameID)
        public
        view
        returns (string memory q, string[4] memory choices)
    {
        return
            GameRound(HUB_REGISTRY.addressFromName(hubAlias)).getQuestion(
                gameID
            );
    }

    function getPlayerGuess(
        string memory hubAlias,
        uint256 gameID,
        address playerAddress
    ) public view returns (uint256 guessIndex) {
        guessIndex = GameRound(HUB_REGISTRY.addressFromName(hubAlias))
            .revealedIndex(gameID, playerAddress);
    }

    function getResponseScores(string memory hubAlias, uint256 gameID)
        public
        view
        returns (uint256[4] memory responseScores)
    {
        responseScores = GameRound(HUB_REGISTRY.addressFromName(hubAlias))
            .getResponseScores(gameID);
    }

    function getWinningIndex(string memory hubAlias, uint256 gameID)
        public
        view
        returns (uint256[] memory winningIndex)
    {
        winningIndex = GameRound(HUB_REGISTRY.addressFromName(hubAlias))
            .getWinningChoiceIndex(gameID);
    }

    // Event triggers
    function roundStart(
        string memory hubAlias,
        uint256 timestamp,
        uint256 gameID,
        uint256 railcarID
    ) external onlyRole(EVENT_SENDER_ROLE) {
        emit RoundStart(hubAlias, timestamp, gameID, railcarID);
    }

    function revealStart(
        string memory hubAlias,
        uint256 timestamp,
        uint256 gameID,
        uint256 railcarID
    ) external onlyRole(EVENT_SENDER_ROLE) {
        emit RevealStart(hubAlias, timestamp, gameID, railcarID);
    }

    function roundEnd(
        string memory hubAlias,
        uint256 timestamp,
        uint256 gameID,
        uint256 railcarID
    ) external onlyRole(EVENT_SENDER_ROLE) {
        emit RoundEnd(hubAlias, timestamp, gameID, railcarID);
    }

    function enterWinners(
        uint256 timestamp,
        uint256 gameID,
        uint256 railcarID
    ) external onlyRole(EVENT_SENDER_ROLE) {
        emit EnterWinners(timestamp, gameID, railcarID);
    }

    // Admin functions
    function addEventSender(address eventSenderAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(EVENT_SENDER_ROLE, eventSenderAddress);
    }

    // set railcar operator to current hub at each entry
    // move railcar to next hub?
}
