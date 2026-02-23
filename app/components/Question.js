import React, { useState } from "react";

const Question = (props) => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const web3 = props.provider;

  const submit = async () => {
    setSubmitLoading(true);
    if (web3) {
      console.log("Player choice:", props.playerChoice);
      console.log("Crowd choice:", props.crowdChoice);
      console.log("Secret Phase choice:", props.secretPhrase);
      try {
        if (props.buttonText == "Submit Answers") {
          const encodedChoices = web3.eth.abi.encodeParameters(
            ["string", "string", "string"],
            [props.playerChoice, props.crowdChoice, props.secretPhrase]
          );
          console.log("Encoded:", encodedChoices);
          const hashedChoices = web3.utils.sha3(encodedChoices, {
            encoding: "hex"
          });
          console.log("Hashed:", hashedChoices);
          await props.submitChoices(hashedChoices);
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

  const renderChoices = (selectedChoice, onSelect) => {
    const activeResponses = props.responses.filter((r) => r !== "");
    return (
      <div className="question-card__choices">
        {activeResponses.map((response, idx) => (
          <button
            key={idx}
            className={`choice-btn ${selectedChoice === response ? "choice-btn--selected" : ""}`}
            onClick={() => onSelect(response)}
            disabled={props.inputLocked}
          >
            {response}
          </button>
        ))}
      </div>
    );
  };

  const isWaiting =
    props.buttonText !== "Submit Answers" &&
    props.buttonText !== "Reveal Answers";
  const isReveal = props.buttonText === "Reveal Answers";

  if (!props.show) return null;

  return (
    <div className="play-fade-in">
      <div
        className={`mode-badge ${
          props.isMinority ? "mode-badge--minority" : "mode-badge--majority"
        }`}
      >
        {props.isMinority
          ? "MINORITY ROUND — Pick the least popular answer"
          : "MAJORITY ROUND — Pick the most popular answer"}
      </div>

      <div className="question-cards">
        <div className="question-card">
          <div className="question-card__label">Your Answer</div>
          <div className="question-card__title">{props.question}</div>
          {renderChoices(props.playerChoice, setPlayerChoice)}
        </div>

        <div className="question-card">
          <div className="question-card__label">Crowd Prediction</div>
          <div className="question-card__title">What will the crowd choose?</div>
          <div className="question-card__subtitle">{props.question}</div>
          {renderChoices(props.crowdChoice, setCrowdChoice)}
        </div>
      </div>

      <button
        className={`play-submit-btn ${
          isWaiting
            ? "play-submit-btn--waiting"
            : isReveal
            ? "play-submit-btn--reveal"
            : ""
        }`}
        onClick={submit}
        disabled={submitLoading || isWaiting}
      >
        {submitLoading ? "Processing..." : props.buttonText}
      </button>
      {props.children}
    </div>
  );
};

export default Question;
