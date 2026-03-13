// Server-side read-only contract instances for x402 API endpoints
const { ethers } = require("ethers");
const { CHAINS, getChainConfig } = require("./chains");

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

// Determine active chain from env, defaulting to sepolia
function getActiveChainId() {
  const env = process.env.CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || "0xaa36a7";
  return env;
}

function getProvider(chainId) {
  const cid = chainId || getActiveChainId();
  const chain = getChainConfig(cid);
  if (!chain) throw new Error(`Unsupported chain: ${cid}`);
  const rpcUrl = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || chain.rpcUrl;
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getAddressesForChain(chainId) {
  const cid = chainId || getActiveChainId();
  const chain = getChainConfig(cid);
  if (!chain) throw new Error(`Unsupported chain: ${cid}`);
  return chain.addresses;
}

function getContracts(providerOrSigner, chainId) {
  const p = providerOrSigner || getProvider(chainId);
  const addr = getAddressesForChain(chainId);
  return {
    lobby: new ethers.Contract(addr.lobby, LobbyABI, p),
    gameController: new ethers.Contract(addr.gameController, GameControllerABI, p),
    scoreKeeper: new ethers.Contract(addr.scoreKeeper, ScoreKeeperABI, p),
    winners: new ethers.Contract(addr.winners, WinnersABI, p),
    round1: new ethers.Contract(addr.round1, GameRoundABI, p),
    round2: new ethers.Contract(addr.round2, GameRoundABI, p),
    round3: new ethers.Contract(addr.round3, GameRoundABI, p),
    round4: new ethers.Contract(addr.round4, GameRoundABI, p),
  };
}

const ROUND_HUBS_KEYS = [
  "hjivemind.round1",
  "hjivemind.round2",
  "hjivemind.round3",
  "hjivemind.round4",
];

function getRoundHubs(chainId) {
  const addr = getAddressesForChain(chainId);
  return {
    "hjivemind.round1": addr.round1,
    "hjivemind.round2": addr.round2,
    "hjivemind.round3": addr.round3,
    "hjivemind.round4": addr.round4,
  };
}

function getRoundContract(hubAlias, providerOrSigner, chainId) {
  const hubs = getRoundHubs(chainId);
  const roundAddr = hubs[hubAlias];
  if (!roundAddr) return null;
  return new ethers.Contract(roundAddr, GameRoundABI, providerOrSigner || getProvider(chainId));
}

module.exports = {
  getProvider,
  getContracts,
  getRoundContract,
  getRoundHubs,
  getAddressesForChain,
  getActiveChainId,
  ROUND_HUBS_KEYS,
  LobbyABI,
  GameControllerABI,
  ScoreKeeperABI,
  WinnersABI,
  GameRoundABI,
};
