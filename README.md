<p align="center">
  <img src="images/logo.png" alt="Hjivemind Logo" width="200" />
</p>

# Hjivemind

![Hjivemind Hero](images/hivemind_hero.png)

### An on-chain multiplayer game where you win by outsmarting the crowd

Contracts for this project are deployed on the Polygon Mumbai testnet. Test MATIC is required to play this game.

## How It Works

![Game Arena](images/hivemind_game.png)

Players join a lobby and compete across 4 rounds of multiple-choice questions. Each round is randomly assigned as either **majority** or **minority** mode via Chainlink VRF:

- **Majority rounds** — predict what most players will choose (classic mechanic)
- **Minority rounds** — predict the least popular answer; coordination backfires since colluding groups become the majority and lose

This mixed mode creates genuine strategic uncertainty — there's no fixed strategy that always works.

### Scoring

- **Submission** — 100 points
- **Fast Reveal Bonus** — up to 1,000 points
- **Match the Winning Choice** — 3,000 points

## Architecture

![Smart Contracts](images/hivemind_chain.png)

Built with Solidity on Foundry, integrating Chainlink VRF for randomization and both Chainlink Automation and AutoLoop for decentralized game-state progression.

| Contract | Role |
|---|---|
| **HjivemindKeeper** | Automation controller — checks and advances game state |
| **Lobby** | Player entry, matchmaking, and game start |
| **GameRound** | Question delivery, answer submission/reveal, majority/minority scoring |
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
