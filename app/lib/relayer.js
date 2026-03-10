// Server-side relayer wallet for x402 protocol
// Submits Sepolia transactions on behalf of players who pay via USDC on Base Sepolia
const { ethers } = require("ethers");
const { getContracts, getRoundContract, getProvider } = require("./contracts");

function getRelayerWallet() {
  const privateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("RELAYER_PRIVATE_KEY not configured");
  }
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
}

function getRelayerContracts() {
  const wallet = getRelayerWallet();
  return getContracts(wallet);
}

async function joinGameFor(playerAddress) {
  const wallet = getRelayerWallet();
  const contracts = getContracts(wallet);

  const entryFee = await contracts.lobby.entryFee();

  const tx = await contracts.lobby.joinGameFor(playerAddress, {
    value: entryFee,
  });
  const receipt = await tx.wait();

  const currentGameID = await contracts.scoreKeeper.currentGameID(playerAddress);

  return {
    gameID: currentGameID.toString(),
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

async function submitAnswersFor(gameID, hashedAnswer, playerAddress) {
  const wallet = getRelayerWallet();
  const contracts = getContracts(wallet);

  const latestRound = await contracts.scoreKeeper.latestRound(gameID);
  if (!latestRound) {
    throw new Error("Game not in an active round");
  }

  const roundContract = getRoundContract(latestRound, wallet);
  if (!roundContract) {
    throw new Error(`Unknown round hub: ${latestRound}`);
  }

  const tx = await roundContract.submitAnswersFor(hashedAnswer, gameID, playerAddress);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    round: latestRound,
  };
}

async function revealAnswersFor(gameID, questionAnswer, crowdAnswer, secretPhrase, playerAddress) {
  const wallet = getRelayerWallet();
  const contracts = getContracts(wallet);

  const latestRound = await contracts.scoreKeeper.latestRound(gameID);
  if (!latestRound) {
    throw new Error("Game not in an active round");
  }

  const roundContract = getRoundContract(latestRound, wallet);
  if (!roundContract) {
    throw new Error(`Unknown round hub: ${latestRound}`);
  }

  const tx = await roundContract.revealAnswersFor(
    questionAnswer,
    crowdAnswer,
    secretPhrase,
    gameID,
    playerAddress
  );
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    round: latestRound,
  };
}

async function claimWinningsFor(gameID, finalScore, playerAddress) {
  const wallet = getRelayerWallet();
  const contracts = getContracts(wallet);

  const tx = await contracts.winners.claimWinningsFor(gameID, finalScore, playerAddress);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
  };
}

module.exports = {
  getRelayerWallet,
  getRelayerContracts,
  joinGameFor,
  submitAnswersFor,
  revealAnswersFor,
  claimWinningsFor,
};
