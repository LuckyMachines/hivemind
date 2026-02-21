// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Questions} from "../src/Questions.sol";
import {ScoreKeeper} from "../src/ScoreKeeper.sol";

contract DeployHivemindCore is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        string memory deployedJson = vm.readFile("deployed-contracts.json");
        address hubRegistry = deployedJson.readAddress(".hubRegistry");
        address admin = deployedJson.readAddress(".admin");
        address railcar = deployedJson.readAddress(".railcar");

        // Load questions from JSON (pre-processed from CSV)
        // For local deployment, use hardcoded test data
        string[] memory q1 = new string[](3);
        q1[0] = "Which direction?";
        q1[1] = "Favorite season?";
        q1[2] = "Best pizza size?";
        string[4][] memory r1 = new string[4][](3);
        r1[0] = ["North", "South", "East", "West"];
        r1[1] = ["Spring", "Summer", "Fall", "Winter"];
        r1[2] = ["Small", "Medium", "Large", "XL"];

        string[] memory q2 = new string[](2);
        q2[0] = "Cats or dogs?";
        q2[1] = "Coffee or tea?";
        string[4][] memory r2 = new string[4][](2);
        r2[0] = ["Cats", "Dogs", "", ""];
        r2[1] = ["Coffee", "Tea", "", ""];

        string[] memory q3 = new string[](2);
        q3[0] = "When life gives you lemons...";
        q3[1] = "A penny saved is...";
        string[4][] memory r3 = new string[4][](2);
        r3[0] = ["make lemonade", "make juice", "throw them", "eat them"];
        r3[1] = ["a penny earned", "not much", "smart", "boring"];

        string[] memory q4 = new string[](3);
        q4[0] = "Favorite color?";
        q4[1] = "Best number?";
        q4[2] = "Preferred weather?";
        string[4][] memory r4 = new string[4][](3);
        r4[0] = ["Red", "Blue", "Green", "Yellow"];
        r4[1] = ["7", "13", "42", "100"];
        r4[2] = ["Sunny", "Rainy", "Snowy", "Cloudy"];

        vm.startBroadcast(deployerPrivateKey);

        Questions qp1 = new Questions(q1, r1);
        console.log("QuestionPack1 deployed to:", address(qp1));

        Questions qp2 = new Questions(q2, r2);
        console.log("QuestionPack2 deployed to:", address(qp2));

        Questions qp3 = new Questions(q3, r3);
        console.log("QuestionPack3 deployed to:", address(qp3));

        Questions qp4 = new Questions(q4, r4);
        console.log("QuestionPack4 deployed to:", address(qp4));

        ScoreKeeper scoreKeeper = new ScoreKeeper();
        console.log("ScoreKeeper deployed to:", address(scoreKeeper));

        vm.stopBroadcast();

        // Update deployed addresses
        string memory json = "deployments";
        json.serialize("hubRegistry", hubRegistry);
        json.serialize("admin", admin);
        json.serialize("railcar", railcar);
        json.serialize("scoreKeeper", address(scoreKeeper));
        json.serialize("questionPack1", address(qp1));
        json.serialize("questionPack2", address(qp2));
        json.serialize("questionPack3", address(qp3));
        string memory finalJson = json.serialize("questionPack4", address(qp4));
        vm.writeFile("deployed-contracts.json", finalJson);
        console.log("Saved to deployed-contracts.json");
    }
}
