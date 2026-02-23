import React from "react";

const Winners = (props) => {
  const doAction = async () => {
    if (props.rank > 4) {
      props.joinNewGame();
    } else {
      props.claimPrize();
    }
  };

  const getRankClass = (rank) => {
    const r = Number(rank);
    if (r === 1) return "winners-card__rank--gold";
    if (r === 2) return "winners-card__rank--silver";
    if (r === 3) return "winners-card__rank--bronze";
    return "winners-card__rank--default";
  };

  if (!props.show) return null;

  const canClaim = Number(props.rank) < 5;

  return (
    <div className="glass-card winners-card play-fade-in">
      <div className={`winners-card__rank ${getRankClass(props.rank)}`}>
        #{props.rank}
      </div>
      <div className="winners-card__label">
        {canClaim ? "Congratulations! You placed in the top 4." : "Better luck next time!"}
      </div>
      <button
        className={`winners-action-btn ${
          canClaim ? "winners-action-btn--claim" : "winners-action-btn--rejoin"
        }`}
        onClick={doAction}
      >
        {canClaim ? "Claim Prize" : "Join New Game"}
      </button>
      {props.children}
    </div>
  );
};

export default Winners;
