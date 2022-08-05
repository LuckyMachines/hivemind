import React from "react";
import { Input } from "semantic-ui-react";

const SecretPhrase = (props) => {
  let content =
    props.show == false ? (
      ""
    ) : (
      <div style={{ width: "60%" }}>
        <Input fluid placeholder="Enter a secret phrase..." />
        {props.children}
      </div>
    );
  return content;
};

export default SecretPhrase;
