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
        </p>
        {props.children}
      </div>
    );
  return content;
};

export default Score;
