import React, { useState } from "react";
import { Button, Card } from "semantic-ui-react";

const Question = (props) => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [gameID, setGameID] = useState("Loading...");
  const [buttonText, setButtonText] = useState("Submit Answers");
  const web3 = props.provider;
  const gameController = props.gameController;
  const accounts = props.accounts;

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

  let content =
    props.show == false ? (
      ""
    ) : (
      <div>
        <Card.Group>
          <Card>
            <Card.Content>
              <Card.Header>
                What is the best thing to eat for breakfast?
              </Card.Header>
            </Card.Content>
            <Card.Content extra>
              <div className="ui two buttons">
                <Button basic color="black">
                  Cereal and Toast
                </Button>
                <Button basic color="black">
                  Bacon and Eggs
                </Button>
              </div>
              <div className="ui two buttons">
                <Button basic color="black">
                  Pancakes or Waffles
                </Button>
                <Button basic color="black">
                  Nothing
                </Button>
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content>
              <Card.Header>What will the crowd choose?</Card.Header>
              <Card.Meta>
                What is the best thing to eat for breakfast?
              </Card.Meta>
            </Card.Content>
            <Card.Content extra>
              <div className="ui two buttons">
                <Button basic color="black">
                  Cereal and Toast
                </Button>
                <Button basic color="black">
                  Bacon and Eggs
                </Button>
              </div>
              <div className="ui two buttons">
                <Button basic color="black">
                  Pancakes or Waffles
                </Button>
                <Button basic color="black">
                  Nothing
                </Button>
              </div>
            </Card.Content>
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
