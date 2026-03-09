// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

// Local copy of AutoLoopCompatibleInterface from luckymachines/autoloop (npm).
// The package uses pragma solidity 0.8.34, so we maintain a ^0.8.33
// compatible copy here. Keep in sync with node_modules/luckymachines-autoloop/src/AutoLoopCompatibleInterface.sol.
interface AutoLoopCompatibleInterface {
    function shouldProgressLoop()
        external
        view
        returns (bool loopIsReady, bytes memory progressWithData);

    // No guarantees on the data passed in. Should not be solely relied on.
    // Re-verify any data passed through progressWithData.
    function progressLoop(bytes calldata progressWithData) external;
}
