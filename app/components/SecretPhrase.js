import React from "react";
import { Input } from "semantic-ui-react";

const SecretPhrase = (props) => {
  return (
    <div style={{ width: "60%" }}>
      <Input fluid placeholder="Enter a secret phrase..." />
      {props.children}
    </div>
  );
};

export default SecretPhrase;
