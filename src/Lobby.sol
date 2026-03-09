// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

import {Hub} from "transit/Hub.sol";
import {HjivemindRailcar} from "./transit/HjivemindRailcar.sol";
import "./ScoreKeeper.sol";
import "./GameRound.sol";

contract Lobby is Hub {
    event PlayerJoined(uint256 indexed gameID, address indexed player, uint256 playerCount);
    event GameStarted(uint256 indexed gameID, uint256 playerCount);
    event ProtocolFeeCollected(uint256 indexed gameID, uint256 amount);

    bytes32 public RELAYER_ROLE = keccak256("RELAYER_ROLE");

    ScoreKeeper private SCORE_KEEPER;
    HjivemindRailcar private RAILCAR;
    address private _gameControllerAddress;
    uint256 private _currentGameID;
    bool private _needsNewGameID; // set to true when game has started

    uint256 public timeLimitToJoin = 300; // Countdown starts after 2nd player joins
    uint256 public playerLimit = 20; // game automatically starts if player limit reached
    uint256 public joinCountdownStartTime;
    string public gameHub;

    uint256 public entryFee;
    uint256 public protocolFeeBps = 200; // 2% protocol fee (basis points, 10000 = 100%)
    uint256 public totalProtocolFees; // accumulated fees available for withdrawal

    uint256 constant HUNDRED_YEARS = 3153600000;
    uint256 constant MAX_PROTOCOL_FEE_BPS = 1000; // cap at 10%

    // Mapping from game id
    mapping(uint256 => uint256) public playerCount;
    mapping(uint256 => uint256) public railcarID;

    constructor(
        string memory hubName,
        address scoreKeeperAddress,
        address railcarAddress,
        string memory gameStartHub,
        address hubRegistryAddress,
        address hubAdmin
    ) Hub(hubRegistryAddress, hubAdmin) {
        uint256 hubID = REGISTRY.idFromAddress(address(this));
        REGISTRY.setName(hubName, hubID);
        inputAllowed[hubID] = true; // allow input from self to start railcars here
        SCORE_KEEPER = ScoreKeeper(scoreKeeperAddress);
        RAILCAR = HjivemindRailcar(railcarAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _needsNewGameID = true;
        gameHub = gameStartHub;
        joinCountdownStartTime = block.timestamp + HUNDRED_YEARS;
    }

    function joinGame() public payable {
        _joinPlayer(msg.sender);
    }

    function joinGameFor(address player) public payable onlyRole(RELAYER_ROLE) {
        _joinPlayer(player);
    }

    function canStart() public view returns (bool) {
        return _canStartGame();
    }

    function currentGame() public view returns (uint256) {
        return _currentGameID;
    }

    function startGame() public {
        require(_canStartGame(), "unable to start game");
        emit GameStarted(_currentGameID, playerCount[_currentGameID]);

        _sendRailcarToHub(railcarID[_currentGameID], gameHub);
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

    function setProtocolFeeBps(uint256 newFeeBps)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newFeeBps <= MAX_PROTOCOL_FEE_BPS, "Fee exceeds 10% cap");
        protocolFeeBps = newFeeBps;
    }

    function addRelayer(address relayerAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(RELAYER_ROLE, relayerAddress);
    }

    function withdraw(address withdrawAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 amount = totalProtocolFees;
        require(amount > 0, "No fees to withdraw");
        totalProtocolFees = 0;
        (bool success, ) = payable(withdrawAddress).call{value: amount}("");
        require(success, "Withdraw failed");
    }

    // Internal functions
    function _joinPlayer(address player) internal {
        require(
            !SCORE_KEEPER.playerInActiveGame(player),
            "player already in game"
        );
        require(msg.value >= entryFee, "Minimum entry fee not sent");
        if (_needsNewGameID) {
            _currentGameID++;
            RAILCAR.createRailcar(playerLimit);
            railcarID[_currentGameID] = RAILCAR.totalRailcars();
            _needsNewGameID = false;
        }

        // Calculate protocol fee (2% default) and prize pool contribution
        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 poolValue = msg.value - fee;
        totalProtocolFees += fee;

        if (poolValue > 0) {
            (bool success, ) = payable(REGISTRY.addressFromName("hjivemind.winners")).call{value: poolValue}("");
            require(success, "Prize pool transfer failed");
            SCORE_KEEPER.increasePrizePool(poolValue, _currentGameID);
        }

        if (fee > 0) {
            emit ProtocolFeeCollected(_currentGameID, fee);
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

        RAILCAR.addMember(railcarID[_currentGameID], player);
        emit PlayerJoined(_currentGameID, player, playerCount[_currentGameID]);

        if (playerCount[_currentGameID] == playerLimit) {
            startGame();
        }
    }

    function _canStartGame() internal view returns (bool canStartGame) {
        canStartGame = false;
        if (
            block.timestamp >= (joinCountdownStartTime + timeLimitToJoin) ||
            playerCount[_currentGameID] >= playerLimit
        ) {
            if (!_needsNewGameID) {
                canStartGame = true;
            }
        }
    }
}
