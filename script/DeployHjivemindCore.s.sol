// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Questions} from "../src/Questions.sol";
import {ScoreKeeper} from "../src/ScoreKeeper.sol";

/// @title DeployHjivemindCore - Deploys 4 Question Packs + ScoreKeeper
/// @notice Run `node script/csv-to-json.js` first to generate questions/questions.json from CSVs
contract DeployHjivemindCore is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        string memory deployedJson = vm.readFile("deployed-contracts.json");
        address hubRegistry = deployedJson.readAddress(".hubRegistry");
        address admin = deployedJson.readAddress(".admin");
        address railcar = deployedJson.readAddress(".railcar");

        // Load questions from JSON (pre-processed from CSV via script/csv-to-json.js)
        string memory qJson = vm.readFile("questions/questions.json");

        (string[] memory q1, string[4][] memory r1) = _loadPack(qJson, "pack1");
        (string[] memory q2, string[4][] memory r2) = _loadPack(qJson, "pack2");
        (string[] memory q3, string[4][] memory r3) = _loadPack(qJson, "pack3");
        (string[] memory q4, string[4][] memory r4) = _loadPack(qJson, "pack4");

        console.log("Pack1:", q1.length, "questions");
        console.log("Pack2:", q2.length, "questions");
        console.log("Pack3:", q3.length, "questions");
        console.log("Pack4:", q4.length, "questions");

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

    /// @notice Loads a question pack from the pre-processed JSON
    /// @param qJson The full JSON string from questions/questions.json
    /// @param packName The pack key (e.g. "pack1", "pack2")
    /// @return questions Array of question strings
    /// @return responses Array of [4] response strings per question
    function _loadPack(string memory qJson, string memory packName)
        internal
        pure
        returns (string[] memory questions, string[4][] memory responses)
    {
        // Read questions array
        string memory qPath = string.concat(".", packName, ".questions");
        questions = abi.decode(vm.parseJson(qJson, qPath), (string[]));

        // Read flat responses array (4 per question, interleaved)
        string memory rPath = string.concat(".", packName, ".responses");
        string[] memory flatResponses = abi.decode(vm.parseJson(qJson, rPath), (string[]));

        // Rebuild into string[4][]
        responses = new string[4][](questions.length);
        for (uint256 i = 0; i < questions.length; i++) {
            responses[i][0] = flatResponses[i * 4];
            responses[i][1] = flatResponses[i * 4 + 1];
            responses[i][2] = flatResponses[i * 4 + 2];
            responses[i][3] = flatResponses[i * 4 + 3];
        }
    }
}
