import React from "react";
import { Progress } from "semantic-ui-react";

const Score = (props) => {
  const r1 = Number(props.responseScores[0]);
  const r2 = Number(props.responseScores[1]);
  const r3 = Number(props.responseScores[2]);
  const r4 = Number(props.responseScores[3]);
  const totalResponses = r1 + r2 + r3 + r4;
  const responsePercentages = [
    (r1 / totalResponses) * 100,
    (r2 / totalResponses) * 100,
    (r3 / totalResponses) * 100,
    (r4 / totalResponses) * 100
  ];
  // console.log(
  //   `Values: ${props.responseScores[0]},${props.responseScores[1]},${props.responseScores[2]},${props.responseScores[3]}`
  // );
  // console.log("Percentages:", responsePercentages);

  let responseView = (p) => {
    return p.responses[2] == "" ? (
      <>
        <Progress
          progress
          percent={responsePercentages[0]}
          label={props.responses[0]}
        />
        <Progress
          progress
          percent={responsePercentages[1]}
          label={props.responses[1]}
          style={{ marginBottom: "50px" }}
        />
      </>
    ) : (
      <>
        <Progress
          progress
          percent={responsePercentages[0]}
          label={props.responses[0]}
        />
        <Progress
          progress
          percent={responsePercentages[1]}
          label={props.responses[1]}
        />
        <Progress
          progress
          percent={responsePercentages[2]}
          label={props.responses[2]}
        />
        <Progress
          progress
          percent={responsePercentages[3]}
          label={props.responses[3]}
          style={{ marginBottom: "50px" }}
        />
      </>
    );
  };

  let content =
    props.show == false ? (
      ""
    ) : (
      <div style={{ width: "60%", marginBottom: "-10px" }}>
        <div className={`mode-badge mode-badge--small ${props.isMinority ? "mode-badge--minority" : "mode-badge--majority"}`}>
          {props.isMinority ? "MINORITY ROUND" : "MAJORITY ROUND"}
        </div>
        <span>
          <strong>Score: </strong>
          {props.score}
        </span>
        <h3>
          <strong>{props.question}</strong>
          <br />
          <strong>&ldquo;{props.responses[Number(props.guess)]}&rdquo;</strong>
        </h3>

        {responseView(props)}
        {props.children}
      </div>
    );
  return content;
};

export default Score;
