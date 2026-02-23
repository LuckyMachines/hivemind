// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

/// @notice Local copy of AutoLoopCompatibleInterface from autoloop submodule.
///         The submodule uses pragma solidity 0.8.34 (unreleased), so we maintain
///         a compatible copy here. Keep in sync with lib/autoloop/src/AutoLoopCompatibleInterface.sol.
interface AutoLoopCompatibleInterface {
    function shouldProgressLoop()
        external
        view
        returns (bool loopIsReady, bytes memory progressWithData);

    // No guarantees on the data passed in. Should not be solely relied on.
    // Re-verify any data passed through progressWithData.
    function progressLoop(bytes calldata progressWithData) external;
}
