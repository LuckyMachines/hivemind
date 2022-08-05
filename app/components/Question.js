import React from "react";
import { Button, Card } from "semantic-ui-react";

const Question = (props) => {
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
        <Button color="black" size="massive">
          Submit Answers
        </Button>
        {props.children}
      </div>
    );
  return content;
};

export default Question;
