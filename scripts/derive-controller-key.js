#!/usr/bin/env node
// Derives secp256k1 public key coordinates (pkX, pkY) from a private key
// Usage: node scripts/derive-controller-key.js [PRIVATE_KEY]
// Or set CONTROLLER_PRIVATE_KEY env var

require("dotenv").config();
let ethers;
try {
  ethers = require("ethers");
} catch {
  ethers = require("../app/node_modules/ethers");
}

const privateKey = process.argv[2] || process.env.CONTROLLER_PRIVATE_KEY;

if (!privateKey) {
  console.error("Usage: node scripts/derive-controller-key.js <PRIVATE_KEY>");
  console.error("  or set CONTROLLER_PRIVATE_KEY env var");
  process.exit(1);
}

const wallet = new ethers.Wallet(privateKey);
const publicKey = wallet.signingKey.publicKey; // 0x04 + x(64 hex) + y(64 hex)

// Strip the 0x04 prefix (uncompressed public key marker)
const pubKeyHex = publicKey.slice(4); // remove "0x04"
const pkX = "0x" + pubKeyHex.slice(0, 64);
const pkY = "0x" + pubKeyHex.slice(64);

console.log("Controller Address:", wallet.address);
console.log("Public Key X:      ", pkX);
console.log("Public Key Y:      ", pkY);
console.log("");
console.log("Set these env vars for RegisterAutoLoop.s.sol:");
console.log(`  CONTROLLER_ADDRESS=${wallet.address}`);
console.log(`  CONTROLLER_PK_X=${pkX}`);
console.log(`  CONTROLLER_PK_Y=${pkY}`);
