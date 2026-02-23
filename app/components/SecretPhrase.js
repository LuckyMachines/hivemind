import React from "react";

const SecretPhrase = (props) => {
  if (!props.show) return null;

  return (
    <div className="secret-phrase">
      <label className="secret-phrase__label">Secret Phrase</label>
      <input
        className="secret-phrase__input"
        type="text"
        placeholder="Enter a secret phrase..."
        value={props.phrase}
        onChange={(event) => props.setPhrase(event.target.value)}
      />
      {props.children}
    </div>
  );
};

export default SecretPhrase;
