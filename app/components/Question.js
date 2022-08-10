import React, { useState } from "react";
import { Button, Card } from "semantic-ui-react";

const Question = (props) => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [gameID, setGameID] = useState("Loading...");
  const [buttonText, setButtonText] = useState("Submit Answers");
  const [playerChoice, setPlayerChoice] = useState("");
  const [crowdChoice, setCrowdChoice] = useState("");
  const web3 = props.provider;
  const gameController = props.gameController;
  const accounts = props.accounts;
  const unselectedColor = "grey";
  const selectedColor = "green";

  const submit = async () => {
    setSubmitLoading(true);
    if (web3 && gameController && accounts) {
      try {
        if (buttonText == "Submit Answers") {
          const currentGameID = await gameController.methods
            .getCurrentGame(accounts[0])
            .call();
          console.log("Current game ID:", currentGameID);
          setGameID(currentGameID);
          setButtonText("Waiting for all players to answer");
          // TODO: submit answers
        } else if (buttonText == "Reveal Answers") {
          // TODO: submit revealed answers (must be same as answers)
          setButtonText("Waiting for all players to reveal");
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

  const crowdResponseContent = (p) => {
    return p.responses[2] == "" ? (
      <>
        <div>
          <Button
            color={
              crowdChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[0])}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              crowdChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[1])}
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
              crowdChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[0])}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              crowdChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[1])}
          >
            {p.responses[1]}
          </Button>
        </div>
        <div>
          <Button
            color={
              crowdChoice == p.responses[2] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[2])}
          >
            {p.responses[2]}
          </Button>
          <Button
            color={
              crowdChoice == p.responses[3] ? selectedColor : unselectedColor
            }
            onClick={() => setCrowdChoice(p.responses[3])}
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
              playerChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[0])}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              playerChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[1])}
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
              playerChoice == p.responses[0] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[0])}
          >
            {p.responses[0]}
          </Button>
          <Button
            color={
              playerChoice == p.responses[1] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[1])}
          >
            {p.responses[1]}
          </Button>
        </div>
        <div>
          <Button
            color={
              playerChoice == p.responses[2] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[2])}
          >
            {p.responses[2]}
          </Button>
          <Button
            color={
              playerChoice == p.responses[3] ? selectedColor : unselectedColor
            }
            onClick={() => setPlayerChoice(p.responses[3])}
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
        <Button color="black" size="massive" onClick={submit}>
          {buttonText}
        </Button>
        {props.children}
      </div>
    );
  return content;
};

export default Question;
