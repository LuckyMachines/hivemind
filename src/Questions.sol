// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

contract Questions is AccessControlEnumerable {
    bytes32 public GAME_ROUND_ROLE = keccak256("GAME_ROUND_ROLE");

    string[] private _questions;
    string[4][] private _responses;

    constructor(string[] memory questions, string[4][] memory responses) {
        require(
            questions.length == responses.length,
            "question + response length mismatch"
        );
        _questions = questions;
        _responses = responses;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function getQuestionWithSeed(uint256 seed)
        public
        view
        onlyRole(GAME_ROUND_ROLE)
        returns (string memory q, string[4] memory r)
    {
        uint256 index = seed % _questions.length;
        q = _questions[index];
        r = _responses[index];
    }

    // Admin
    function grantGameRoundRole(address gameRoundAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(GAME_ROUND_ROLE, gameRoundAddress);
    }

    function addQuestion(string memory question, string[4] memory responses)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _questions.push(question);
        _responses.push(responses);
    }

    function replaceQuestion(
        uint256 index,
        string memory question,
        string[4] memory responses
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(index < _questions.length, "index out of bounds of questions");
        _questions[index] = question;
        _responses[index] = responses;
    }
}
