// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Railcar} from "transit/Railcar.sol";

/// @title HjivemindRailcar - Extends Railcar with hub-driven membership
/// @notice Adds addMember() so hubs can enroll players on their behalf
contract HjivemindRailcar is Railcar {
    constructor(address adminAddress) Railcar(adminAddress) {}

    /// @notice Add a member to a railcar (called by an authorized hub)
    /// @param railcarID The railcar to add the member to
    /// @param member The address to add
    function addMember(uint256 railcarID, address member)
        external
        onlyRole(HUB_ROLE)
    {
        if (railcarID == 0 || railcarID > totalRailcars)
            revert InvalidRailcarId(railcarID);
        if (isMember[railcarID][member])
            revert AlreadyMember(railcarID, member);
        if (_members[railcarID].length >= memberLimit[railcarID])
            revert RailcarFull(railcarID);
        _members[railcarID].push(member);
        railcars[member].push(railcarID);
        isMember[railcarID][member] = true;
        emit MemberJoined(railcarID, member);
    }
}
