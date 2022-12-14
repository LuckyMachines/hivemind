// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@luckymachines/railway/contracts/Hub.sol";
import "@luckymachines/railway/contracts/RailYard.sol";
import "hardhat/console.sol";
import "./ScoreKeeper.sol";
import "./GameRound.sol";

contract Lobby is Hub {
    ScoreKeeper private SCORE_KEEPER;
    RailYard private RAIL_YARD;
    address private _gameControllerAddress;
    uint256 private _currentGameID;
    bool private _needsNewGameID; // set to true when game has started

    uint256 public timeLimitToJoin = 300; // Countdown starts after 2nd player joins
    uint256 public playerLimit = 20; // game automatically starts if player limit reached
    uint256 public joinCountdownStartTime;
    string public gameHub;

    uint256 public entryFee;
    uint256 public adminFee;

    uint256 constant HUNDRED_YEARS = 3153600000;

    // Mapping from game id
    mapping(uint256 => uint256) public playerCount;
    mapping(uint256 => uint256) public railcarID;

    constructor(
        string memory hubName,
        address scoreKeeperAddress,
        address railYardAddress,
        string memory gameStartHub,
        address hubRegistryAddress,
        address hubAdmin
    ) Hub(hubRegistryAddress, hubAdmin) {
        uint256 hubID = REGISTRY.idFromAddress(address(this));
        REGISTRY.setName(hubName, hubID);
        inputAllowed[hubID] = true; // allow input from self to start railcars here
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
        RAIL_YARD = RailYard(railYardAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _needsNewGameID = true;
        gameHub = gameStartHub;
        joinCountdownStartTime = block.timestamp + HUNDRED_YEARS;
    }

    function joinGame() public payable {
        address player = tx.origin;
        require(
            !SCORE_KEEPER.playerInActiveGame(player),
            "player already in game"
        );
        require(msg.value >= entryFee, "Minimum entry fee not sent");
        if (_needsNewGameID) {
            _currentGameID++;
            // Create railcar with game controller as owner, this as operator
            railcarID[_currentGameID] = RAIL_YARD.createRailcar(
                _gameControllerAddress,
                address(this),
                playerLimit
            );
            uint256 rid = railcarID[_currentGameID];
            uint256[] memory storageValues = new uint256[](1);
            storageValues[0] = _currentGameID;
            RAIL_YARD.createRailcar(4, storageValues);
            // Manually enter railcar since not receiving from any other hub
            if (_groupCanEnter(rid)) {
                _groupDidEnter(rid);
            }
            _needsNewGameID = false;
        }
        // add entry to pool and send to winners
        uint256 poolValue = msg.value > adminFee ? msg.value - adminFee : 0;
        if (poolValue > 0) {
            payable(REGISTRY.addressFromName("hivemind.winners")).transfer(
                poolValue
            );
            SCORE_KEEPER.increasePrizePool(poolValue, _currentGameID);
        }
        SCORE_KEEPER.setGameID(
            _currentGameID,
            player,
            railcarID[_currentGameID]
        );
        playerCount[_currentGameID]++;

        if (playerCount[_currentGameID] == 2) {
            joinCountdownStartTime = block.timestamp;
        }

        RAIL_YARD.joinRailcar(railcarID[_currentGameID], player);

        // auto-start game if at limit
        if (playerCount[_currentGameID] == playerLimit) {
            startGame();
        }
    }

    function canStart() public view returns (bool) {
        return _canStartGame();
    }

    function currentGame() public view returns (uint256) {
        return _currentGameID;
    }

    function startGame() public {
        require(_canStartGame(), "unable to start game");

        _sendGroupToHub(railcarID[_currentGameID], gameHub);
        _needsNewGameID = true;
        joinCountdownStartTime = block.timestamp + HUNDRED_YEARS;
    }

    // Admin functions
    function setGameControllerAddress(address gameControllerAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _gameControllerAddress = gameControllerAddress;
    }

    function setTimeLimitToJoin(uint256 timeInSeconds)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        timeLimitToJoin = timeInSeconds;
    }

    function setPlayerLimit(uint256 limit) public onlyRole(DEFAULT_ADMIN_ROLE) {
        playerLimit = limit;
    }

    function setEntryFee(uint256 newEntryFee)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        entryFee = newEntryFee;
    }

    function setAdminFee(uint256 newAdminFee)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        adminFee = newAdminFee;
    }

    function withdraw(address withdrawAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        payable(withdrawAddress).transfer(address(this).balance);
    }

    // Internal functions
    function _canStartGame() internal view returns (bool canStartGame) {
        canStartGame = false;
        if (
            block.timestamp >= (joinCountdownStartTime + timeLimitToJoin) ||
            playerCount[_currentGameID] >= playerLimit
        ) {
            if (!_needsNewGameID) {
                // if this is false we have an unstarted game
                // if true, _currentGameID will not be an active game
                canStartGame = true;
            }
        }
    }

    function _groupCanExit(uint256) internal pure override returns (bool) {
        return true;
    }
}

// join game
// move with group into round 1 when game is ready
// Max limit 1000
