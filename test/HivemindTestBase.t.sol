// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Test, console} from "forge-std/Test.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {HubRegistry} from "transit/HubRegistry.sol";
import {HivemindRailcar} from "../src/transit/HivemindRailcar.sol";
import {Questions} from "../src/Questions.sol";
import {ScoreKeeper} from "../src/ScoreKeeper.sol";
import {Lobby} from "../src/Lobby.sol";
import {GameController} from "../src/GameController.sol";
import {GameRound} from "../src/GameRound.sol";
import {Winners} from "../src/Winners.sol";
import {HivemindKeeper} from "../src/HivemindKeeper.sol";

/// @title HivemindTestBase - Deploys and wires the full Hivemind contract suite
abstract contract HivemindTestBase is Test {
    // Accounts
    address admin;
    address player1;
    address player2;
    address player3;
    address player4;

    // Transit infra
    HubRegistry registry;
    HivemindRailcar railcar;

    // VRF
    VRFCoordinatorV2_5Mock vrfCoordinator;
    uint256 vrfSubId;
    bytes32 vrfKeyHash = keccak256("test-keyhash");

    // Hivemind contracts
    Questions qp1;
    Questions qp2;
    Questions qp3;
    Questions qp4;
    ScoreKeeper scoreKeeper;
    Lobby lobby;
    GameController gameController;
    GameRound round1;
    GameRound round2;
    GameRound round3;
    GameRound round4;
    Winners winners;
    HivemindKeeper hivemindKeeper;

    function setUp() public virtual {
        admin = address(this);
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");
        player3 = makeAddr("player3");
        player4 = makeAddr("player4");

        // Fund players
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(player3, 10 ether);
        vm.deal(player4, 10 ether);

        _deployInfra();
        _deployQuestions();
        _deployCore();
        _deployGame();
        _connectAll();
        _connectHubs();
    }

    function _deployInfra() internal {
        // Hub Registry
        registry = new HubRegistry(admin);

        // Railcar
        railcar = new HivemindRailcar(admin);

        // VRF Coordinator Mock
        vrfCoordinator = new VRFCoordinatorV2_5Mock(
            100000000000000000, // base fee
            1000000000,         // gas price
            1e18                // wei per unit link
        );
        vrfSubId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(vrfSubId, 10 ether);
    }

    function _deployQuestions() internal {
        // Question Pack 1
        string[] memory q1 = new string[](3);
        q1[0] = "Which direction?";
        q1[1] = "Favorite season?";
        q1[2] = "Best pizza size?";
        string[4][] memory r1 = new string[4][](3);
        r1[0] = ["North", "South", "East", "West"];
        r1[1] = ["Spring", "Summer", "Fall", "Winter"];
        r1[2] = ["Small", "Medium", "Large", "XL"];
        qp1 = new Questions(q1, r1);

        // Question Pack 2
        string[] memory q2 = new string[](2);
        q2[0] = "Cats or dogs?";
        q2[1] = "Coffee or tea?";
        string[4][] memory r2 = new string[4][](2);
        r2[0] = ["Cats", "Dogs", "", ""];
        r2[1] = ["Coffee", "Tea", "", ""];
        qp2 = new Questions(q2, r2);

        // Question Pack 3
        string[] memory q3 = new string[](2);
        q3[0] = "When life gives you lemons...";
        q3[1] = "A penny saved is...";
        string[4][] memory r3 = new string[4][](2);
        r3[0] = ["make lemonade", "make juice", "throw them", "eat them"];
        r3[1] = ["a penny earned", "not much", "smart", "boring"];
        qp3 = new Questions(q3, r3);

        // Question Pack 4
        string[] memory q4 = new string[](3);
        q4[0] = "Favorite color?";
        q4[1] = "Best number?";
        q4[2] = "Preferred weather?";
        string[4][] memory r4 = new string[4][](3);
        r4[0] = ["Red", "Blue", "Green", "Yellow"];
        r4[1] = ["7", "13", "42", "100"];
        r4[2] = ["Sunny", "Rainy", "Snowy", "Cloudy"];
        qp4 = new Questions(q4, r4);
    }

    function _deployCore() internal {
        scoreKeeper = new ScoreKeeper();
    }

    function _deployGame() internal {
        lobby = new Lobby(
            "hivemind.lobby",
            address(scoreKeeper),
            address(railcar),
            "hivemind.round1",
            address(registry),
            admin
        );

        gameController = new GameController(
            address(lobby),
            address(scoreKeeper),
            address(railcar),
            address(registry)
        );

        round1 = new GameRound(
            "hivemind.round1", "hivemind.round2",
            address(qp1), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            address(vrfCoordinator), vrfKeyHash, vrfSubId
        );

        round2 = new GameRound(
            "hivemind.round2", "hivemind.round3",
            address(qp2), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            address(vrfCoordinator), vrfKeyHash, vrfSubId
        );

        round3 = new GameRound(
            "hivemind.round3", "hivemind.round4",
            address(qp3), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            address(vrfCoordinator), vrfKeyHash, vrfSubId
        );

        round4 = new GameRound(
            "hivemind.round4", "hivemind.winners",
            address(qp4), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            address(vrfCoordinator), vrfKeyHash, vrfSubId
        );

        winners = new Winners(
            "hivemind.winners",
            address(scoreKeeper),
            address(gameController),
            address(registry),
            admin
        );

        hivemindKeeper = new HivemindKeeper(
            address(lobby), address(round1), address(round2),
            address(round3), address(round4), address(winners)
        );

        // Add consumers to VRF subscription
        vrfCoordinator.addConsumer(vrfSubId, address(round1));
        vrfCoordinator.addConsumer(vrfSubId, address(round2));
        vrfCoordinator.addConsumer(vrfSubId, address(round3));
        vrfCoordinator.addConsumer(vrfSubId, address(round4));
    }

    function _connectAll() internal {
        // Lobby → GameController
        lobby.setGameControllerAddress(address(gameController));

        // Keeper on rounds
        round1.setHivemindKeeper(address(hivemindKeeper));
        round2.setHivemindKeeper(address(hivemindKeeper));
        round3.setHivemindKeeper(address(hivemindKeeper));
        round4.setHivemindKeeper(address(hivemindKeeper));

        // Queue types
        round1.setQueueType(1);
        round2.setQueueType(2);
        round3.setQueueType(3);
        round4.setQueueType(4);

        // Question pack → round roles
        qp1.grantGameRoundRole(address(round1));
        qp2.grantGameRoundRole(address(round2));
        qp3.grantGameRoundRole(address(round3));
        qp4.grantGameRoundRole(address(round4));

        // Score setter roles
        scoreKeeper.grantScoreSetterRole(address(lobby));
        scoreKeeper.grantScoreSetterRole(address(round1));
        scoreKeeper.grantScoreSetterRole(address(round2));
        scoreKeeper.grantScoreSetterRole(address(round3));
        scoreKeeper.grantScoreSetterRole(address(round4));
        scoreKeeper.grantScoreSetterRole(address(winners));
        scoreKeeper.grantScoreSetterRole(address(gameController));

        // Event sender roles
        gameController.addEventSender(address(round1));
        gameController.addEventSender(address(round2));
        gameController.addEventSender(address(round3));
        gameController.addEventSender(address(round4));
        gameController.addEventSender(address(winners));

        // Queue roles
        hivemindKeeper.addQueueRole(address(lobby));
        hivemindKeeper.addQueueRole(address(round1));
        hivemindKeeper.addQueueRole(address(round2));
        hivemindKeeper.addQueueRole(address(round3));
        hivemindKeeper.addQueueRole(address(round4));
        hivemindKeeper.addQueueRole(address(winners));

        // Keeper roles on rounds
        round1.addKeeper(admin);
        round1.addKeeper(address(hivemindKeeper));
        round2.addKeeper(address(hivemindKeeper));
        round3.addKeeper(address(hivemindKeeper));
        round4.addKeeper(address(hivemindKeeper));

        // Railcar HUB_ROLE for Lobby
        railcar.grantRole(railcar.HUB_ROLE(), address(lobby));
    }

    function _connectHubs() internal {
        uint256 lobbyID = registry.idFromName("hivemind.lobby");
        uint256 round1ID = registry.idFromName("hivemind.round1");
        uint256 round2ID = registry.idFromName("hivemind.round2");
        uint256 round3ID = registry.idFromName("hivemind.round3");
        uint256 round4ID = registry.idFromName("hivemind.round4");
        uint256 winnersID = registry.idFromName("hivemind.winners");

        // Input permissions
        lobby.setAllowAllInputs(true);
        lobby.setInputAllowed(lobbyID, true);
        round1.setInputAllowed(lobbyID, true);
        round2.setInputAllowed(round1ID, true);
        round3.setInputAllowed(round2ID, true);
        round4.setInputAllowed(round3ID, true);
        winners.setInputAllowed(round4ID, true);

        // Hub connections
        uint256[] memory outputs = new uint256[](1);

        outputs[0] = round1ID;
        lobby.addHubConnections(outputs);

        outputs = new uint256[](2);
        outputs[0] = round2ID;
        outputs[1] = lobbyID;
        round1.addHubConnections(outputs);

        outputs[0] = round3ID;
        outputs[1] = lobbyID;
        round2.addHubConnections(outputs);

        outputs[0] = round4ID;
        outputs[1] = lobbyID;
        round3.addHubConnections(outputs);

        outputs[0] = winnersID;
        outputs[1] = lobbyID;
        round4.addHubConnections(outputs);

        outputs = new uint256[](1);
        outputs[0] = lobbyID;
        winners.addHubConnections(outputs);
    }

    // ── Helper: have players join and start a game ─────────────
    // Note: Lobby uses tx.origin, so we set both msg.sender and tx.origin
    function _joinPlayers(uint256 numPlayers) internal {
        if (numPlayers >= 1) {
            vm.prank(player1, player1);
            lobby.joinGame();
        }
        if (numPlayers >= 2) {
            vm.prank(player2, player2);
            lobby.joinGame();
        }
        if (numPlayers >= 3) {
            vm.prank(player3, player3);
            lobby.joinGame();
        }
        if (numPlayers >= 4) {
            vm.prank(player4, player4);
            lobby.joinGame();
        }
    }

    function _startGameAndFulfillVRF() internal {
        // Warp past join time limit
        vm.warp(block.timestamp + lobby.timeLimitToJoin() + 1);
        lobby.startGame();

        // Fulfill VRF for round 1
        vrfCoordinator.fulfillRandomWords(1, address(round1));
    }
}
