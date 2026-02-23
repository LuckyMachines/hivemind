// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {HubRegistry} from "transit/HubRegistry.sol";
import {HjivemindRailcar} from "../src/transit/HjivemindRailcar.sol";
import {Questions} from "../src/Questions.sol";
import {ScoreKeeper} from "../src/ScoreKeeper.sol";
import {Lobby} from "../src/Lobby.sol";
import {GameController} from "../src/GameController.sol";
import {GameRound} from "../src/GameRound.sol";
import {Winners} from "../src/Winners.sol";
import {HjivemindKeeper} from "../src/HjivemindKeeper.sol";

/// @title DeployLocal - Deploys, wires, and connects the full Hjivemind suite on a local anvil node
/// @notice Run `node script/csv-to-json.js` first to generate questions/questions.json from CSVs
/// @dev Set VRF_SOURCE=1 to use AutoLoop VRF instead of Chainlink VRF mock
contract DeployLocal is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);

        // VRF source: 0 = Chainlink mock (default), 1 = AutoLoop
        uint256 vrfSourceEnv = vm.envOr("VRF_SOURCE", uint256(0));
        bool useAutoLoop = vrfSourceEnv == 1;

        // Load questions from JSON
        string memory qJson = vm.readFile("questions/questions.json");

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Infrastructure ───────────────────────────────────
        HubRegistry registry = new HubRegistry(admin);
        console.log("HubRegistry:", address(registry));

        HjivemindRailcar railcar = new HjivemindRailcar(admin);
        console.log("HjivemindRailcar:", address(railcar));

        // VRF Coordinator: real mock for Chainlink, dummy for AutoLoop
        address vrfCoordinatorAddr;
        bytes32 vrfKeyHash;
        uint256 vrfSubId;

        if (useAutoLoop) {
            vrfCoordinatorAddr = address(1);
            vrfKeyHash = bytes32(0);
            vrfSubId = 0;
            console.log("VRF source: AutoLoop (no Chainlink coordinator)");
        } else {
            VRFCoordinatorV2_5Mock vrfCoordinator = new VRFCoordinatorV2_5Mock(
                100000000000000000, 1000000000, 1e18
            );
            vrfSubId = vrfCoordinator.createSubscription();
            vrfCoordinator.fundSubscription(vrfSubId, 10 ether);
            vrfCoordinatorAddr = address(vrfCoordinator);
            vrfKeyHash = keccak256("local-keyhash");
            console.log("VRFCoordinator:", vrfCoordinatorAddr);
            console.log("VRF SubId:", vrfSubId);
        }

        // ── 2. Question Packs (from CSV-derived JSON) ───────────
        (string[] memory q1, string[4][] memory r1) = _loadPack(qJson, "pack1");
        (string[] memory q2, string[4][] memory r2) = _loadPack(qJson, "pack2");
        (string[] memory q3, string[4][] memory r3) = _loadPack(qJson, "pack3");
        (string[] memory q4, string[4][] memory r4) = _loadPack(qJson, "pack4");

        Questions qp1 = new Questions(q1, r1);
        Questions qp2 = new Questions(q2, r2);
        Questions qp3 = new Questions(q3, r3);
        Questions qp4 = new Questions(q4, r4);
        console.log("QP1:", q1.length, "QP2:", q2.length);
        console.log("QP3:", q3.length, "QP4:", q4.length);

        // ── 3. Core ─────────────────────────────────────────────
        ScoreKeeper scoreKeeper = new ScoreKeeper();
        console.log("ScoreKeeper:", address(scoreKeeper));

        // ── 4. Game Contracts ───────────────────────────────────
        Lobby lobby = new Lobby(
            "hjivemind.lobby", address(scoreKeeper), address(railcar),
            "hjivemind.round1", address(registry), admin
        );
        console.log("Lobby:", address(lobby));

        GameController gameController = new GameController(
            address(lobby), address(scoreKeeper), address(railcar), address(registry)
        );
        console.log("GameController:", address(gameController));

        GameRound round1 = new GameRound(
            "hjivemind.round1", "hjivemind.round2",
            address(qp1), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            vrfCoordinatorAddr, vrfKeyHash, vrfSubId
        );

        GameRound round2 = new GameRound(
            "hjivemind.round2", "hjivemind.round3",
            address(qp2), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            vrfCoordinatorAddr, vrfKeyHash, vrfSubId
        );

        GameRound round3 = new GameRound(
            "hjivemind.round3", "hjivemind.round4",
            address(qp3), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            vrfCoordinatorAddr, vrfKeyHash, vrfSubId
        );

        GameRound round4 = new GameRound(
            "hjivemind.round4", "hjivemind.winners",
            address(qp4), address(scoreKeeper), address(gameController),
            address(railcar), address(registry), admin,
            vrfCoordinatorAddr, vrfKeyHash, vrfSubId
        );

        console.log("Round1:", address(round1));
        console.log("Round2:", address(round2));
        console.log("Round3:", address(round3));
        console.log("Round4:", address(round4));

        Winners winners = new Winners(
            "hjivemind.winners", address(scoreKeeper),
            address(gameController), address(registry), admin
        );
        console.log("Winners:", address(winners));

        HjivemindKeeper hjivemindKeeper = new HjivemindKeeper(
            address(lobby), address(round1), address(round2),
            address(round3), address(round4), address(winners)
        );
        console.log("HjivemindKeeper:", address(hjivemindKeeper));

        // ── 4b. VRF Configuration ─────────────────────────────
        if (useAutoLoop) {
            // AutoLoop VRF: configure rounds and keeper
            round1.setVRFSource(GameRound.VRFSource.AutoLoop);
            round2.setVRFSource(GameRound.VRFSource.AutoLoop);
            round3.setVRFSource(GameRound.VRFSource.AutoLoop);
            round4.setVRFSource(GameRound.VRFSource.AutoLoop);
            hjivemindKeeper.setVRFEnabled(true);

            // Register deployer as a VRF controller for local testing
            // In production, this would be the AutoLoop worker address
            hjivemindKeeper.registerControllerKey(
                admin,
                uint256(keccak256("local-pk-x")),
                uint256(keccak256("local-pk-y"))
            );
            console.log("AutoLoop VRF enabled, deployer registered as controller");
        } else {
            // Chainlink VRF: add consumers to subscription
            VRFCoordinatorV2_5Mock(vrfCoordinatorAddr).addConsumer(vrfSubId, address(round1));
            VRFCoordinatorV2_5Mock(vrfCoordinatorAddr).addConsumer(vrfSubId, address(round2));
            VRFCoordinatorV2_5Mock(vrfCoordinatorAddr).addConsumer(vrfSubId, address(round3));
            VRFCoordinatorV2_5Mock(vrfCoordinatorAddr).addConsumer(vrfSubId, address(round4));
            console.log("Chainlink VRF mock configured");
        }

        // ── 5. Connect All ──────────────────────────────────────
        _connectAll(lobby, gameController, hjivemindKeeper, scoreKeeper, railcar,
            round1, round2, round3, round4, winners, qp1, qp2, qp3, qp4, admin);

        // ── 6. Hub Connections ──────────────────────────────────
        _connectHubs(registry, lobby, round1, round2, round3, round4, winners);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        if (useAutoLoop) {
            console.log("VRF Mode: AutoLoop (controller = deployer)");
        } else {
            console.log("VRF Mode: Chainlink (mock coordinator)");
        }
    }

    // ── Question Loading ────────────────────────────────────
    function _loadPack(string memory qJson, string memory packName)
        internal
        pure
        returns (string[] memory questions, string[4][] memory responses)
    {
        string memory qPath = string.concat(".", packName, ".questions");
        questions = abi.decode(vm.parseJson(qJson, qPath), (string[]));

        string memory rPath = string.concat(".", packName, ".responses");
        string[] memory flatResponses = abi.decode(vm.parseJson(qJson, rPath), (string[]));

        responses = new string[4][](questions.length);
        for (uint256 i = 0; i < questions.length; i++) {
            responses[i][0] = flatResponses[i * 4];
            responses[i][1] = flatResponses[i * 4 + 1];
            responses[i][2] = flatResponses[i * 4 + 2];
            responses[i][3] = flatResponses[i * 4 + 3];
        }
    }

    // ── Wiring ──────────────────────────────────────────────
    function _connectAll(
        Lobby lobby, GameController gameController, HjivemindKeeper hjivemindKeeper,
        ScoreKeeper scoreKeeper, HjivemindRailcar railcar,
        GameRound round1, GameRound round2, GameRound round3, GameRound round4,
        Winners winners, Questions qp1, Questions qp2, Questions qp3, Questions qp4,
        address admin
    ) internal {
        lobby.setGameControllerAddress(address(gameController));

        round1.setHjivemindKeeper(address(hjivemindKeeper));
        round2.setHjivemindKeeper(address(hjivemindKeeper));
        round3.setHjivemindKeeper(address(hjivemindKeeper));
        round4.setHjivemindKeeper(address(hjivemindKeeper));

        round1.setQueueType(1);
        round2.setQueueType(2);
        round3.setQueueType(3);
        round4.setQueueType(4);

        qp1.grantGameRoundRole(address(round1));
        qp2.grantGameRoundRole(address(round2));
        qp3.grantGameRoundRole(address(round3));
        qp4.grantGameRoundRole(address(round4));

        scoreKeeper.grantScoreSetterRole(address(lobby));
        scoreKeeper.grantScoreSetterRole(address(round1));
        scoreKeeper.grantScoreSetterRole(address(round2));
        scoreKeeper.grantScoreSetterRole(address(round3));
        scoreKeeper.grantScoreSetterRole(address(round4));
        scoreKeeper.grantScoreSetterRole(address(winners));
        scoreKeeper.grantScoreSetterRole(address(gameController));

        gameController.addEventSender(address(round1));
        gameController.addEventSender(address(round2));
        gameController.addEventSender(address(round3));
        gameController.addEventSender(address(round4));
        gameController.addEventSender(address(winners));

        hjivemindKeeper.addQueueRole(address(lobby));
        hjivemindKeeper.addQueueRole(address(round1));
        hjivemindKeeper.addQueueRole(address(round2));
        hjivemindKeeper.addQueueRole(address(round3));
        hjivemindKeeper.addQueueRole(address(round4));
        hjivemindKeeper.addQueueRole(address(winners));

        round1.addKeeper(admin);
        round1.addKeeper(address(hjivemindKeeper));
        round2.addKeeper(address(hjivemindKeeper));
        round3.addKeeper(address(hjivemindKeeper));
        round4.addKeeper(address(hjivemindKeeper));

        railcar.grantRole(railcar.HUB_ROLE(), address(lobby));
    }

    function _connectHubs(
        HubRegistry registry,
        Lobby lobby, GameRound round1, GameRound round2,
        GameRound round3, GameRound round4, Winners winners
    ) internal {
        uint256 lobbyID = registry.idFromName("hjivemind.lobby");
        uint256 round1ID = registry.idFromName("hjivemind.round1");
        uint256 round2ID = registry.idFromName("hjivemind.round2");
        uint256 round3ID = registry.idFromName("hjivemind.round3");
        uint256 round4ID = registry.idFromName("hjivemind.round4");
        uint256 winnersID = registry.idFromName("hjivemind.winners");

        lobby.setAllowAllInputs(true);
        lobby.setInputAllowed(lobbyID, true);
        round1.setInputAllowed(lobbyID, true);
        round2.setInputAllowed(round1ID, true);
        round3.setInputAllowed(round2ID, true);
        round4.setInputAllowed(round3ID, true);
        winners.setInputAllowed(round4ID, true);

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
}
