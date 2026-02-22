<p align="center">
  <img src="images/logo.png" alt="Hivemind Logo" width="200" />
</p>

# Hivemind

![Hivemind Hero](images/hivemind_hero.png)

### An on-chain multiplayer game where you win by knowing how the crowd will vote

Contracts for this project are deployed on the Polygon Mumbai testnet. Test MATIC is required to play this game.

## How It Works

![Game Arena](images/hivemind_game.png)

Players join a lobby and compete across 4 rounds of multiple-choice questions. The twist: you don't score by picking the "correct" answer — you score by predicting what the **majority** will choose. Submit your answer, reveal it, and earn points for reading the crowd.

- **Submission** — 100 points
- **Fast Reveal Bonus** — up to 1,000 points
- **Match the Crowd** — 3,000 points

## Architecture

![Smart Contracts](images/hivemind_chain.png)

Built with Solidity on Foundry, integrating Chainlink VRF for randomization and both Chainlink Automation and AutoLoop for decentralized game-state progression.

| Contract | Role |
|---|---|
| **HivemindKeeper** | Automation controller — checks and advances game state |
| **Lobby** | Player entry, matchmaking, and game start |
| **GameRound** | Question delivery, answer submission/reveal, scoring |
| **ScoreKeeper** | Tracks scores and prize pools across rounds |
| **Winners** | Final results and payout logic |
| **Questions** | On-chain question storage with VRF-seeded selection |

## Development

### Build

```
forge build
```

### Test

```
forge test
```

### Run the App

```
cd app
yarn
yarn dev
```
