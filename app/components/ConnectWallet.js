import React, { useState } from "react";
import { Button } from "semantic-ui-react";
import Web3 from "web3";

const ConnectWallet = (props) => {
  // const REQUIRED_CHAIN_ID = "0x1"; // mainnet
  // const REQUIRED_CHAIN_ID = "0xaa36a7"; // sepolia
  const REQUIRED_CHAIN_ID = "0x7a69"; // anvil local
  const [connectWalletLoading, setConnectedWalletLoading] = useState(false);
  const [wrongChain, setWrongChain] = useState(false);
  const [switchingChain, setSwitchingChain] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState("");

  const truncateAddress = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  const switchChain = async () => {
    setSwitchingChain(true);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: REQUIRED_CHAIN_ID }]
      });
      setWrongChain(false);
      // Retry connection after switching
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
        if (chainID != REQUIRED_CHAIN_ID) {
          setWrongChain(true);
          console.log(
            `Wrong chain (${chainID}). Please connect to ${REQUIRED_CHAIN_ID}`
          );
        } else {
          setWrongChain(false);
          const accounts = await provider.eth.getAccounts();
          setConnectedAddress(accounts[0]);
          props.setProvider(provider);
          props.setAccounts(accounts);
          props.setConnectedWallet(accounts[0]);
          console.log("Wallet connected:", accounts[0]);
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
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {connectedAddress ? (
        <span style={{ fontFamily: "monospace", fontSize: "0.9em" }}>
          {truncateAddress(connectedAddress)}
        </span>
      ) : null}
      {wrongChain ? (
        <Button color="red" onClick={switchChain} loading={switchingChain}>
          Wrong Chain — Switch
        </Button>
      ) : connectedAddress ? (
        <Button color="green" disabled>
          Connected
        </Button>
      ) : (
        <Button onClick={connectWallet} loading={connectWalletLoading}>
          Connect
        </Button>
      )}
      {props.children}
    </div>
  );
};

export default ConnectWallet;
