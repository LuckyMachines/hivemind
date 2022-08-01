import React, { useState } from "react";
import { Button } from "semantic-ui-react";
import Web3 from "web3";

const ConnectWallet = (props) => {
  let provider;
  let accounts;
  const [connectWalletLoading, setConnectedWalletLoading] = useState(false);
  const connectWallet = async () => {
    setConnectedWalletLoading(true);
    try {
      if (window.ethereum) {
        ethereum.request({ method: "eth_requestAccounts" });
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new Web3(window.ethereum);
        accounts = await provider.eth.getAccounts();
        props.setProvider(provider);
        props.setAccounts(accounts);
        props.setConnectedWallet(accounts[0]);
        console.log("Wallet connected:", accounts[0]);
      } else {
        console.log("Wallet not connected, no window.ethereum");
      }
    } catch (err) {
      console.log(err.message);
    }
    setConnectedWalletLoading(false);
  };

  return (
    <div>
      <Button onClick={connectWallet} loading={connectWalletLoading}>
        Connect
      </Button>
      {props.children}
    </div>
  );
};

export default ConnectWallet;
