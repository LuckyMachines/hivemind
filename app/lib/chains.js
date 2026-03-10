// Multi-chain configuration for Hivemind
// Supports Anvil (local), Sepolia (testnet), and Mainnet

const CHAINS = {
  // Anvil local dev
  "0x7a69": {
    name: "Anvil (Local)",
    chainId: "0x7a69",
    rpcUrl: "http://127.0.0.1:8545",
    addresses: {
      hubRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      railYard: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      gameController: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
      scoreKeeper: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
      hivemindKeeper: "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
      lobby: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
      round1: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
      round2: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
      round3: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
      round4: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
      winners: "0x9A676e781A523b5d0C0e43731313A708CB607508",
    },
  },
  // Sepolia testnet
  "0xaa36a7": {
    name: "Sepolia",
    chainId: "0xaa36a7",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    addresses: {
      lobby: "0x735Af89C1bB8908461575626F2927016d1f5f772",
      gameController: "0xE250FE77adb0181926b8367f2e3cEf92ffe3141f",
      scoreKeeper: "0xA3F5A9B26Af99a3503F50A4039C2494c5692e4e3",
      winners: "0xb5eC1508065aE915705194b3895854BB89083e86",
      round1: "0x4B013455400a2E3Cf36Db767Fe14D1040759EF12",
      round2: "0x67bc655564EfBb0a292283a562c9232348eF7F37",
      round3: "0xc188d7a8bC093936ba51c71d35805eb0B0532ACF",
      round4: "0x7876F19c8786835B36b1C6fFC2ebdD3861e687d0",
    },
  },
  // Ethereum Mainnet
  "0x1": {
    name: "Mainnet",
    chainId: "0x1",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    addresses: {
      lobby: "",
      gameController: "",
      scoreKeeper: "",
      winners: "",
      round1: "",
      round2: "",
      round3: "",
      round4: "",
    },
  },
};

const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS);

function getChainConfig(chainId) {
  return CHAINS[chainId] || null;
}

function getAddresses(chainId) {
  const chain = CHAINS[chainId];
  return chain ? chain.addresses : null;
}

function isSupportedChain(chainId) {
  return SUPPORTED_CHAIN_IDS.includes(chainId);
}

function getChainName(chainId) {
  const chain = CHAINS[chainId];
  return chain ? chain.name : "Unknown";
}

module.exports = {
  CHAINS,
  SUPPORTED_CHAIN_IDS,
  getChainConfig,
  getAddresses,
  getChainName,
  isSupportedChain,
};
