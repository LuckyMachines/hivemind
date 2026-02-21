// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Lobby} from "../src/Lobby.sol";
import {GameRound} from "../src/GameRound.sol";
import {Winners} from "../src/Winners.sol";
import {HubRegistry} from "transit/HubRegistry.sol";

contract RailwayConnections is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        string memory deployedJson = vm.readFile("deployed-contracts.json");

        Lobby lobby = Lobby(deployedJson.readAddress(".lobby"));
        GameRound round1 = GameRound(deployedJson.readAddress(".round1"));
        GameRound round2 = GameRound(deployedJson.readAddress(".round2"));
        GameRound round3 = GameRound(deployedJson.readAddress(".round3"));
        GameRound round4 = GameRound(deployedJson.readAddress(".round4"));
        Winners winners = Winners(payable(deployedJson.readAddress(".winners")));
        HubRegistry registry = HubRegistry(deployedJson.readAddress(".hubRegistry"));

        vm.startBroadcast(deployerPrivateKey);

        // Get hub IDs
        console.log("Getting hub IDs...");
        uint256 lobbyID = registry.idFromName("hivemind.lobby");
        uint256 round1ID = registry.idFromName("hivemind.round1");
        uint256 round2ID = registry.idFromName("hivemind.round2");
        uint256 round3ID = registry.idFromName("hivemind.round3");
        uint256 round4ID = registry.idFromName("hivemind.round4");
        uint256 winnersID = registry.idFromName("hivemind.winners");

        // Open connections to hubs
        console.log("Opening input permissions...");
        lobby.setAllowAllInputs(true);
        lobby.setInputAllowed(lobbyID, true);
        round1.setInputAllowed(lobbyID, true);
        round2.setInputAllowed(round1ID, true);
        round3.setInputAllowed(round2ID, true);
        round4.setInputAllowed(round3ID, true);
        winners.setInputAllowed(round4ID, true);

        // Connect hubs
        console.log("Connecting hubs...");
        uint256[] memory lobbyOutputs = new uint256[](1);
        lobbyOutputs[0] = round1ID;
        lobby.addHubConnections(lobbyOutputs);

        uint256[] memory round1Outputs = new uint256[](2);
        round1Outputs[0] = round2ID;
        round1Outputs[1] = lobbyID;
        round1.addHubConnections(round1Outputs);

        uint256[] memory round2Outputs = new uint256[](2);
        round2Outputs[0] = round3ID;
        round2Outputs[1] = lobbyID;
        round2.addHubConnections(round2Outputs);

        uint256[] memory round3Outputs = new uint256[](2);
        round3Outputs[0] = round4ID;
        round3Outputs[1] = lobbyID;
        round3.addHubConnections(round3Outputs);

        uint256[] memory round4Outputs = new uint256[](2);
        round4Outputs[0] = winnersID;
        round4Outputs[1] = lobbyID;
        round4.addHubConnections(round4Outputs);

        uint256[] memory winnersOutputs = new uint256[](1);
        winnersOutputs[0] = lobbyID;
        winners.addHubConnections(winnersOutputs);

        vm.stopBroadcast();
        console.log("All hub connections established!");
    }
}
