// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Lobby} from "../src/Lobby.sol";
import {GameController} from "../src/GameController.sol";
import {GameRound} from "../src/GameRound.sol";
import {Winners} from "../src/Winners.sol";
import {HjivemindKeeper} from "../src/HjivemindKeeper.sol";
import {Questions} from "../src/Questions.sol";
import {ScoreKeeper} from "../src/ScoreKeeper.sol";
import {HjivemindRailcar} from "../src/transit/HjivemindRailcar.sol";

contract ConnectHjivemind is Script {
    using stdJson for string;

    struct Addresses {
        address lobby;
        address gameController;
        address hjivemindKeeper;
        address qp1;
        address qp2;
        address qp3;
        address qp4;
        address round1;
        address round2;
        address round3;
        address round4;
        address scoreKeeper;
        address winners;
        address railcar;
        address admin;
    }

    function _loadAddresses() internal view returns (Addresses memory a) {
        string memory d = vm.readFile("deployed-contracts.json");
        a.lobby = d.readAddress(".lobby");
        a.gameController = d.readAddress(".gameController");
        a.hjivemindKeeper = d.readAddress(".hjivemindKeeper");
        a.qp1 = d.readAddress(".questionPack1");
        a.qp2 = d.readAddress(".questionPack2");
        a.qp3 = d.readAddress(".questionPack3");
        a.qp4 = d.readAddress(".questionPack4");
        a.round1 = d.readAddress(".round1");
        a.round2 = d.readAddress(".round2");
        a.round3 = d.readAddress(".round3");
        a.round4 = d.readAddress(".round4");
        a.scoreKeeper = d.readAddress(".scoreKeeper");
        a.winners = d.readAddress(".winners");
        a.railcar = d.readAddress(".railcar");
        a.admin = d.readAddress(".admin");
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        Addresses memory a = _loadAddresses();

        vm.startBroadcast(deployerPrivateKey);

        // Set game controller on Lobby
        Lobby(a.lobby).setGameControllerAddress(a.gameController);

        // Set keeper address on Rounds
        GameRound(a.round1).setHjivemindKeeper(a.hjivemindKeeper);
        GameRound(a.round2).setHjivemindKeeper(a.hjivemindKeeper);
        GameRound(a.round3).setHjivemindKeeper(a.hjivemindKeeper);
        GameRound(a.round4).setHjivemindKeeper(a.hjivemindKeeper);

        // Set queue types on Rounds
        GameRound(a.round1).setQueueType(1);
        GameRound(a.round2).setQueueType(2);
        GameRound(a.round3).setQueueType(3);
        GameRound(a.round4).setQueueType(4);

        // Grant game round roles on question packs
        Questions(a.qp1).grantGameRoundRole(a.round1);
        Questions(a.qp2).grantGameRoundRole(a.round2);
        Questions(a.qp3).grantGameRoundRole(a.round3);
        Questions(a.qp4).grantGameRoundRole(a.round4);

        // Authorize score setters
        _grantScoreSetterRoles(a);

        // Add event senders
        GameController gc = GameController(a.gameController);
        gc.addEventSender(a.round1);
        gc.addEventSender(a.round2);
        gc.addEventSender(a.round3);
        gc.addEventSender(a.round4);
        gc.addEventSender(a.winners);

        // Add queue roles
        _grantQueueRoles(a);

        // Set keeper roles on rounds
        GameRound(a.round1).addKeeper(a.admin);
        GameRound(a.round1).addKeeper(a.hjivemindKeeper);
        GameRound(a.round2).addKeeper(a.hjivemindKeeper);
        GameRound(a.round3).addKeeper(a.hjivemindKeeper);
        GameRound(a.round4).addKeeper(a.hjivemindKeeper);

        // Grant HUB_ROLE on Railcar to Lobby (so Lobby can addMember/createRailcar)
        HjivemindRailcar rc = HjivemindRailcar(a.railcar);
        rc.grantRole(rc.HUB_ROLE(), a.lobby);

        vm.stopBroadcast();
        console.log("All connections established!");
    }

    function _grantScoreSetterRoles(Addresses memory a) internal {
        ScoreKeeper sk = ScoreKeeper(a.scoreKeeper);
        sk.grantScoreSetterRole(a.lobby);
        sk.grantScoreSetterRole(a.round1);
        sk.grantScoreSetterRole(a.round2);
        sk.grantScoreSetterRole(a.round3);
        sk.grantScoreSetterRole(a.round4);
        sk.grantScoreSetterRole(a.winners);
        sk.grantScoreSetterRole(a.gameController);
    }

    function _grantQueueRoles(Addresses memory a) internal {
        HjivemindKeeper hk = HjivemindKeeper(a.hjivemindKeeper);
        hk.addQueueRole(a.lobby);
        hk.addQueueRole(a.round1);
        hk.addQueueRole(a.round2);
        hk.addQueueRole(a.round3);
        hk.addQueueRole(a.round4);
        hk.addQueueRole(a.winners);
    }
}
