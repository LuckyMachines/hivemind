// Server-side read-only contract instances for x402 API endpoints
const { ethers } = require("ethers");

// ABIs - minimal interfaces for read-only operations
const LobbyABI = [
  "function playerCount(uint256 gameID) view returns (uint256)",
  "function railcarID(uint256 gameID) view returns (uint256)",
  "function currentGame() view returns (uint256)",
  "function entryFee() view returns (uint256)",
  "function protocolFeeBps() view returns (uint256)",
  "function totalProtocolFees() view returns (uint256)",
  "function playerLimit() view returns (uint256)",
  "function timeLimitToJoin() view returns (uint256)",
  "function joinCountdownStartTime() view returns (uint256)",
  "function canStart() view returns (bool)",
  "function joinGameFor(address player) payable",
];

const GameControllerABI = [
  "function getScore(uint256 gameID, address playerAddress) view returns (uint256)",
  "function getIsInActiveGame(address playerAddress) view returns (bool)",
  "function getCurrentGame(address playerAddress) view returns (uint256)",
  "function getPlayerCount(uint256 gameID) view returns (uint256)",
  "function getLatestRound(uint256 gameID) view returns (string)",
  "function getRailcarID(uint256 gameID) view returns (uint256)",
  "function getRailcarMembers(uint256 railcarID) view returns (address[])",
  "function getQuestion(string hubAlias, uint256 gameID) view returns (string q, string[4] choices)",
  "function getPlayerGuess(string hubAlias, uint256 gameID, address playerAddress) view returns (uint256)",
  "function getResponseScores(string hubAlias, uint256 gameID) view returns (uint256[4])",
  "function getWinningIndex(string hubAlias, uint256 gameID) view returns (uint256[])",
  "function getIsMinorityRound(string hubAlias, uint256 gameID) view returns (bool)",
  "function getPrizePool(uint256 gameID) view returns (uint256)",
  "function getFinalRanking(uint256 gameID, address playerAddress) view returns (uint256)",
  "function checkPayout(address playerAddress) view returns (uint256)",
  "function joinGameFor(address player) payable",
  "function submitAnswersFor(bytes32 _hashedAnswer, uint256 gameID, string hubAlias, address player)",
  "function revealAnswersFor(string questionAnswer, string crowdAnswer, string secretPhrase, uint256 gameID, string hubAlias, address player)",
  "function claimPrizeFor(uint256 gameID, uint256 finalScore, address player)",
];

const ScoreKeeperABI = [
  "function playerScore(uint256 gameID, address playerAddress) view returns (uint256)",
  "function currentGameID(address playerAddress) view returns (uint256)",
  "function playerInActiveGame(address playerAddress) view returns (bool)",
  "function prizePool(uint256 gameID) view returns (uint256)",
  "function latestRound(uint256 gameID) view returns (string)",
  "function gameIDFromRailcar(uint256 railcarID) view returns (uint256)",
];

const WinnersABI = [
  "function getFinalRank(uint256 gameID, address playerAddress) view returns (uint256)",
  "function getPayoutAmount(uint256 gameID, uint256 finalScore) view returns (uint256)",
  "function gameHasWinnings(uint256 gameID) view returns (bool)",
  "function playerPaid(uint256 gameID, address playerAddress) view returns (bool)",
  "function topScores(uint256 gameID, uint256 index) view returns (uint256)",
  "function claimWinningsFor(uint256 gameID, uint256 finalScore, address player)",
];

const GameRoundABI = [
  "function phase(uint256 gameID) view returns (uint8)",
  "function roundStartTime(uint256 gameID) view returns (uint256)",
  "function revealStartTime(uint256 gameID) view returns (uint256)",
  "function roundTimeLimit() view returns (uint256)",
  "function totalResponses(uint256 gameID) view returns (uint256)",
  "function totalReveals(uint256 gameID) view returns (uint256)",
  "function getQuestion(uint256 gameID) view returns (string q, string[4] choices)",
  "function getResponseScores(uint256 gameID) view returns (uint256[4])",
  "function getWinningChoiceIndex(uint256 gameID) view returns (uint256[])",
  "function isMinorityRound(uint256 gameID) view returns (bool)",
  "function submitAnswersFor(bytes32 _hashedAnswer, uint256 gameID, address player)",
  "function revealAnswersFor(string questionAnswer, string crowdAnswer, string secretPhrase, uint256 gameID, address player)",
];

// Contract addresses from deployed-contracts.json (Sepolia)
const ADDRESSES = {
  lobby: "0x735Af89C1bB8908461575626F2927016d1f5f772",
  gameController: "0xE250FE77adb0181926b8367f2e3cEf92ffe3141f",
  scoreKeeper: "0xA3F5A9B26Af99a3503F50A4039C2494c5692e4e3",
  winners: "0xb5eC1508065aE915705194b3895854BB89083e86",
  round1: "0x4B013455400a2E3Cf36Db767Fe14D1040759EF12",
  round2: "0x67bc655564EfBb0a292283a562c9232348eF7F37",
  round3: "0xc188d7a8bC093936ba51c71d35805eb0B0532ACF",
  round4: "0x7876F19c8786835B36b1C6fFC2ebdD3861e687d0",
};

const ROUND_HUBS = {
  "hjivemind.round1": ADDRESSES.round1,
  "hjivemind.round2": ADDRESSES.round2,
  "hjivemind.round3": ADDRESSES.round3,
  "hjivemind.round4": ADDRESSES.round4,
};

function getProvider() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getContracts(providerOrSigner) {
  const p = providerOrSigner || getProvider();
  return {
    lobby: new ethers.Contract(ADDRESSES.lobby, LobbyABI, p),
    gameController: new ethers.Contract(ADDRESSES.gameController, GameControllerABI, p),
    scoreKeeper: new ethers.Contract(ADDRESSES.scoreKeeper, ScoreKeeperABI, p),
    winners: new ethers.Contract(ADDRESSES.winners, WinnersABI, p),
    round1: new ethers.Contract(ADDRESSES.round1, GameRoundABI, p),
    round2: new ethers.Contract(ADDRESSES.round2, GameRoundABI, p),
    round3: new ethers.Contract(ADDRESSES.round3, GameRoundABI, p),
    round4: new ethers.Contract(ADDRESSES.round4, GameRoundABI, p),
  };
}

function getRoundContract(hubAlias, providerOrSigner) {
  const addr = ROUND_HUBS[hubAlias];
  if (!addr) return null;
  return new ethers.Contract(addr, GameRoundABI, providerOrSigner || getProvider());
}

module.exports = {
  getProvider,
  getContracts,
  getRoundContract,
  ADDRESSES,
  ROUND_HUBS,
  LobbyABI,
  GameControllerABI,
  ScoreKeeperABI,
  WinnersABI,
  GameRoundABI,
};
