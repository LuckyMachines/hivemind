import React, { useState } from "react";
import "semantic-ui-css/semantic.min.css";
import { Button, Card } from "semantic-ui-react";

const Question = (props) => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const web3 = props.provider;
  const unselectedColor = "grey";
  const selectedColor = "blue";

  const submit = async () => {
    setSubmitLoading(true);
    if (web3) {
      try {
        if (props.buttonText == "Submit Answers") {
          await props.submitChoices(props.playerChoice, props.crowdChoice);
        } else if (props.buttonText == "Reveal Answers") {
          await props.revealChoices(props.playerChoice, props.crowdChoice);
        } else {
          console.log("This button does nothing, but have fun clicking away!");
        }
      } catch (err) {
        console.log(err.message);
      }
    } else {
      window.alert("Please connect your web3 wallet");
    }
    setSubmitLoading(false);
  };

  const setPlayerChoice = (choice) => {
    props.setPlayerChoice(choice);
  };

  const setCrowdChoice = (choice) => {
    props.setCrowdChoice(choice);
  };

  const crowdResponseContent = (p) => {
    return p.responses[2] == "" ? (
      <>
        <div>
          <Button
            color={
              p.crowdChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[0])}
            disabled={p.inputLocked}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              p.crowdChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[1])}
            disabled={p.inputLocked}
          >
            {p.responses[1]}
          </Button>
        </div>
      </>
    ) : (
      <>
        <div>
          <Button
            color={
              p.crowdChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[0])}
            disabled={p.inputLocked}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              p.crowdChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[1])}
            disabled={p.inputLocked}
          >
            {p.responses[1]}
          </Button>
        </div>
        <div style={{ marginTop: "5px" }}>
          <Button
            color={
              p.crowdChoice == p.responses[2] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[2])}
            disabled={p.inputLocked}
          >
            {p.responses[2]}
          </Button>
          <Button
            color={
              p.crowdChoice == p.responses[3] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[3])}
            disabled={p.inputLocked}
          >
            {p.responses[3]}
          </Button>
        </div>
      </>
    );
  };

  const userResponseContent = (p) => {
    return p.responses[2] == "" ? (
      <>
        <div>
          <Button
            color={
              p.playerChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[0])}
            disabled={p.inputLocked}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              p.playerChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[1])}
            disabled={p.inputLocked}
          >
            {p.responses[1]}
          </Button>
        </div>
      </>
    ) : (
      <>
        <div>
          <Button
            color={
              p.playerChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[0])}
            disabled={p.inputLocked}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              p.playerChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[1])}
            disabled={p.inputLocked}
          >
            {p.responses[1]}
          </Button>
        </div>
        <div style={{ marginTop: "5px" }}>
          <Button
            color={
              p.playerChoice == p.responses[2] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[2])}
            disabled={p.inputLocked}
          >
            {p.responses[2]}
          </Button>
          <Button
            color={
              p.playerChoice == p.responses[3] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[3])}
            disabled={p.inputLocked}
          >
            {p.responses[3]}
          </Button>
        </div>
      </>
    );
  };

  let content =
    props.show == false ? (
      ""
    ) : (
      <div>
        <Card.Group>
          <Card>
            <Card.Content>
              <Card.Header>{props.question}</Card.Header>
            </Card.Content>
            <Card.Content extra>{userResponseContent(props)}</Card.Content>
          </Card>
          <Card>
            <Card.Content>
              <Card.Header>What will the crowd choose?</Card.Header>
              <Card.Meta>{props.question}</Card.Meta>
            </Card.Content>
            <Card.Content extra>{crowdResponseContent(props)}</Card.Content>
          </Card>
        </Card.Group>
        <br />
        <Button
          loading={submitLoading}
          color="black"
          size="massive"
          onClick={() => submit()}
        >
          {props.buttonText}
        </Button>
        {props.children}
      </div>
    );
  return content;
};

export default Question;
