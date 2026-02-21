// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Lobby} from "../src/Lobby.sol";
import {GameController} from "../src/GameController.sol";
import {GameRound} from "../src/GameRound.sol";
import {Winners} from "../src/Winners.sol";
import {HivemindKeeper} from "../src/HivemindKeeper.sol";

contract DeployHivemindGame is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        string memory deployedJson = vm.readFile("deployed-contracts.json");
        address hubRegistry = deployedJson.readAddress(".hubRegistry");
        address admin = deployedJson.readAddress(".admin");
        address railcar = deployedJson.readAddress(".railcar");
        address scoreKeeper = deployedJson.readAddress(".scoreKeeper");
        address qp1 = deployedJson.readAddress(".questionPack1");
        address qp2 = deployedJson.readAddress(".questionPack2");
        address qp3 = deployedJson.readAddress(".questionPack3");
        address qp4 = deployedJson.readAddress(".questionPack4");

        // VRF settings from env
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        bytes32 vrfKeyHash = vm.envBytes32("VRF_KEY_HASH");
        uint256 vrfSubscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");

        vm.startBroadcast(deployerPrivateKey);

        Lobby lobby = new Lobby(
            "hivemind.lobby",
            scoreKeeper,
            railcar,
            "hivemind.round1",
            hubRegistry,
            admin
        );
        console.log("Lobby deployed to:", address(lobby));

        GameController gameController = new GameController(
            address(lobby),
            scoreKeeper,
            railcar,
            hubRegistry
        );
        console.log("GameController deployed to:", address(gameController));

        GameRound round1 = new GameRound(
            "hivemind.round1",
            "hivemind.round2",
            qp1,
            scoreKeeper,
            address(gameController),
            railcar,
            hubRegistry,
            admin,
            vrfCoordinator,
            vrfKeyHash,
            vrfSubscriptionId
        );
        console.log("Round1 deployed to:", address(round1));

        GameRound round2 = new GameRound(
            "hivemind.round2",
            "hivemind.round3",
            qp2,
            scoreKeeper,
            address(gameController),
            railcar,
            hubRegistry,
            admin,
            vrfCoordinator,
            vrfKeyHash,
            vrfSubscriptionId
        );
        console.log("Round2 deployed to:", address(round2));

        GameRound round3 = new GameRound(
            "hivemind.round3",
            "hivemind.round4",
            qp3,
            scoreKeeper,
            address(gameController),
            railcar,
            hubRegistry,
            admin,
            vrfCoordinator,
            vrfKeyHash,
            vrfSubscriptionId
        );
        console.log("Round3 deployed to:", address(round3));

        GameRound round4 = new GameRound(
            "hivemind.round4",
            "hivemind.winners",
            qp4,
            scoreKeeper,
            address(gameController),
            railcar,
            hubRegistry,
            admin,
            vrfCoordinator,
            vrfKeyHash,
            vrfSubscriptionId
        );
        console.log("Round4 deployed to:", address(round4));

        Winners winners = new Winners(
            "hivemind.winners",
            scoreKeeper,
            address(gameController),
            hubRegistry,
            admin
        );
        console.log("Winners deployed to:", address(winners));

        HivemindKeeper hivemindKeeper = new HivemindKeeper(
            address(lobby),
            address(round1),
            address(round2),
            address(round3),
            address(round4),
            address(winners)
        );
        console.log("HivemindKeeper deployed to:", address(hivemindKeeper));

        vm.stopBroadcast();

        // Update deployed addresses
        string memory json = "deployments";
        json.serialize("hubRegistry", hubRegistry);
        json.serialize("admin", admin);
        json.serialize("railcar", railcar);
        json.serialize("scoreKeeper", scoreKeeper);
        json.serialize("questionPack1", qp1);
        json.serialize("questionPack2", qp2);
        json.serialize("questionPack3", qp3);
        json.serialize("questionPack4", qp4);
        json.serialize("gameController", address(gameController));
        json.serialize("hivemindKeeper", address(hivemindKeeper));
        json.serialize("lobby", address(lobby));
        json.serialize("round1", address(round1));
        json.serialize("round2", address(round2));
        json.serialize("round3", address(round3));
        json.serialize("round4", address(round4));
        string memory finalJson = json.serialize("winners", address(winners));
        vm.writeFile("deployed-contracts.json", finalJson);
        console.log("Saved to deployed-contracts.json");
    }
}
