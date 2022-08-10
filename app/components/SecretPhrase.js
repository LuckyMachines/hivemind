import React from "react";
import { Input } from "semantic-ui-react";

const SecretPhrase = (props) => {
  let content =
    props.show == false ? (
      ""
    ) : (
      <div style={{ width: "60%" }}>
        <Input
          fluid
          placeholder="Enter a secret phrase..."
          value={props.phrase}
          onChange={(event) => props.setPhrase(event.target.value)}
        />
        {props.children}
      </div>
    );
  return content;
};

export default SecretPhrase;

/*
label="How Many?"
                    placeholder="# of Keys to Purchase"
                    value={this.state.purchaseQty}
                    onChange={(event) =>
                      this.setState({ purchaseQty: event.target.value })
                    }
*/
