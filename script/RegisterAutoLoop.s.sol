// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {HjivemindKeeper} from "../src/HjivemindKeeper.sol";
import {GameRound} from "../src/GameRound.sol";

interface IAutoLoopRegistrar {
    function registerAutoLoopFor(
        address autoLoopCompatibleContract,
        uint256 maxGasPerUpdate
    ) external payable returns (bool success);

    function canRegisterAutoLoop(address registrantAddress) external view returns (bool, string memory);
}

interface IAutoLoopRegistry {
    function isRegisteredAutoLoop(address) external view returns (bool);
}

contract RegisterAutoLoop is Script {
    using stdJson for string;

    // Sepolia AutoLoop addresses (from @luckymachines/autoloop deployments.json)
    address constant AUTO_LOOP_REGISTRAR = 0xAE473527893bbf687D93cFD0e447d13202054ef0;
    address constant AUTO_LOOP_REGISTRY = 0xAE63c1071020964e61f668De95cA1c90ad5695A7;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        string memory deployedJson = vm.readFile("deployed-contracts.json");
        address keeperAddr = deployedJson.readAddress(".hivemindKeeper");
        address round1Addr = deployedJson.readAddress(".round1");
        address round2Addr = deployedJson.readAddress(".round2");
        address round3Addr = deployedJson.readAddress(".round3");
        address round4Addr = deployedJson.readAddress(".round4");

        // Controller key for VRF — use env vars or derive from deployer
        // In production, use a dedicated controller keypair
        uint256 controllerPkX = vm.envOr("CONTROLLER_PK_X", uint256(0));
        uint256 controllerPkY = vm.envOr("CONTROLLER_PK_Y", uint256(0));
        address controllerAddress = vm.envOr("CONTROLLER_ADDRESS", deployer);

        HjivemindKeeper keeper = HjivemindKeeper(keeperAddr);
        IAutoLoopRegistrar registrar = IAutoLoopRegistrar(AUTO_LOOP_REGISTRAR);
        IAutoLoopRegistry registry = IAutoLoopRegistry(AUTO_LOOP_REGISTRY);

        vm.startBroadcast(deployerPrivateKey);

        // --- Step 1: Register with AutoLoop (if not already registered) ---
        bool isRegistered = registry.isRegisteredAutoLoop(keeperAddr);
        if (!isRegistered) {
            console.log("Registering HjivemindKeeper with AutoLoop...");
            // Deposit 0.1 ETH for loop progression gas fees
            uint256 depositAmount = vm.envOr("AUTOLOOP_DEPOSIT", uint256(0.1 ether));
            uint256 maxGas = vm.envOr("AUTOLOOP_MAX_GAS", uint256(2_000_000));

            bool success = registrar.registerAutoLoopFor{value: depositAmount}(
                keeperAddr,
                maxGas
            );
            require(success, "AutoLoop registration failed");
            console.log("HjivemindKeeper registered with AutoLoop");
            console.log("  Deposit:", depositAmount);
            console.log("  Max gas:", maxGas);
        } else {
            console.log("HjivemindKeeper already registered with AutoLoop");
        }

        // --- Step 2: Ensure VRF is enabled on keeper ---
        if (!keeper.vrfEnabled()) {
            console.log("Enabling VRF on keeper...");
            keeper.setVRFEnabled(true);
            console.log("VRF enabled");
        } else {
            console.log("VRF already enabled");
        }

        // --- Step 3: Set VRF source to AutoLoop on all rounds ---
        if (GameRound(round1Addr).vrfSource() != GameRound.VRFSource.AutoLoop) {
            GameRound(round1Addr).setVRFSource(GameRound.VRFSource.AutoLoop);
            console.log("Round1 VRF source set to AutoLoop");
        }
        if (GameRound(round2Addr).vrfSource() != GameRound.VRFSource.AutoLoop) {
            GameRound(round2Addr).setVRFSource(GameRound.VRFSource.AutoLoop);
            console.log("Round2 VRF source set to AutoLoop");
        }
        if (GameRound(round3Addr).vrfSource() != GameRound.VRFSource.AutoLoop) {
            GameRound(round3Addr).setVRFSource(GameRound.VRFSource.AutoLoop);
            console.log("Round3 VRF source set to AutoLoop");
        }
        if (GameRound(round4Addr).vrfSource() != GameRound.VRFSource.AutoLoop) {
            GameRound(round4Addr).setVRFSource(GameRound.VRFSource.AutoLoop);
            console.log("Round4 VRF source set to AutoLoop");
        }

        // --- Step 4: Register controller key for VRF proof verification ---
        if (controllerPkX != 0 && controllerPkY != 0) {
            console.log("Registering controller key...");
            console.log("  Controller:", controllerAddress);
            keeper.registerControllerKey(controllerAddress, controllerPkX, controllerPkY);
            console.log("Controller key registered");
        } else {
            console.log("WARNING: No controller key provided (CONTROLLER_PK_X / CONTROLLER_PK_Y)");
            console.log("  VRF proof verification will fail until a controller key is registered.");
            console.log("  Set CONTROLLER_ADDRESS, CONTROLLER_PK_X, CONTROLLER_PK_Y env vars and re-run.");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== AutoLoop Registration Complete ===");
        console.log("  Keeper:", keeperAddr);
        console.log("  Registry:", AUTO_LOOP_REGISTRY);
        console.log("  Registered:", registry.isRegisteredAutoLoop(keeperAddr));
    }
}
