import React from "react";

const Score = (props) => {
  const r1 = Number(props.responseScores[0]);
  const r2 = Number(props.responseScores[1]);
  const r3 = Number(props.responseScores[2]);
  const r4 = Number(props.responseScores[3]);
  const totalResponses = r1 + r2 + r3 + r4;
  const responsePercentages = [
    totalResponses > 0 ? (r1 / totalResponses) * 100 : 0,
    totalResponses > 0 ? (r2 / totalResponses) * 100 : 0,
    totalResponses > 0 ? (r3 / totalResponses) * 100 : 0,
    totalResponses > 0 ? (r4 / totalResponses) * 100 : 0
  ];

  if (!props.show) return null;

  const activeResponses = props.responses.filter((r) => r !== "");

  return (
    <div className="glass-card score-section play-fade-in">
      <div className="score-section__header">
        <div>
          <div className="score-section__points-label">Score</div>
          <div className="score-section__points">{props.score}</div>
        </div>
        <div
          className={`mode-badge mode-badge--small ${
            props.isMinority ? "mode-badge--minority" : "mode-badge--majority"
          }`}
        >
          {props.isMinority ? "MINORITY" : "MAJORITY"}
        </div>
      </div>

      <div className="score-section__question">{props.question}</div>
      <div className="score-section__answer">
        &ldquo;{props.responses[Number(props.guess)]}&rdquo;
      </div>

      {activeResponses.map((response, idx) => {
        const pct = Math.round(responsePercentages[idx]);
        const isWinner =
          props.winningIndex && props.winningIndex.includes(String(idx));
        return (
          <div className="score-bar" key={idx}>
            <div className="score-bar__label">
              <span>{response}</span>
              <span>{pct}%</span>
            </div>
            <div className="score-bar__track">
              <div
                className={`score-bar__fill ${
                  isWinner
                    ? props.isMinority
                      ? "score-bar__fill--minority"
                      : "score-bar__fill--winner"
                    : ""
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {props.children}
    </div>
  );
};

export default Score;
