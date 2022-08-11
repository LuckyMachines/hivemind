import React from "react";
import { Button, Card } from "semantic-ui-react";

const Winners = (props) => {
  let content =
    props.show == false ? (
      ""
    ) : (
      <div style={{ marginTop: "-30px" }}>
        <h2>You finished #{props.rank}!</h2>
        {props.children}
      </div>
    );
  return content;
};

export default Winners;
