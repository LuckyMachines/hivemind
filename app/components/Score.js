import React from "react";
import { Input } from "semantic-ui-react";

const Score = (props) => {
  let content =
    props.show == false ? (
      ""
    ) : (
      <div style={{ width: "60%", marginBottom: "-10px" }}>
        <p>
          <strong>Score: </strong>
          {props.score}
          <br />
          <strong>Round 1 Guess: {"["}</strong>
          {props.guess1}
          <strong>{"] | "}Response Scores:</strong> <strong>{"[0] - "}</strong>
          {props.responseScores1[0]}
          <strong>{", [1] - "}</strong>
          {props.responseScores1[1]}
          <strong>{", [2] - "}</strong>
          {props.responseScores1[2]}
          <strong>{", [3] - "}</strong>
          {props.responseScores1[3]}
          <strong>{" | "}Winning Index:</strong>
          {props.winningIndex1}
          <br />
          <strong>Round 2 Guess: {"["}</strong>
          {props.guess2}
          <strong>{"] | "}Response Scores:</strong> <strong>{"[0] - "}</strong>
          {props.responseScores2[0]}
          <strong>{", [1] - "}</strong>
          {props.responseScores2[1]}
          <strong>{", [2] - "}</strong>
          {props.responseScores2[2]}
          <strong>{", [3] - "}</strong>
          {props.responseScores2[3]}
          <strong>{" | "}Winning Index:</strong>
          {props.winningIndex2}
          <br />
          <strong>Round 3 Guess: {"["}</strong>
          {props.guess3}
          <strong>{"] | "}Response Scores:</strong> <strong>{"[0] - "}</strong>
          {props.responseScores3[0]}
          <strong>{", [1] - "}</strong>
          {props.responseScores3[1]}
          <strong>{", [2] - "}</strong>
          {props.responseScores3[2]}
          <strong>{", [3] - "}</strong>
          {props.responseScores3[3]}
          <strong>{" | "}Winning Index:</strong>
          {props.winningIndex3}
          <br />
          <strong>Round 4 Guess: {"["}</strong>
          {props.guess4}
          <strong>{"] | "}Response Scores:</strong> <strong>{"[0] - "}</strong>
          {props.responseScores4[0]}
          <strong>{", [1] - "}</strong>
          {props.responseScores4[1]}
          <strong>{", [2] - "}</strong>
          {props.responseScores4[2]}
          <strong>{", [3] - "}</strong>
          {props.responseScores4[3]}
          <strong>{" | "}Winning Index:</strong>
          {props.winningIndex4}
          <br />
        </p>
        {props.children}
      </div>
    );
  return content;
};

export default Score;
