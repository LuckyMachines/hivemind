// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {HivemindRailcar} from "../src/transit/HivemindRailcar.sol";

contract DeployRailcar is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);

        string memory deployedJson = vm.readFile("deployed-contracts.json");
        address hubRegistry = deployedJson.readAddress(".hubRegistry");

        vm.startBroadcast(deployerPrivateKey);

        HivemindRailcar railcar = new HivemindRailcar(admin);
        console.log("HivemindRailcar deployed to:", address(railcar));

        vm.stopBroadcast();

        // Update deployed addresses
        string memory json = "deployments";
        json.serialize("hubRegistry", hubRegistry);
        json.serialize("admin", admin);
        string memory finalJson = json.serialize("railcar", address(railcar));
        vm.writeFile("deployed-contracts.json", finalJson);
        console.log("Saved to deployed-contracts.json");
    }
}
