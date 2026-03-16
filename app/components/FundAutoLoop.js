import React, { useState, useEffect, useCallback } from "react";
import { getAutoLoopConfig } from "../lib/chains";
import { useToast } from "./Toast";

const REGISTRAR_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "registeredContract", type: "address" }],
    outputs: [],
  },
];

const PRESET_AMOUNTS = ["0.01", "0.05", "0.1"];

const FundAutoLoop = ({ provider, accounts, chainId }) => {
  const { addToast } = useToast();
  const [balance, setBalance] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [amount, setAmount] = useState("0.01");
  const [chainName, setChainName] = useState("");

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      const cid = chainId || "0xaa36a7";
      const res = await fetch(`/api/autoloop/balance?chainId=${cid}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setIsRegistered(data.isRegistered);
        setChainName(data.chainName);
      }
    } catch (err) {
      console.error("Failed to fetch AutoLoop balance:", err.message);
    }
    setLoading(false);
  }, [chainId]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const fundKeeper = async () => {
    if (!provider || !accounts || !accounts[0]) {
      addToast("Please connect your wallet first.", { type: "warning", title: "Wallet Required" });
      return;
    }

    const cid = chainId || "0xaa36a7";
    const al = getAutoLoopConfig(cid);
    if (!al || !al.keeper || !al.registrar) {
      addToast("AutoLoop not configured for this network.", { type: "error", title: "Config Error" });
      return;
    }

    setFunding(true);
    try {
      const amountWei = provider.utils.toWei(amount, "ether");

      const registrar = new provider.eth.Contract(REGISTRAR_ABI, al.registrar);
      const tx = await registrar.methods.deposit(al.keeper).send({
        from: accounts[0],
        value: amountWei,
        gas: 100000,
      });

      addToast(`Funded ${amount} ETH to AutoLoop keeper!`, {
        type: "success",
        title: "AutoLoop Funded",
      });
      console.log("AutoLoop fund tx:", tx.transactionHash);

      // Refresh balance after a short delay for the RPC to index
      setTimeout(fetchBalance, 3000);
    } catch (err) {
      console.error("AutoLoop funding error:", err.message);
      if (err.message.includes("User denied")) {
        addToast("Transaction cancelled.", { type: "warning", title: "Cancelled" });
      } else {
        addToast(err.message, { type: "error", title: "Funding Failed" });
      }
    }
    setFunding(false);
  };

  const balanceNum = balance ? parseFloat(balance) : 0;
  const isLow = balanceNum < 0.05;

  return (
    <div className="autoloop-fund">
      <div className="autoloop-fund__header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4v4l2.5 2.5" strokeLinecap="round" />
        </svg>
        <span>AutoLoop Keeper</span>
        {chainName && <span className="autoloop-fund__chain">{chainName}</span>}
      </div>

      <div className="autoloop-fund__balance">
        <span className="autoloop-fund__label">Balance</span>
        <span className={`autoloop-fund__value ${isLow ? "autoloop-fund__value--low" : ""}`}>
          {loading ? "..." : balance !== null ? `${parseFloat(balance).toFixed(4)} ETH` : "—"}
        </span>
        {isLow && balance !== null && (
          <span className="autoloop-fund__warning">Low balance — game automation may pause</span>
        )}
      </div>

      {isRegistered && (
        <div className="autoloop-fund__actions">
          <div className="autoloop-fund__presets">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                className={`autoloop-fund__preset ${amount === a ? "autoloop-fund__preset--active" : ""}`}
                onClick={() => setAmount(a)}
                disabled={funding}
              >
                {a} ETH
              </button>
            ))}
          </div>
          <button
            className="autoloop-fund__btn"
            onClick={fundKeeper}
            disabled={funding || !provider || !accounts}
          >
            {funding ? "Sending..." : `Fund ${amount} ETH`}
          </button>
        </div>
      )}
    </div>
  );
};

export default FundAutoLoop;
