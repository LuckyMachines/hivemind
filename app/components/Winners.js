import React from "react";
import { Button, Card } from "semantic-ui-react";

const Winners = (props) => {
  let content = props.show == false ? "" : <div>{props.children}</div>;
  return content;
};

export default Winners;
