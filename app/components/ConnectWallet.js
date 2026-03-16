import React, { useState } from "react";
import Web3 from "web3";
import { isSupportedChain, getChainName, SUPPORTED_CHAIN_IDS } from "../lib/chains";

const ConnectWallet = (props) => {
  const [connectWalletLoading, setConnectedWalletLoading] = useState(false);
  const [wrongChain, setWrongChain] = useState(false);
  const [switchingChain, setSwitchingChain] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState("");
  const [chainLabel, setChainLabel] = useState("");

  const truncateAddress = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  const switchChain = async () => {
    setSwitchingChain(true);
    try {
      // Try switching to the first supported chain (Sepolia by default, Anvil for local dev)
      const targetChain = SUPPORTED_CHAIN_IDS.includes("0xaa36a7") ? "0xaa36a7" : SUPPORTED_CHAIN_IDS[0];
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChain }]
      });
      setWrongChain(false);
      await connectWallet();
    } catch (err) {
      console.log("Failed to switch chain:", err.message);
    }
    setSwitchingChain(false);
  };

  const connectWallet = async () => {
    setConnectedWalletLoading(true);
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new Web3(window.ethereum);
        let chainID = await window.ethereum.request({
          method: "eth_chainId"
        });
        if (!isSupportedChain(chainID)) {
          setWrongChain(true);
          setChainLabel("");
          console.log(
            `Unsupported chain (${chainID}). Please switch to Sepolia.`
          );
        } else {
          setWrongChain(false);
          setChainLabel(getChainName(chainID));
          const accounts = await provider.eth.getAccounts();
          setConnectedAddress(accounts[0]);
          props.setProvider(provider);
          props.setAccounts(accounts);
          props.setConnectedWallet(accounts[0]);
          if (props.setChainId) props.setChainId(chainID);
          console.log("Wallet connected:", accounts[0], "on", getChainName(chainID));
        }
      } else {
        console.log("Wallet not connected, no window.ethereum");
      }
    } catch (err) {
      console.log(err.message);
    }
    setConnectedWalletLoading(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {connectedAddress ? (
        <span className="play-wallet-address">
          {truncateAddress(connectedAddress)}
          {chainLabel && <span className="play-wallet-chain"> ({chainLabel})</span>}
        </span>
      ) : null}
      {wrongChain ? (
        <button
          className="wallet-btn wallet-btn--wrong"
          onClick={switchChain}
          disabled={switchingChain}
        >
          {switchingChain ? "Switching..." : "Switch to Sepolia"}
        </button>
      ) : connectedAddress ? (
        <button className="wallet-btn wallet-btn--connected" disabled>
          Connected
        </button>
      ) : (
        <button
          className="wallet-btn wallet-btn--connect"
          onClick={connectWallet}
          disabled={connectWalletLoading}
        >
          {connectWalletLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {props.children}
    </div>
  );
};

export default ConnectWallet;
