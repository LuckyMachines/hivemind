// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {Questions} from "../src/Questions.sol";

contract QuestionsTest is Test {
    Questions questions;
    address admin;
    address gameRound;

    function setUp() public {
        admin = address(this);
        gameRound = makeAddr("gameRound");

        string[] memory q = new string[](3);
        q[0] = "Which direction?";
        q[1] = "Favorite season?";
        q[2] = "Best pizza?";
        string[4][] memory r = new string[4][](3);
        r[0] = ["North", "South", "East", "West"];
        r[1] = ["Spring", "Summer", "Fall", "Winter"];
        r[2] = ["Small", "Medium", "Large", "XL"];

        questions = new Questions(q, r);
        questions.grantGameRoundRole(gameRound);
    }

    function test_getQuestionWithSeed() public {
        vm.prank(gameRound);
        (string memory q, string[4] memory r) = questions.getQuestionWithSeed(0);
        assertEq(q, "Which direction?");
        assertEq(r[0], "North");
    }

    function test_getQuestionWithSeed_wraps() public {
        vm.prank(gameRound);
        (string memory q,) = questions.getQuestionWithSeed(3);
        assertEq(q, "Which direction?"); // 3 % 3 = 0
    }

    function test_getQuestion_requiresRole() public {
        vm.prank(makeAddr("unauthorized"));
        vm.expectRevert();
        questions.getQuestionWithSeed(0);
    }

    function test_addQuestion() public {
        questions.addQuestion("New question?", ["A", "B", "C", "D"]);
        vm.prank(gameRound);
        (string memory q,) = questions.getQuestionWithSeed(3);
        assertEq(q, "New question?"); // index 3
    }

    function test_replaceQuestion() public {
        questions.replaceQuestion(0, "Replaced?", ["1", "2", "3", "4"]);
        vm.prank(gameRound);
        (string memory q, string[4] memory r) = questions.getQuestionWithSeed(0);
        assertEq(q, "Replaced?");
        assertEq(r[0], "1");
    }

    function test_replaceQuestion_outOfBounds() public {
        vm.expectRevert("index out of bounds of questions");
        questions.replaceQuestion(99, "Bad", ["1", "2", "3", "4"]);
    }
}
