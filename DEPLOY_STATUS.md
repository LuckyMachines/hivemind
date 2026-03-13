# HJIVEMIND — Deploy & Readiness Status

*Last updated: 2026-03-13*

| Component | Staging (Sepolia) | Production (Mainnet) |
|-----------|------------------|---------------------|
| **Smart Contracts** | Deployed | Not deployed |
| - HubRegistry | `0xC6f23f3B57847d8b2807823Fe1F252a58c7955C4` | — |
| - Railcar | `0x01679c0573A946e8016E65b4E25F4Ae86a338122` | — |
| - ScoreKeeper | `0xA3F5A9B26Af99a3503F50A4039C2494c5692e4e3` | — |
| - Lobby | `0x735Af89C1bB8908461575626F2927016d1f5f772` | — |
| - GameController | `0xE250FE77adb0181926b8367f2e3cEf92ffe3141f` | — |
| - Rounds 1–4 | Deployed | — |
| - Winners | `0xb5eC1508065aE915705194b3895854BB89083e86` | — |
| - HjivemindKeeper | `0xbb704032148Eb9247cB7aEd7aD6b3871d8060d26` | — |
| **AutoLoop** | | |
| - Keeper registered | Yes | — |
| - VRF enabled | Yes | — |
| - Controller keys (3 workers) | Registered | — |
| - ETH funded | 0.1 ETH | — |
| - VRF source on rounds | AutoLoop (all 4) | — |
| **x402 Payments** | | |
| - Enabled | Yes | — |
| - Network | Base Sepolia | Base (mainnet) |
| - Facilitator | x402.org | x402.org |
| - Pricing | $0.01–$0.10/call (~$0.35/game) | TBD |
| **Frontend (Railway)** | | |
| - App deployed | Yes (`game.hjivemind.com`) | Same service |
| - UI | Panel-based responsive layout | Same |
| - Docs (MDX) | 7 pages live | Same |
| - Analytics | Client-side tracking | Same |
| **Relayer** | | |
| - Wallet configured | Deployer wallet | Dedicated wallet needed |
| - RPC URL | Set (public node) | Mainnet RPC needed |
| **DNS / Hosting** | | |
| - `game.hjivemind.com` | Railway | Railway |
| - `hjivemind.com` | Railway (marketing) | Railway |
| - `www` redirect | DNS-level | DNS-level |
| **Marketing Site** | | |
| - Deployed | Yes | Same |
| - Languages | EN, ES, DE, JA, FR, PT, KO, ZH, IT | Same |
| **Tests** | 87/87 passing | Same contracts |

## Go-Live Checklist

### Smart Contracts
- [ ] Deploy all contracts to Ethereum mainnet
- [ ] Verify all contracts on Etherscan
- [ ] Update `deployed-contracts.json` with mainnet addresses
- [ ] Update `lib/chains.js` with mainnet contract addresses
- [ ] Run full test suite against mainnet fork
- [ ] Confirm contract ownership / admin roles are correct
- [ ] Set up contract upgrade path or document immutability

### AutoLoop / Keeper
- [ ] Register keeper with AutoLoop on mainnet
- [ ] Fund AutoLoop with ETH for keeper operations
- [ ] Register controller keys for mainnet workers
- [ ] Set keeper gas limits and alerting thresholds
- [ ] Test full game cycle via keeper on mainnet

### Relayer
- [ ] Set up dedicated relayer wallet (not deployer)
- [ ] Fund relayer wallet with mainnet ETH
- [ ] Configure mainnet RPC URL (dedicated node, not public)
- [ ] Set up relayer wallet balance monitoring / alerts
- [ ] Implement nonce management for high-throughput

### x402 Payments
- [ ] Switch x402 network to Base mainnet
- [ ] Set x402 pay-to address for production
- [ ] Finalize production pricing
- [ ] Test full payment flow end-to-end on mainnet
- [ ] Set up USDC revenue tracking / accounting

### Frontend / Railway
- [ ] Confirm production environment variables on Railway
- [ ] Enable production error tracking (Sentry or similar)
- [ ] Set up uptime monitoring for `game.hjivemind.com`
- [ ] Verify all endpoints via production domain
- [ ] Load test critical paths (join, submit, reveal)
- [ ] Confirm analytics pipeline is capturing events

### DNS / Domains
- [ ] Verify `game.hjivemind.com` points to production Railway service
- [ ] Verify `hjivemind.com` marketing site
- [ ] Confirm `www` redirect works at DNS level
- [ ] SSL certificates valid and auto-renewing

### Security
- [ ] Rotate all staging secrets (private keys, API keys)
- [ ] Ensure deployer key is not used at runtime
- [ ] Review Railway env vars — no staging values leaking into prod
- [ ] Rate-limit API endpoints
- [ ] Review x402 facilitator trust model for mainnet

### Monitoring & Operations
- [ ] Set up alerting for keeper failures / missed rounds
- [ ] Set up alerting for relayer wallet low balance
- [ ] Set up alerting for Railway deploy failures
- [ ] Document incident response runbook
- [ ] Set up log aggregation

### Launch Readiness
- [ ] Full end-to-end playtest on production (create game → all rounds → claim)
- [ ] Marketing site content reviewed and final
- [ ] Social / comms plan ready for launch announcement
- [ ] Support channel set up (Discord, Telegram, etc.)
- [ ] Document known limitations and FAQ
