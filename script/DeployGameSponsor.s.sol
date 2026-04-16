// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import "forge-std/Script.sol";

interface ILobby {
    function entryFee() external view returns (uint256);
    function setEntryFee(uint256 newEntryFee) external;
    function adminFee() external view returns (uint256);
    function setAdminFee(uint256 newAdminFee) external;
}

interface IGameSponsor {
    function setDripAmount(uint256 amount) external;
    function setMaxSponsoredEntries(uint256 max) external;
}

contract DeployGameSponsor is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address lobbyAddress = vm.envOr(
            "LOBBY_ADDRESS",
            address(0x735Af89C1bB8908461575626F2927016d1f5f772)
        );
        // Entry fee: 0.001 ETH per player to join Hjivemind
        uint256 hjivemindEntryFee = vm.envOr(
            "HJIVEMIND_ENTRY_FEE",
            uint256(0.001 ether)
        );
        // Admin fee: 2% of entry fee = 0.00002 ETH kept by lobby
        // (entryFee goes to prize pool, adminFee is flat amount kept)
        uint256 adminFeeAmount = vm.envOr(
            "ADMIN_FEE",
            uint256(0.00002 ether)
        );
        uint256 dripAmount = vm.envOr(
            "DRIP_AMOUNT",
            uint256(0.005 ether)
        );
        uint256 maxEntries = vm.envOr(
            "MAX_SPONSORED_ENTRIES",
            uint256(5)
        );

        vm.startBroadcast(deployerPrivateKey);

        // Deploy GameSponsor
        bytes memory bytecode = abi.encodePacked(
            vm.getCode("GameSponsor.sol:GameSponsor"),
            abi.encode(lobbyAddress)
        );
        address sponsor;
        assembly {
            sponsor := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        require(sponsor != address(0), "Deploy failed");

        // Configure the sponsor
        IGameSponsor(sponsor).setDripAmount(dripAmount);
        IGameSponsor(sponsor).setMaxSponsoredEntries(maxEntries);

        // Configure Hjivemind Lobby fees
        ILobby lobby = ILobby(lobbyAddress);
        lobby.setEntryFee(hjivemindEntryFee);
        lobby.setAdminFee(adminFeeAmount);

        vm.stopBroadcast();

        console.log("=== GameSponsor Deployed ===");
        console.log("GameSponsor:       ", sponsor);
        console.log("Lobby:             ", lobbyAddress);
        console.log("Hjivemind entry:    %s wei (0.001 ETH)", hjivemindEntryFee);
        console.log("Admin fee:          %s wei (~2%%)", adminFeeAmount);
        console.log("Drip amount:        %s wei (0.005 ETH)", dripAmount);
        console.log("Max entries/player:", maxEntries);
        console.log("");
        console.log(">>> SEND SEPOLIA ETH TO: %s <<<", sponsor);
    }
}
