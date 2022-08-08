// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@luckymachines/railway/contracts/HubRegistry.sol";
import "./Lobby.sol";
import "./GameRound.sol";

contract GameController is AccessControlEnumerable {
    Lobby internal LOBBY;
    HubRegistry internal HUB_REGISTRY;

    bytes32 public EVENT_SENDER_ROLE = keccak256("EVENT_SENDER_ROLE");

    event RoundStart(
        string hubAlias,
        uint256 startTime,
        uint256 gameID,
        uint256 groupID
    );

    constructor(address lobbyAddress, address HubRegistryAddress) {
        LOBBY = Lobby(lobbyAddress);
        HUB_REGISTRY = HubRegistry(HubRegistryAddress);
    }

    // Player Interactions
    function joinGame() public {
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

    // Event triggers
    function roundStart(
        string memory hubAlias,
        uint256 timestamp,
        uint256 gameID,
        uint256 railcarID
    ) external onlyRole(EVENT_SENDER_ROLE) {
        emit RoundStart(hubAlias, timestamp, gameID, railcarID);
    }

    // Admin functions
    function addEventSender(address eventSenderAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(EVENT_SENDER_ROLE, eventSenderAddress);
    }
}

// trigger events from other contracts
// submit moves from player / forward to appropriate contract
