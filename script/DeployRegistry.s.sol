// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ValidCharacters} from "transit/ValidCharacters.sol";
import {HubRegistry} from "transit/HubRegistry.sol";

contract DeployRegistry is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy HubRegistry (non-upgradeable in new transit system)
        HubRegistry hubRegistry = new HubRegistry(admin);
        console.log("HubRegistry deployed to:", address(hubRegistry));

        vm.stopBroadcast();

        // Save deployed address
        string memory json = "deployments";
        json.serialize("hubRegistry", address(hubRegistry));
        string memory finalJson = json.serialize("admin", admin);
        vm.writeFile("deployed-contracts.json", finalJson);
        console.log("Saved to deployed-contracts.json");
    }
}
