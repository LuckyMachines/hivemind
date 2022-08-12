import React from "react";
import { Button, Card } from "semantic-ui-react";

const Winners = (props) => {
  const doAction = async () => {
    if (props.rank > 4) {
      props.joinNewGame();
    } else {
      props.claimPrize();
    }
  };
  let content =
    props.show == false ? (
      ""
    ) : (
      <div style={{ marginTop: "-30px" }}>
        <h2>You finished #{props.rank}!</h2>
        <Button size={"huge"} color={"green"} onClick={doAction}>
          {Number(props.rank) < 5 ? "Claim Prize!" : "Join New Game"}
        </Button>
        {props.children}
      </div>
    );
  return content;
};

export default Winners;
